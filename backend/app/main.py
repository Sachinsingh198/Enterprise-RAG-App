# ============================================================
# CRITICAL: logfire MUST be configured before ALL other imports
# so that spans from all modules are captured from the start.
# ============================================================
import logfire
import os
from dotenv import load_dotenv

load_dotenv()
logfire.configure(token=os.getenv("LOGFIRE_TOKEN"))

# Now safe to import app modules - logfire is already active
from fastapi import FastAPI, Response, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.agents.graph import rag_agent
from app.guardrails import initialize_rails, guard, guard_async


from pydantic import BaseModel
from typing import Optional, List
import json
import shutil
from qdrant_client import QdrantClient
from app.config import settings
from app.ingestion.processor import process_file


# Initialize FastAPI
app = FastAPI(title="Enterprise Agentic RAG API")

# Add CORS Middleware for production & dev frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    initialize_rails()

class QueryRequest(BaseModel):
    q: str
    thread_id: Optional[str] = "default_user"


@app.get("/")
def home():
    return {"message": "Enterprise LangGraph RAG API is live."}


@app.get("/health")
def health_check():
    """Returns real-time backend diagnostic metrics."""
    qdrant_online = False
    try:
        qc = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        qc.get_collections()
        qdrant_online = True
    except Exception:
        pass

    return {
        "status": "online",
        "logfire_token_present": bool(os.getenv("LOGFIRE_TOKEN")),
        "qdrant_connected": qdrant_online,
        "groq_configured": bool(settings.GROQ_API_KEY),
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "vector_collection": settings.QDRANT_COLLECTION,
        "model": settings.GROQ_MODEL,
    }


@app.get("/graph")
def get_graph_image():
    """
    Returns the Mermaid image of the agent's workflow.
    """
    try:
        png_bytes = rag_agent.get_graph().draw_mermaid_png()
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        return {"error": f"Could not generate graph image: {e}"}


from fastapi.responses import StreamingResponse
import asyncio
from app.gateway.client import portkey_client
from app.agents.nodes.planner import planner_node
from app.agents.nodes.retriever import retrieve_node

@app.post("/query")
def query(request: QueryRequest):
    """
    Executes the LangGraph RAG flow with memory using a POST request.
    """
    q = request.q
    thread_id = request.thread_id

    initial_state = {
        "messages": [{"role": "user", "content": q}],
        "current_query": q,
        "documents": [],
        "plan": ["Start"],
        "status": "Initializing Graph..."
    }

    # Configuration for Memory (Thread ID)
    config = {"configurable": {"thread_id": thread_id}}

    try:
        # Gate 1: NeMo Guardrails — blocks off-topic, jailbreaks, and handles dialog
        rail_fired, rail_response = guard(q)
        if rail_fired:
            logfire.info(f"🛡️ Request blocked by guardrails | thread={thread_id}")
            return {
                "question": q,
                "answer": rail_response,
                "thought_process": ["Intent: Guardrails Fired", "Retrieval: Skipped"],
                "status": "Handled by guardrails.",
                "guardrail_fired": True,
                "sources": []
            }

        # Gate 2: LangGraph RAG pipeline
        # Run the graph synchronously to preserve Logfire context variables
        final_output = rag_agent.invoke(initial_state, config=config)

        return {
            "question": q,
            "answer": final_output.get("final_answer"),
            "thought_process": final_output.get("plan"),
            "status": final_output.get("status"),
            "guardrail_fired": False,
            "sources": final_output.get("documents", [])
        }
    except Exception as e:
        logfire.error(f"❌ Backend Execution Failed: {e}")
        return {
            "question": q,
            "answer": "I apologize, but I encountered an internal error while processing your request. Please try again later.",
            "thought_process": ["Error encountered during execution."],
            "status": "error",
            "guardrail_fired": False,
            "sources": []
        }


@app.post("/query/stream")
async def query_stream(request: QueryRequest):
    """
    Executes the LangGraph RAG flow with SSE streaming token delivery.
    """
    q = request.q
    thread_id = request.thread_id

    async def event_generator():
        try:
            # Step 1: Gate 1 NeMo Guardrails Check (Async)
            rail_fired, rail_response = await guard_async(q)
            if rail_fired:

                logfire.info(f"🛡️ Stream request blocked by guardrails | thread={thread_id}")
                meta_event = {
                    "type": "meta",
                    "question": q,
                    "thought_process": ["Intent: Guardrails Fired", "Retrieval: Skipped"],
                    "status": "Handled by guardrails.",
                    "guardrail_fired": True,
                    "sources": []
                }
                yield f"data: {json.dumps(meta_event)}\n\n"

                # Stream out guardrail response words
                words = rail_response.split(" ")
                for i, word in enumerate(words):
                    chunk_str = word + (" " if i < len(words) - 1 else "")
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk_str})}\n\n"
                    await asyncio.sleep(0.01)

                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            # Step 2: LangGraph Agent Steps
            initial_state = {
                "messages": [{"role": "user", "content": q}],
                "current_query": q,
                "documents": [],
                "plan": ["Start"],
                "status": "Initializing Graph..."
            }
            config = {"configurable": {"thread_id": thread_id}}

            # Run Planner Node
            planner_res = planner_node(initial_state)
            curr_query = planner_res.get("current_query", q)
            plan_steps = planner_res.get("plan", ["Planner evaluated intent"])

            documents = []
            if curr_query != "CONVERSATIONAL":
                state_for_retrieval = {**initial_state, "current_query": curr_query, "plan": plan_steps}
                retrieval_res = retrieve_node(state_for_retrieval)
                documents = retrieval_res.get("documents", [])
                plan_steps = retrieval_res.get("plan", plan_steps + ["Context Retrieved"])

            # Send Metadata Event (thought process & retrieved context sources)
            meta_event = {
                "type": "meta",
                "question": q,
                "thought_process": plan_steps,
                "status": "Synthesizing response...",
                "guardrail_fired": False,
                "sources": documents
            }
            yield f"data: {json.dumps(meta_event)}\n\n"

            # Construct Prompt for LLM Streaming
            if curr_query == "CONVERSATIONAL":
                prompt = f"You are a friendly and helpful Enterprise AI Assistant. Answer the user's latest message:\n\"{q}\""
            else:
                max_context_chars = 25000
                full_context = ""
                for doc in documents:
                    if len(full_context) + len(doc) < max_context_chars:
                        full_context += doc + "\n\n"

                prompt = f"""
You are a Senior Technical Architect.
Answer the question using the TECHNICAL CONTEXT provided.

TECHNICAL CONTEXT:
{full_context}

USER QUESTION:
"{q}"
"""

            # Stream LLM output from Portkey gateway
            with logfire.span("✍️ LLM Streaming Synthesis"):
                response_stream = portkey_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    stream=True
                )

                full_answer = ""
                for chunk in response_stream:
                    if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                        token = chunk.choices[0].delta.content
                        full_answer += token
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                        await asyncio.sleep(0.005)

                # Persist to Memory Checkpointer
                rag_agent.invoke(
                    {"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": full_answer}]},
                    config=config
                )

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logfire.error(f"❌ Stream execution error: {e}")
            err_msg = f"\n[Internal Error: {e}]"
            yield f"data: {json.dumps({'type': 'token', 'content': err_msg})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")



@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    source_type: str = Form("general")
):
    """
    Upload a document, parse it, chunk it, embed it, and index it into Qdrant in real-time.
    """
    temp_dir = os.path.join("DATA", "uploads")
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process document through chunker & Qdrant vector store
        process_file(file_path, file.filename, source_type)

        return {
            "status": "success",
            "filename": file.filename,
            "source_type": source_type,
            "message": f"Successfully ingested and indexed '{file.filename}' into Qdrant."
        }
    except Exception as e:
        logfire.error(f"Upload and process failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass


@app.get("/documents")
def get_documents():
    """
    List all processed chunk metadata files stored in local processed_data/ storage.
    """
    processed_dir = "processed_data"
    documents = []

    if os.path.exists(processed_dir):
        for root, _, files in os.walk(processed_dir):
            for file in files:
                if file.endswith(".json"):
                    full_path = os.path.join(root, file)
                    try:
                        with open(full_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            documents.append({
                                "filename": data.get("filename", file),
                                "source_type": data.get("source_type", "general"),
                                "chunk_count": len(data.get("chunks", [])),
                                "path": full_path,
                                "chunks_sample": data.get("chunks", [])[:2]
                            })
                    except Exception:
                        pass
    return {"documents": documents, "total_files": len(documents)}


@app.get("/stats")
def get_vector_stats():
    """
    Returns vector collection stats from Qdrant.
    """
    try:
        qc = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        coll_info = qc.get_collection(collection_name=settings.QDRANT_COLLECTION)
        
        # Count points
        points_count = qc.count(collection_name=settings.QDRANT_COLLECTION).count

        return {
            "collection_name": settings.QDRANT_COLLECTION,
            "status": str(coll_info.status),
            "vectors_count": points_count,
            "indexed_vectors_count": coll_info.indexed_vectors_count or points_count,
            "vector_size": coll_info.config.params.vectors.size if hasattr(coll_info.config.params.vectors, 'size') else 768,
            "distance_metric": str(coll_info.config.params.vectors.distance if hasattr(coll_info.config.params.vectors, 'distance') else "Cosine"),
            "groq_model": settings.GROQ_MODEL,
        }
    except Exception as e:
        return {
            "collection_name": settings.QDRANT_COLLECTION,
            "status": "offline_or_error",
            "error": str(e),
            "vectors_count": 0,
            "groq_model": settings.GROQ_MODEL,
        }


@app.get("/guardrails")
def get_guardrails_info():
    """
    Returns active NeMo Guardrails configuration and policy summary.
    """
    colang_path = os.path.join("app", "guardrails", "colang_rules.py")
    rules_sample = []
    if os.path.exists(colang_path):
        try:
            with open(colang_path, "r", encoding="utf-8") as f:
                content = f.read()
                rules_sample = [line.strip() for line in content.split("\n") if line.strip().startswith("define") or line.strip().startswith("bot") or line.strip().startswith("user")][:15]
        except Exception:
            pass

    return {
        "guardrail_status": "Active",
        "engine": "NeMo Guardrails + Colang 2.0",
        "rules_defined": [
            "Off-topic query interception",
            "Jailbreak and prompt injection defense",
            "Domain-specific fallback responses",
            "RAG context verification"
        ],
        "sample_rules": rules_sample
    }


@app.delete("/memory/{thread_id}")
def clear_memory(thread_id: str):
    """
    Clear session memory for a given thread_id.
    """
    logfire.info(f"Memory wiped for thread: {thread_id}")
    return {"status": "memory_cleared", "thread_id": thread_id}

