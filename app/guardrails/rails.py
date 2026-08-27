import logfire
from langchain_groq import ChatGroq
from nemoguardrails import RailsConfig, LLMRails

from app.config import settings
from app.guardrails.colang_rules import COLANG_CONTENT, YAML_CONTENT, RAIL_INDICATORS


_rails: LLMRails | None = None


def initialize_rails() -> None:
    """
    Build the NeMo LLMRails singleton at app startup.
    Uses llama-3.1-8b-instant for fast intent classification at the gate —
    the heavier llama-3.3-70b-versatile is reserved for the RAG pipeline.
    """
    global _rails

    guard_llm = ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.GROQ_MODEL,
        temperature=0,
        reasoning_effort="low"
    )

    config = RailsConfig.from_content(
        colang_content=COLANG_CONTENT,
        yaml_content=YAML_CONTENT
    )

    _rails = LLMRails(config, llm=guard_llm)
    logfire.info("🛡️ NeMo Guardrails initialised (llama-3.1-8b-instant).")
    
    


def guard(message: str) -> tuple[bool, str | None]:
    if _rails is None:
        logfire.warning("⚠️ Guardrails not initialised — skipping gate.")
        return False, None

    with logfire.span("🛡️ Guardrails Check"):
        logfire.info(f"🛡️ INPUT TO GUARDRAILS: {message}")

        result = _rails.generate(
            messages=[
                {
                    "role": "user",
                    "content": message
                }
            ]
        )

        content = (
            result.get("content", "")
            if isinstance(result, dict)
            else str(result)
        ).strip()

        logfire.info(f"🛡️ RAW GUARDRAILS RESULT: {result}")

        fired = "__GUARDRAIL_BLOCKED__:" in content

        logfire.info(
            f"🛡️ GUARDRAIL STATUS | fired={fired} | content={content}"
        )

        if fired:
            logfire.info(
                f"🚫 Guardrail fired | query='{message[:80]}'"
            )

            if "JAILBREAK" in content:
                return (
                    True,
                    "I’m sorry, but I can’t comply with attempts to override my instructions."
                )

            if "OFF_TOPIC" in content:
                return (
                    True,
                    "I’m an Enterprise IT Assistant focused on Kubernetes, Intel hardware, and enterprise networking. Please ask me something related to those topics."
                )

            return True, "I’m sorry, but I can’t help with that."

        return False, None