# LiteLLM Proxy setup

The application calls LiteLLM Proxy at `LITELLM_PROXY_URL`; it does not call
Groq or Portkey directly. LiteLLM owns the Groq credentials, retries, and
primary-to-fallback route.

## 1. Configure secrets

Copy `.env.example` to `.env` if you do not already have one. Keep your
existing Qdrant, Gemini, and Logfire values. Remove the obsolete
`PORTKEY_API_KEY` and `PORTKEY_GATEWAY_CONFIG` entries, then add:

```dotenv
GROQ_API_KEY=your-primary-groq-key
GROQ_FALLBACK_API_KEY=your-second-groq-key
LITELLM_MASTER_KEY=sk-a-long-random-local-secret
LITELLM_PROXY_URL=http://127.0.0.1:4000/v1
LITELLM_RAG_MODEL=rag-primary
LITELLM_GUARDRAIL_MODEL=guardrails
```

`LITELLM_MASTER_KEY` is a local proxy credential, not a Groq key. Generate a
new high-entropy value and do not reuse a provider key.

## 2. Start the proxy

Docker is the simplest option. From the repository root, run:

```powershell
docker compose -f docker-compose.litellm.yml up -d
docker compose -f docker-compose.litellm.yml logs -f litellm
```

Wait until the logs state that the proxy is listening on port `4000`. Stop log
following with `Ctrl+C`; the proxy keeps running in the background.

Alternatively, install dependencies in the project virtual environment and run
the proxy directly:

```powershell
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\litellm --config .\litellm_config.yaml
```

## 3. Verify the gateway before starting the chatbot

In a new PowerShell terminal:

```powershell
$env:LITELLM_MASTER_KEY = (Get-Content .env | Where-Object { $_ -match '^LITELLM_MASTER_KEY=' }).Split('=', 2)[1]
$headers = @{ Authorization = "Bearer $env:LITELLM_MASTER_KEY" }
Invoke-RestMethod -Uri http://127.0.0.1:4000/v1/models -Headers $headers
```

The response must list `rag-primary`, `rag-fallback`, and `guardrails`. If it
does not, fix the proxy logs before launching the API.

## 4. Start the chatbot services

Use separate terminals:

```powershell
.\.venv\Scripts\uvicorn app.main:app --reload
```

```powershell
.\.venv\Scripts\streamlit run ui\app.py
```

## Routing behaviour

`litellm_config.yaml` routes `rag-primary` to Groq using `GROQ_API_KEY`. It
retries twice and then tries `rag-fallback` using
`GROQ_FALLBACK_API_KEY`. NeMo Guardrails uses the `guardrails` alias and has
the same fallback. Change the underlying `model:` fields in that file—not the
Python application—when you need a different provider/model.

## Smoke tests

1. Ask the UI `hello`; a dialog rail should answer directly.
2. Ask a jailbreak or off-topic prompt; it should return without retrieval.
3. Ask a Kubernetes question covered by your ingested documents; planner,
   retrieval, and synthesis should run through LiteLLM.

For a failure, inspect the proxy logs first. They contain the upstream HTTP
status without requiring the FastAPI application to log provider secrets.
