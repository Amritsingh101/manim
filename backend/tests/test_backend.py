"""
Unit tests for backend modules.
"""

import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.agents.review_agent import _auto_fix_constants, _ensure_main_scene, _find_bad_patterns, _check_syntax
from app.agents.error_fix_agent import classify_error


def test_password_hashing():
    pwd = "supersecretpassword123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_jwt_tokens():
    uid = "550e8400-e29b-41d4-a716-446655440000"
    token = create_access_token(uid)
    payload = decode_token(token)
    assert payload["sub"] == uid
    assert payload["type"] == "access"


def test_static_review_constants():
    bad_code = """
from manim import *
class MyScene(Scene):
    def construct(self):
        self.add(Square(opacity=0.5))
        w = FRAME_WIDTH
        h = FRAME_HEIGHT
        self.play(ShowCreation(Line()))
"""
    # Auto fix constants
    fixed, fixes = _auto_fix_constants(bad_code)
    assert "FRAME_WIDTH" not in fixed
    assert "FRAME_HEIGHT" not in fixed
    assert "config.frame_width" in fixed
    assert "config.frame_height" in fixed
    assert "ShowCreation" not in fixed
    assert "Create" in fixed
    assert "opacity" not in fixed  # stripped

    # Ensure main scene
    renamed, scene_fixes = _ensure_main_scene(fixed)
    assert "MainScene" in renamed
    assert "MyScene" not in renamed


def test_bad_patterns():
    code_with_bad_patterns = """
class MainScene(Scene):
    def construct(self):
        self.add_foreground_mobject(Circle())
        self.camera.set_zoom(2.0)
"""
    violations = _find_bad_patterns(code_with_bad_patterns)
    assert len(violations) >= 2
    assert any("add_foreground_mobject" in v for v in violations)
    assert any("set_zoom" in v for v in violations)


def test_error_classification():
    stderr_syntax = "SyntaxError: invalid syntax (scene.py, line 5)"
    assert classify_error(stderr_syntax) == "syntax"

    stderr_api = "AttributeError: 'Circle' object has no attribute 'does_not_exist'"
    assert classify_error(stderr_api) == "api"

    stderr_logic = "ZeroDivisionError: division by zero"
    assert classify_error(stderr_logic) == "logic"
