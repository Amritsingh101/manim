"""
Stage 2 — Manim Code Generation Agent.

Uses the HEAVIER Gemini model (gemini-2.5-pro).

Takes the structured script from Stage 1 and generates complete,
runnable Manim Community Edition Python code.
"""

import structlog

from app.agents.base import gemini_heavy, strip_code_fences

logger = structlog.get_logger(__name__)

SYSTEM_INSTRUCTION = """You are a world-class Manim Community Edition (manim-ce v0.19) developer.
You write beautiful, mathematically correct, fully runnable animation code.

DESIGN PRINCIPLES:
- Use elegant color palettes (cyan, magenta, teal, gold, deep purple — NOT harsh primary colors)
- Build visual, geometric representations — NOT just text slides
- Use Axes/FunctionGraph/Dot/Arrow to demonstrate mathematical ideas dynamically
- Use ValueTracker + always_redraw for live-updating labels and curves
- Group related elements with VGroup; position with .next_to() / .arrange() — avoid hardcoded coords
- Use Transform/ReplacementTransform to morph equations and shapes smoothly
- Keep screen alive: shift old elements to corners, don't clear everything constantly

ANIMATION QUALITY RULES:
- Use Write() for equations appearing for the first time
- Use FadeIn/FadeOut for scene transitions
- Use Create() for geometric shapes
- Add self.wait(0.5) between animations for breathing room
- Use .animate.shift() and .animate.scale() for smooth movement
- Color key terms with .set_color_by_tex() or indexed slicing

CRITICAL TECHNICAL RULES (violations = runtime crash):
1. Exactly ONE class: `class MainScene(Scene):` OR `class MainScene(MovingCameraScene):`
2. ALL code in MainScene.construct() — no helper Scene subclasses
3. Use MovingCameraScene ONLY if you need camera.frame zoom/pan
4. NEVER use: camera.animate, FRAME_WIDTH, FRAME_HEIGHT, FRAME_X_RADIUS, FRAME_Y_RADIUS
5. NEVER use: self.add_foreground_mobject(), ShowCreation(), add_sound(), .set_zoom()
6. NEVER use: ThreeDScene, Scene1(), scene1.construct()
7. NEVER use opacity=, fill_opacity=, stroke_opacity=, label= in constructors — use .set_opacity() etc.
8. Use `Create()` not `ShowCreation()` (deprecated)
9. If MovingCameraScene: use self.camera.frame.scale() not .set_zoom()
10. Use config.frame_width / config.frame_height (not FRAME_WIDTH / FRAME_HEIGHT)
11. self.camera.frame only exists in MovingCameraScene — NOT in plain Scene

OUTPUT: Return ONLY raw Python code — NO markdown fences, NO explanation, NO comments outside code."""


STYLE_MAP = {
    "modern":   "background_color='#0f0f1a', use PURPLE=#a855f7 TEAL=#14b8a6 GOLD=#f59e0b accents",
    "minimal":  "background_color=WHITE, BLACK text, thin strokes, almost no color except highlights",
    "colorful": "background_color='#1a1a2e', use full rainbow palette, vibrant RED BLUE GREEN YELLOW PURPLE",
    "dark":     "background_color=BLACK, use NEON GREEN=#39ff14 NEON BLUE=#00d4ff neon accents",
    "classic":  "background_color=BLUE_E (3b1b style), WHITE text, MathTex heavy, gentle animations",
}


async def run_manim_agent(
    prompt: str,
    script: dict,
    style: str = "modern",
    duration_seconds: int = 60,
    previous_attempt_error: str | None = None,
) -> tuple[str, dict]:
    """
    Stage 2: Generate complete Manim code from a structured script.

    Args:
        prompt: Original user prompt
        script: Output from Stage 1 (prompt agent)
        style: Visual style string
        duration_seconds: Target animation duration
        previous_attempt_error: If this is a retry, include the previous error to avoid it

    Returns:
        (python_code_string, usage_dict)
    """
    logger.info(
        "Manim agent starting",
        duration=duration_seconds,
        style=style,
        is_retry=previous_attempt_error is not None,
    )

    style_desc = STYLE_MAP.get(style, STYLE_MAP["modern"])

    # Build scene breakdown
    scenes_text = ""
    for i, scene in enumerate(script.get("scenes", []), 1):
        scenes_text += (
            f"\n  Scene {i}: {scene.get('title')} ({scene.get('duration', '?')}s)\n"
            f"    → {scene.get('description', '')}\n"
            f"    → Elements: {', '.join(scene.get('visual_elements', []))}\n"
        )

    # Key concepts
    concepts_text = "\n".join(
        f"  - {c['term']}: {c['definition'][:150]}"
        for c in script.get("key_concepts", [])[:6]
    )

    # Math objects
    math_objects = script.get("math_objects", [])
    math_text = "\n  ".join(math_objects[:10]) if math_objects else "(derive from topic)"

    retry_warning = ""
    if previous_attempt_error:
        retry_warning = f"""
⚠️  PREVIOUS ATTEMPT FAILED — Fix these issues in your code:
{previous_attempt_error[:800]}

Avoid ALL of the above patterns in this new attempt.
"""

    user_message = f"""Generate complete, production-quality Manim CE v0.19 Python code for:

TOPIC: {prompt}
TITLE: {script.get('title', prompt[:60])}
STYLE: {style} — {style_desc}
DURATION: exactly {duration_seconds} seconds total

EDUCATIONAL BRIEF:
{script.get('description', '')}

KEY CONCEPTS:
{concepts_text}

SCENE BREAKDOWN:
{scenes_text}

NARRATION (follow this flow, implement [VISUAL:] cues):
{(script.get('narration_script', '') or '')[:1500]}

MATH/EQUATIONS TO RENDER:
  {math_text}

STYLE NOTES: {script.get('style_notes', '')}

TIMING RULES:
- Total of all self.play() durations + self.wait() values must sum to ~{duration_seconds}s
- self.play() ≈ 1-3s each; self.wait(N) adds N seconds exactly
- Distribute time across scenes proportionally

VISUAL QUALITY:
- Build coordinate axes for any function/graph topic
- Animate equations appearing with Write(), morph with Transform()
- Show dynamic labels with ValueTracker + always_redraw
- Never just show static text — always add movement, color, scale

{retry_warning}
Write the complete Python file starting with `from manim import *`:"""

    code, usage = await gemini_heavy(
        prompt=user_message,
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.2,
    )

    code = strip_code_fences(code)

    logger.info(
        "Manim agent complete",
        code_lines=len(code.splitlines()),
        tokens=usage.get("total_tokens"),
    )

    return code, usage
