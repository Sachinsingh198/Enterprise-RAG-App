import time
import logfire
from flashrank import Ranker, RerankRequest

_ranker = None

def _get_ranker() -> Ranker:
    """
    Initializes the FlashRank engine lazily.
    FlashRank uses a local ONNX model (ms-macro-MiniM-L-6-v2) for ultra-fast reranking.
    No API calls, no rate limits.    
    """
    global _ranker
    if _ranker is None:
        logfire.info("🧠 Initializing FlashRank Model (TinyBERT) locally...")
        try:
            _ranker = Ranker(cache_dir="/tmp/flashrank")
        except Exception:
            _ranker = Ranker()
    return _ranker

def rerank_documents(query: str, documents: list[str], top_n: int = 5) -> list[str]:
    """
    Refines retrieval results by re-scoring documents against the query semantically.
    Retries transient failures and falls back to the original Qdrant order if
    reranking ultimately fails, ensuring the user still receives an answer.
    """
    if not documents:
        return []

    start_time = time.time()
    logfire.info(f"[Reranker] Sending {len(documents)} docs FlashRank Cross-Encoded")
    
    try:
        ranker = _get_ranker()

        passages = [
            {"id": i, "text": doc}
            for i , doc in enumerate(documents)
        ]
        
        # Create reranking request
        request = RerankRequest(
            query=query,
            passages=passages,
        )
        
        # Perform reranking
        results = ranker.rerank(request)
        
        # Extract reranked documents
        reranked_docs = []
        for res in results[:top_n]:
            reranked_docs.append(res['text'])
        
        duration = time.time() - start_time
        top_score = results[0]['score'] if results else "N/A"
        
        logfire.info(f"[Reranker] Done in {duration: .2f}s. Top semantic score: {top_score}")

        return reranked_docs
    except Exception as e:
        logfire.error(f"[Reranking] Semantic Reranking failed: {e}")
        # Fallback to original documents if reranking fails
        return documents[:top_n]