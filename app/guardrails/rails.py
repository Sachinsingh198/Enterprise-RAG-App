import logfire
import re
from langchain_groq import ChatGroq
from nemoguardrails import LLMRails, RailsConfig

from app.config import settings
from app.guardrails.colang_rules import BLOCK_PREFIX, COLANG_CONTENT, YAML_CONTENT


_rails: LLMRails | None = None


# Fast, deterministic rules for high-confidence attacks. NeMo still runs after
# this layer for semantic variants, but these rules ensure obvious attacks do
# not depend on an LLM's intent-classification accuracy or availability.
_LOCAL_BLOCKS: tuple[tuple[str, re.Pattern[str], str], ...] = (
    (
        "jailbreak",
        re.compile(
            r"\b(ignore|disregard|forget|override|bypass)\b.{0,100}"
            r"\b(previous|system|safety|instruction|guideline|prompt|filter)s?\b",
            re.IGNORECASE | re.DOTALL,
        ),
        "I cannot follow requests to override my instructions.",
    ),
    (
        "jailbreak",
        re.compile(r"\b(you are now dan|developer mode|unrestricted ai)\b", re.IGNORECASE),
        "I cannot follow requests to override my instructions.",
    ),
    (
        "off_topic",
        re.compile(
            r"^\s*(tell me a joke|what is the capital of france|write me a poem|"
            r"what is 2 plus 2|recommend a movie|what is the weather today)\s*[?.!]*\s*$",
            re.IGNORECASE,
        ),
        "I can only help with Kubernetes, Intel hardware, and enterprise networking.",
    ),
)

# These are terminal conversational responses rather than safety refusals.
# They use the same return path so planner/retrieval are skipped.
_LOCAL_CONVERSATION_RESPONSES: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(
            r"^\s*(?:hello|hi|hey)[,!.\s]+"
            r"(?:who are you|what are you|what can you do(?: for me)?|what do you know|"
            r"what topics do you cover|what can i ask you|what are your capabilities)\s*[?.!]*\s*$",
            re.IGNORECASE,
        ),
        "I'm your Enterprise IT Assistant. I specialise in Kubernetes, Intel hardware, and enterprise networking.",
    ),
    (
        re.compile(r"^\s*(hello|hi|hey|good morning|good afternoon|what's up|howdy)\s*[!.?]*\s*$", re.IGNORECASE),
        "Hello! I'm your Enterprise IT Assistant. I specialise in Kubernetes, Intel hardware, and enterprise networking. What can I help you with today?",
    ),
    (
        re.compile(r"^\s*(what can you do(?: for me)?|what do you know|help|who are you|what are you|what topics do you cover|what can i ask you|what are your capabilities)\s*[?.!]*\s*$", re.IGNORECASE),
        "I'm your Enterprise IT Assistant. I specialise in Kubernetes, Intel hardware, and enterprise networking.",
    ),
    (
        re.compile(r"^\s*(bye|goodbye|see you|thanks bye|that is all|i am done|see you later)\s*[!.?]*\s*$", re.IGNORECASE),
        "Goodbye! Feel free to return whenever you have more enterprise IT questions.",
    ),
)

# Some instruction-following models refuse an unsafe or off-topic request in
# prose instead of returning the exact Colang intent name. Treat that refusal
# as the safety decision, regardless of whether it says help, comply, provide,
# respond, or assist.
_MODEL_REFUSAL = re.compile(
    r"(?:(?:\bi(?:\s+am|['’]m)?\s+sorry\b|\bi\s+apologize\b).{0,140}"
    r"\b(?:can(?:not|'t|’t)|unable to)\b.{0,80}\b(?:help|comply|provide|respond|assist)\b|"
    r"\b(?:outside|not within)\s+(?:the\s+)?(?:assistant(?:'s)?\s+)?scope\b)",
    re.IGNORECASE | re.DOTALL,
)
_OFF_TOPIC_RESPONSE = "I can only help with Kubernetes, Intel hardware, and enterprise networking."


def initialize_rails() -> None:
    """Build the NeMo Guardrails singleton at application startup."""
    global _rails

    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is required to initialise NeMo Guardrails.")

    # LLMRails receives this client directly. The model in YAML_CONTENT is only
    # required by NeMo's configuration schema and is ignored at runtime.
    guard_llm = ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.GUARDRAIL_MODEL,
        temperature=0,
    )
    config = RailsConfig.from_content(
        colang_content=COLANG_CONTENT,
        yaml_content=YAML_CONTENT,
    )
    _rails = LLMRails(config, llm=guard_llm)
    logfire.info(f"NeMo Guardrails initialised (model={settings.GUARDRAIL_MODEL}).")


def guard(message: str) -> tuple[bool, str | None]:
    """Run one user message through the NeMo safety gate.

    Returns ``(True, response)`` when a blocking flow fires, otherwise
    ``(False, None)``. Blocking flows emit ``BLOCK_PREFIX`` so safety decisions
    are never inferred from mutable natural-language prose.
    """
    for reason, pattern, response in _LOCAL_BLOCKS:
        if pattern.search(message):
            logfire.info(f"Guardrails fired locally ({reason}) | query='{message[:80]}'")
            return True, response

    for pattern, response in _LOCAL_CONVERSATION_RESPONSES:
        if pattern.search(message):
            logfire.info(f"Guardrails handled conversation | query='{message[:80]}'")
            return True, response

    if _rails is None:
        logfire.warning("Guardrails not initialised; blocking request (fail closed).")
        return True, "Safety checks are unavailable. Please try again shortly."

    with logfire.span("Guardrails Check"):
        try:
            result = _rails.generate(messages=[{"role": "user", "content": message}])
        except Exception:
            # A safety gate must not permit an unclassified request when the
            # model/provider is unavailable.
            logfire.exception("Guardrails check failed; blocking request (fail closed).")
            return True, "Safety checks are temporarily unavailable. Please try again shortly."

        content = result.get("content", "") if isinstance(result, dict) else str(result)
        if content.startswith(BLOCK_PREFIX):
            response = content.removeprefix(BLOCK_PREFIX).lstrip()
            logfire.info(f"Guardrails fired | query='{message[:80]}'")
            return True, response

        if _MODEL_REFUSAL.search(content):
            logfire.info(f"Guardrails fired from model refusal | query='{message[:80]}'")
            return True, _OFF_TOPIC_RESPONSE

        logfire.info("Guardrails passed.")
        return False, None
