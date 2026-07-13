"""
Stage 1 — Prompt Detailing + Script Generation Agent.

Uses the LIGHTER Gemini model (gemini-2.0-flash).

Takes a raw user prompt and produces a structured educational brief:
- Enriched detailed description
- Key concepts list
- Full narration script with visual cues
- Duration estimation
- Scene-by-scene breakdown
"""

import json
import re

import structlog

from app.agents.base import gemini_light

logger = structlog.get_logger(__name__)

SYSTEM_INSTRUCTION = """You are an expert educational content designer and Manim animation director.

Your job is to take a raw user prompt about a mathematical, scientific, or educational topic and transform it into a detailed, structured animation brief that can be used to generate beautiful Manim animations.

You MUST return valid JSON with this exact schema:
{
  "title": "Short, catchy video title (max 80 chars)",
  "description": "2-3 sentence overview of what the animation will cover",
  "key_concepts": [
    {"term": "Concept name", "definition": "Clear, concise definition (max 150 chars)"},
    ...
  ],
  "duration_seconds": <integer — MUST be very close to the TARGET DURATION given by the user; only deviate by ±15% at most if content absolutely requires it>,
  "narration_script": "Full narration text with [VISUAL: description] cues embedded at every scene transition. Be specific about what should appear visually.",
  "scenes": [
    {
      "title": "Scene name",
      "duration": <seconds as integer>,
      "description": "What happens visually in this scene",
      "visual_elements": ["List of manim objects / animations to use"]
    }
  ],
  "style_notes": "Color palette, mood, and animation style recommendations",
  "math_objects": ["List of mathematical objects/equations that need to be rendered"]
}

IMPORTANT RULES:
- Be specific and concrete in visual descriptions — the code generator depends on this
- Include time cues for pacing
- Keep narration natural and educational
- math_objects should list LaTeX equations exactly as they should appear
- Total duration of all scenes must equal duration_seconds
"""


async def run_prompt_agent(
    prompt: str,
    style: str = "modern",
    requested_duration: int = 60,
) -> tuple[dict, dict]:
    """
    Stage 1: Transform raw user prompt into a structured animation brief.

    Args:
        prompt: Raw user-provided topic or question
        style: Visual style (modern | minimal | colorful | dark | classic)
        requested_duration: User's preferred video length in seconds

    Returns:
        (script_dict, usage_dict)
    """
    logger.info("Prompt agent starting", prompt_preview=prompt[:80], style=style)

    user_message = f"""Transform this educational topic into a detailed Manim animation brief:

TOPIC: {prompt}
VISUAL STYLE: {style}
TARGET DURATION: EXACTLY {requested_duration} seconds — you MUST produce duration_seconds={requested_duration} unless the topic absolutely cannot fit (maximum ±15% deviation allowed). Do NOT default to 60s.

Create a comprehensive, visually rich brief that will result in a stunning animated explanation.
Focus on making abstract concepts concrete through visual demonstrations.

Return ONLY valid JSON — no markdown, no explanation outside the JSON."""

    raw, usage = await gemini_light(
        prompt=user_message,
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.45,
        json_mode=True,
    )

    # Parse JSON response
    script = _parse_script_response(raw, prompt, requested_duration)

    logger.info(
        "Prompt agent complete",
        title=script.get("title"),
        duration=script.get("duration_seconds"),
        scenes=len(script.get("scenes", [])),
        tokens=usage.get("total_tokens"),
    )

    return script, usage


def _parse_script_response(raw: str, fallback_prompt: str, fallback_duration: int) -> dict:
    """Parse and validate the LLM JSON response, with safe fallbacks."""
    # Strip any accidental markdown fences
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*\n?", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\n?```\s*$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("Script JSON parse failed — using fallback", error=str(exc))
        # Return a sensible fallback so the pipeline continues
        return {
            "title": fallback_prompt[:80],
            "description": f"An educational animation about: {fallback_prompt}",
            "key_concepts": [],
            "duration_seconds": fallback_duration,
            "narration_script": f"Today we will explore: {fallback_prompt}",
            "scenes": [
                {
                    "title": "Introduction",
                    "duration": fallback_duration,
                    "description": f"Visual explanation of {fallback_prompt}",
                    "visual_elements": ["Text", "MathTex", "Axes"],
                }
            ],
            "style_notes": "modern dark theme",
            "math_objects": [],
        }

    # Ensure required fields exist
    data.setdefault("title", fallback_prompt[:80])
    data.setdefault("description", "")
    data.setdefault("key_concepts", [])
    data.setdefault("scenes", [])
    data.setdefault("math_objects", [])
    data.setdefault("style_notes", "")

    # Clamp duration
    dur = int(data.get("duration_seconds", fallback_duration))
    data["duration_seconds"] = max(30, min(300, dur))

    return data
