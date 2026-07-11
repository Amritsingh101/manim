"""
Stage 4 Recovery — Error Fix Agent.

Uses the HEAVIER Gemini model (gemini-2.5-pro).

Called when Manim compilation fails (Stage 4).
Analyzes the stderr output, classifies the error type, and fixes the code.

Error classification determines retry strategy:
  SYNTAX_ERROR   → fix in review agent only (Stage 3 re-run)
  API_ERROR      → LLM-based fix here, then re-review (Stage 3)
  LOGIC_ERROR    → regenerate entirely (back to Stage 2)
  TIMEOUT_ERROR  → reduce complexity (back to Stage 2 with hint)
"""

import re
import structlog

from app.agents.base import gemini_heavy, strip_code_fences

logger = structlog.get_logger(__name__)

# ── Error type classification ──────────────────────────────────────────────────

ERROR_TYPE_SYNTAX = "syntax"       # Python SyntaxError — fix at review
ERROR_TYPE_API = "api"             # Wrong Manim API call — fix here + re-review
ERROR_TYPE_LOGIC = "logic"         # Logic/runtime error — regenerate
ERROR_TYPE_TIMEOUT = "timeout"     # Render timed out — regenerate with simpler code
ERROR_TYPE_UNKNOWN = "unknown"     # Unclassified — attempt LLM fix


def classify_error(stderr: str) -> str:
    """
    Classify a Manim compilation error from its stderr output.
    Returns one of the ERROR_TYPE_* constants.
    """
    stderr_lower = stderr.lower()

    if "syntaxerror" in stderr_lower or "invalid syntax" in stderr_lower:
        return ERROR_TYPE_SYNTAX

    if any(kw in stderr_lower for kw in [
        "attributeerror", "typeerror", "nameerror",
        "does not have", "got an unexpected keyword", "has no attribute",
        "cannot be", "is not defined",
    ]):
        return ERROR_TYPE_API

    if "timeout" in stderr_lower or "timed out" in stderr_lower:
        return ERROR_TYPE_TIMEOUT

    if any(kw in stderr_lower for kw in [
        "valueerror", "runtimeerror", "zerodivisionerror",
        "indexerror", "keyerror", "recursionerror",
        "assertion", "overflow",
    ]):
        return ERROR_TYPE_LOGIC

    return ERROR_TYPE_UNKNOWN


SYSTEM_INSTRUCTION = """You are an expert Manim CE v0.19 debugger.

You receive broken Manim Python code and the exact error from the Manim renderer.
Your job is to fix the code so it renders successfully.

Rules:
- Output ONLY corrected Python code — no markdown, no explanations
- Fix the root cause of the error, not just the symptom
- Preserve the educational content and visual intent of the original
- Keep exactly ONE class named MainScene(Scene) or MainScene(MovingCameraScene)
- Never add: camera.animate, FRAME_WIDTH, add_sound, ThreeDScene, opacity= in constructors"""


async def run_error_fix_agent(
    code: str,
    stderr: str,
    prompt: str = "",
) -> tuple[str, str, dict]:
    """
    Stage 4 Recovery: Fix code based on Manim compilation error.

    Args:
        code: The Manim Python code that failed to compile/render
        stderr: The error output from the Manim subprocess
        prompt: Original user prompt (for context)

    Returns:
        (fixed_code, error_type, usage_dict)
        The error_type tells the pipeline what re-run strategy to use.
    """
    error_type = classify_error(stderr)

    logger.info(
        "Error fix agent starting",
        error_type=error_type,
        stderr_preview=stderr[:200],
    )

    # Extract the most relevant part of stderr (last 2000 chars)
    relevant_error = _extract_relevant_error(stderr)

    user_message = f"""Fix this Manim CE v0.19 code. The renderer produced this error:

ERROR OUTPUT:
```
{relevant_error}
```

ORIGINAL TOPIC: {prompt}

FAILING CODE:
```python
{code}
```

Analyze the error carefully. Fix ALL issues that caused the error.
Return ONLY the corrected Python code:"""

    fixed_code, usage = await gemini_heavy(
        prompt=user_message,
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.15,  # Very deterministic for debugging
    )

    fixed_code = strip_code_fences(fixed_code)

    logger.info(
        "Error fix agent complete",
        error_type=error_type,
        tokens=usage.get("total_tokens"),
        code_lines=len(fixed_code.splitlines()),
    )

    return fixed_code, error_type, usage


def _extract_relevant_error(stderr: str) -> str:
    """
    Extract the most relevant lines from Manim stderr output.
    Prioritizes: Traceback, Error lines, last N chars.
    """
    lines = stderr.splitlines()

    # Try to find the traceback start
    traceback_start = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("Traceback"):
            traceback_start = i
            break

    if traceback_start >= 0:
        # Return from traceback to end
        relevant = "\n".join(lines[traceback_start:])
        return relevant[-2500:]  # Cap at 2500 chars

    # No traceback — return last 2000 chars
    return stderr[-2000:]
