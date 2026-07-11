"""
Stage 3 — Code Review + Common Mistake Check Agent.

Uses the LIGHTER Gemini model (gemini-2.0-flash).

Performs:
1. Deterministic static checks (no LLM, instant)
   - Syntax check via ast.parse()
   - Known bad Manim API patterns
   - Constant replacement (FRAME_WIDTH → config.frame_width, etc.)
   - Unsupported constructor kwargs removal
   - Ensure class is named MainScene

2. LLM review (only when static checks find issues)
   - Fix syntax/API errors
   - Verify logic correctness

The LLM review is BYPASSED if static analysis passes — saves tokens.
"""

import ast
import re
import structlog

from app.agents.base import gemini_light, strip_code_fences

logger = structlog.get_logger(__name__)

# ── Known bad patterns (pattern_text, human_readable_message) ─────────────────
BAD_PATTERNS: list[tuple[str, str]] = [
    ("ThreeDScene",              "Use Scene or MovingCameraScene — ThreeDScene not available"),
    ("camera.animate",           "camera.animate does not exist; use self.camera.frame.animate instead"),
    ("add_foreground_mobject",   "add_foreground_mobject() removed in v0.19; delete the call"),
    ("ShowCreation",             "ShowCreation deprecated; replace with Create()"),
    (".set_zoom(",               "set_zoom() removed; use self.camera.frame.scale() instead"),
    ("scene1.construct()",       "Never call another Scene's construct() from inside a Scene"),
    ("scene2.construct()",       "Never call another Scene's construct() from inside a Scene"),
    ("add_sound(",               "add_sound() not available — no audio files at render time"),
    ("self.add_sound",           "add_sound() not available — no audio files at render time"),
    ("FRAME_WIDTH",              "FRAME_WIDTH undefined in v0.19; use config.frame_width"),
    ("FRAME_HEIGHT",             "FRAME_HEIGHT undefined in v0.19; use config.frame_height"),
    ("FRAME_X_RADIUS",           "FRAME_X_RADIUS undefined; use config.frame_width / 2"),
    ("FRAME_Y_RADIUS",           "FRAME_Y_RADIUS undefined; use config.frame_height / 2"),
]

# ── Deterministic constant replacements (no LLM needed) ───────────────────────
CONSTANT_REPLACEMENTS: list[tuple[str, str]] = [
    ("FRAME_WIDTH",    "config.frame_width"),
    ("FRAME_HEIGHT",   "config.frame_height"),
    ("FRAME_X_RADIUS", "config.frame_width / 2"),
    ("FRAME_Y_RADIUS", "config.frame_height / 2"),
    ("ShowCreation",   "Create"),
]

# ── Unsupported constructor kwargs in manim CE v0.19 ──────────────────────────
_UNSUPPORTED_KWARGS = ["label", "opacity", "fill_opacity", "stroke_opacity"]
_KWARG_PATTERN = re.compile(
    r"\b(?:" + "|".join(_UNSUPPORTED_KWARGS) + r")\s*=\s*"
    r"(?:(?:['\"][^'\"]*['\"])|(?:[A-Za-z0-9_.#\-]+))\s*,?\s*"
)

SYSTEM_INSTRUCTION = """You are an expert Manim CE v0.19 code reviewer and bug fixer.

Fix ALL issues in the provided Manim code. Output ONLY corrected Python — no markdown, no explanations.

Key rules to enforce:
1. Exactly one class: MainScene(Scene) or MainScene(MovingCameraScene)
2. All code in construct() — no other Scene subclasses
3. No: camera.animate, add_foreground_mobject, ShowCreation, add_sound, ThreeDScene
4. No: FRAME_WIDTH/HEIGHT (use config.frame_width/height)
5. No: opacity= fill_opacity= stroke_opacity= label= in constructors — chain .set_xxx() instead
6. Valid LaTeX/MathTex syntax
7. If code was correct, return it unchanged."""


def _check_syntax(code: str) -> tuple[bool, str]:
    """Fast syntax check using Python's ast.parse()."""
    try:
        ast.parse(code)
        return True, ""
    except SyntaxError as e:
        return False, f"SyntaxError at line {e.lineno}: {e.msg} — {e.text}"


def _is_truncated_output(code: str, syntax_error: str) -> bool:
    """Detect if LLM hit token limit and output was cut off mid-statement."""
    lines = code.strip().splitlines()
    if not lines:
        return False
    last_line_idx = len(lines)
    match = re.search(r"line (\d+)", syntax_error)
    if not match:
        return False
    error_line = int(match.group(1))
    return error_line >= last_line_idx - 3


def _auto_fix_constants(code: str) -> tuple[str, list[str]]:
    """Replace deprecated constants and remove unsupported kwargs."""
    fixes = []
    for old, new in CONSTANT_REPLACEMENTS:
        if old in code:
            code = code.replace(old, new)
            fixes.append(f"Replaced `{old}` → `{new}`")

    # Strip unsupported constructor kwargs
    new_code = _KWARG_PATTERN.sub("", code)
    if new_code != code:
        fixes.append("Removed unsupported Mobject constructor kwargs (use .set_xxx() instead)")
        code = new_code

    return code, fixes


def _ensure_main_scene(code: str) -> tuple[str, list[str]]:
    """Ensure the renderable class is called MainScene (manim render scene.py MainScene)."""
    fixes = []
    pattern = re.compile(
        r"^class\s+(\w+)\s*\(\s*(Scene|MovingCameraScene)\s*\)\s*:",
        re.MULTILINE,
    )
    matches = pattern.findall(code)
    if not matches:
        return code, fixes

    class_names = [m[0] for m in matches]
    if "MainScene" in class_names:
        return code, fixes

    old_name = class_names[0]
    code = re.sub(rf"\b{re.escape(old_name)}\b", "MainScene", code)
    fixes.append(f"Renamed class `{old_name}` → `MainScene`")
    return code, fixes


def _find_bad_patterns(code: str) -> list[str]:
    """Return list of bad-pattern violation messages found in code."""
    return [msg for pattern, msg in BAD_PATTERNS if pattern in code]


async def run_review_agent(
    code: str,
    prompt: str = "",
    attempt: int = 1,
    max_attempts: int = 3,
) -> tuple[str, list[str], dict]:
    """
    Stage 3: Review and fix Manim code.

    Returns:
        (fixed_code, issues_list, usage_dict)
        If truncated output is detected, returns original code + error info
        so the pipeline can decide to re-run Stage 2 instead.
    """
    logger.info("Review agent starting", attempt=attempt, lines=len(code.splitlines()))

    issues: list[str] = []
    total_usage: dict = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "model": ""}

    # ── Step 1: Deterministic fixes (instant, no LLM) ─────────────────────────
    code, const_fixes = _auto_fix_constants(code)
    issues.extend(const_fixes)

    code, scene_fixes = _ensure_main_scene(code)
    issues.extend(scene_fixes)

    # ── Step 2: Syntax check ──────────────────────────────────────────────────
    syntax_ok, syntax_error = _check_syntax(code)
    if not syntax_ok:
        issues.append(f"SyntaxError: {syntax_error}")
        logger.warning("Syntax error in generated code", error=syntax_error)

        # Fast-fail on truncated output (LLM hit token limit)
        if _is_truncated_output(code, syntax_error):
            trunc_msg = (
                "Code was truncated (LLM hit token limit). "
                "Pipeline will regenerate from Stage 2."
            )
            issues.append(trunc_msg)
            logger.error("Truncated output detected", syntax_error=syntax_error)
            return code, issues, total_usage

    # ── Step 3: Bad API pattern check ─────────────────────────────────────────
    bad_patterns = _find_bad_patterns(code)
    issues.extend(bad_patterns)

    # ── Fast path: skip LLM if everything looks good ──────────────────────────
    if syntax_ok and not bad_patterns:
        logger.info(
            "Static analysis passed — LLM review skipped",
            deterministic_fixes=len(issues),
        )
        return code, issues, total_usage

    # ── Step 4: LLM review (lighter model) ────────────────────────────────────
    issues_text = "\n".join(f"  - {i}" for i in issues) if issues else "  - None from static analysis"

    user_message = f"""Review and fix this Manim CE v0.19 code. Fix ALL issues listed below.

ORIGINAL TOPIC: {prompt}

```python
{code}
```

Issues detected by static analysis:
{issues_text}

Return ONLY corrected Python code — no markdown fences, no explanation:"""

    fixed_code, usage = await gemini_light(
        prompt=user_message,
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.1,  # Very deterministic for bug fixing
    )

    for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
        total_usage[key] = total_usage.get(key, 0) + usage.get(key, 0)
    total_usage["model"] = usage.get("model", "")

    fixed_code = strip_code_fences(fixed_code)

    # ── Step 5: Verify fix compiles ───────────────────────────────────────────
    fixed_ok, fixed_error = _check_syntax(fixed_code)
    if not fixed_ok:
        issues.append(f"Post-fix syntax error: {fixed_error}")
        logger.error("Fixed code still has syntax error", error=fixed_error)
        if attempt < max_attempts:
            logger.info("Retrying review", next_attempt=attempt + 1)
            return await run_review_agent(code, prompt, attempt + 1, max_attempts)
        # Return original if fix made things worse
        return code, issues, total_usage

    logger.info("Review agent complete", issues_fixed=len(issues), tokens=total_usage.get("total_tokens"))
    return fixed_code, issues, total_usage
