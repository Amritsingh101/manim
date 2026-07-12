"""
Gemini LLM base client — wraps google-genai SDK.

Two public functions:
  gemini_light()  → calls LIGHT_LLM_MODEL (gemini-2.0-flash)
                    used for: script gen, code review, simple tasks
  gemini_heavy()  → calls HEAVY_LLM_MODEL (gemini-2.5-pro)
                    used for: code generation, error fixing, complex tasks

Both return (content: str, usage: dict) where usage has:
  prompt_tokens, completion_tokens, total_tokens, model
"""

import asyncio
import re

import structlog
from google import genai
from google.genai import types

from app.core.config import settings

logger = structlog.get_logger(__name__)


_client = None
_client_loop_id: int | None = None


def _get_client() -> genai.Client:
    """
    Get the Gemini client, recreating it if the event loop has changed.

    genai.Client holds an httpx async transport that is bound to the event
    loop that was running when the client was first created.  The pipeline
    runs each stage via asyncio.run(), which creates a new loop each time.
    If we return the old client on a new loop, the first API call raises
    "Event loop is closed", wasting one retry.  Tracking the loop id and
    recreating on mismatch fixes this with zero overhead on normal paths.
    """
    global _client, _client_loop_id

    if not settings.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. "
            "Get your API key at: https://aistudio.google.com/apikey"
        )

    try:
        current_loop_id = id(asyncio.get_running_loop())
    except RuntimeError:
        current_loop_id = None

    if _client is None or _client_loop_id != current_loop_id:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
        _client_loop_id = current_loop_id

    return _client


def _extract_usage(response) -> dict:
    """Pull token usage from the Gemini response metadata."""
    meta = getattr(response, "usage_metadata", None)
    if meta is None:
        return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    return {
        "prompt_tokens": getattr(meta, "prompt_token_count", 0) or 0,
        "completion_tokens": getattr(meta, "candidates_token_count", 0) or 0,
        "total_tokens": getattr(meta, "total_token_count", 0) or 0,
    }


async def _call_gemini(
    model: str,
    contents: str,
    system_instruction: str,
    temperature: float,
    max_output_tokens: int,
    json_mode: bool = False,
    attempt: int = 1,
    max_attempts: int = 3,
) -> tuple[str, dict]:
    """
    Core Gemini API call with retry logic.
    Returns (content_text, usage_dict).
    """
    client = _get_client()

    config_kwargs: dict = {
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
    }
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction
    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"

    generate_config = types.GenerateContentConfig(**config_kwargs)

    for current_attempt in range(1, max_attempts + 1):
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model,
                    contents=contents,
                    config=generate_config,
                ),
                timeout=float(settings.LLM_TIMEOUT_SECONDS),
            )

            content = response.text or ""
            usage = _extract_usage(response)
            usage["model"] = model

            logger.debug(
                "Gemini call complete",
                model=model,
                tokens=usage["total_tokens"],
                attempt=current_attempt,
            )
            return content, usage

        except asyncio.TimeoutError:
            logger.warning(
                "Gemini timeout",
                model=model,
                attempt=current_attempt,
                max_attempts=max_attempts,
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
            if current_attempt < max_attempts:
                await asyncio.sleep(2 * current_attempt)
                continue
            raise RuntimeError(
                f"Gemini API timed out after {settings.LLM_TIMEOUT_SECONDS}s "
                f"(model={model}, attempts={max_attempts})"
            )

        except Exception as exc:
            logger.warning(
                "Gemini API error",
                model=model,
                attempt=current_attempt,
                max_attempts=max_attempts,
                error=str(exc),
            )
            if current_attempt < max_attempts:
                await asyncio.sleep(3 * current_attempt)
                continue
            raise

    # Unreachable — satisfies type checker
    raise RuntimeError("Gemini call failed after all retries")


# ── Public API ─────────────────────────────────────────────────────────────────

async def gemini_light(
    prompt: str,
    system_instruction: str = "",
    temperature: float | None = None,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> tuple[str, dict]:
    """
    Call the lighter Gemini model (fast + cheap).
    Use for: script generation, code review, classification tasks.
    """
    return await _call_gemini(
        model=settings.LIGHT_LLM_MODEL,
        contents=prompt,
        system_instruction=system_instruction,
        temperature=temperature if temperature is not None else settings.LIGHT_LLM_TEMPERATURE,
        max_output_tokens=max_tokens if max_tokens is not None else settings.LIGHT_LLM_MAX_TOKENS,
        json_mode=json_mode,
    )


async def gemini_heavy(
    prompt: str,
    system_instruction: str = "",
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> tuple[str, dict]:
    """
    Call the heavier Gemini model (powerful + thorough).
    Use for: Manim code generation, compilation error fixing.
    """
    return await _call_gemini(
        model=settings.HEAVY_LLM_MODEL,
        contents=prompt,
        system_instruction=system_instruction,
        temperature=temperature if temperature is not None else settings.HEAVY_LLM_TEMPERATURE,
        max_output_tokens=max_tokens if max_tokens is not None else settings.HEAVY_LLM_MAX_TOKENS,
        json_mode=False,  # code agents return raw Python
    )


# ── Utility ────────────────────────────────────────────────────────────────────

def strip_code_fences(code: str) -> str:
    """Remove markdown code fences that the LLM may have wrapped output in."""
    code = code.strip()
    # Remove opening fence (```python or ```)
    code = re.sub(r"^```(?:python)?\s*\n?", "", code, flags=re.IGNORECASE)
    # Remove closing fence
    code = re.sub(r"\n?```\s*$", "", code)
    return code.strip()
