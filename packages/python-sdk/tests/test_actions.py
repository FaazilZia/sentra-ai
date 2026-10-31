"""Unit tests for check_action parsing, non-transient client errors, and helpers."""

import io
import json
import urllib.error
from unittest.mock import MagicMock, patch

import pytest
from sentra import ActionRequest, ActionResponse, SentraClient, SentraError


def test_client_error_401_fails_closed_without_retry():
    """HTTP 401 must fail closed immediately without retries."""
    client = SentraClient(api_key="invalid_key")

    attempts = 0

    def mock_urlopen(req, **kwargs):
        nonlocal attempts
        attempts += 1
        raise urllib.error.HTTPError(
            url="https://api.sentra.local", code=401, msg="Unauthorized", hdrs={}, fp=io.BytesIO(b"")
        )

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        res = client.check_action(agent="bot", action="do_something")

    assert attempts == 1
    assert res.status == "blocked"
    assert res.is_allowed is False
    assert res.risk == "high"
    assert "Authentication Failed" in res.reason
    assert res.compliance == ["Access Control"]


def test_client_error_403_fails_closed_without_retry():
    """HTTP 403 must fail closed immediately without retries."""
    client = SentraClient(api_key="valid_key")

    attempts = 0

    def mock_urlopen(req, **kwargs):
        nonlocal attempts
        attempts += 1
        raise urllib.error.HTTPError(
            url="https://api.sentra.local", code=403, msg="Forbidden", hdrs={}, fp=io.BytesIO(b"")
        )

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        res = client.check_action(agent="bot", action="admin_action")

    assert attempts == 1
    assert res.status == "blocked"
    assert res.is_allowed is False
    assert res.risk == "high"
    assert "Access Forbidden" in res.reason
    assert res.compliance == ["Access Control"]


def test_client_error_400_fails_closed_without_retry():
    """HTTP 400 must fail closed immediately without retries, extracting message."""
    client = SentraClient(api_key="valid_key")

    attempts = 0

    def mock_urlopen(req, **kwargs):
        nonlocal attempts
        attempts += 1
        raise urllib.error.HTTPError(
            url="https://api.sentra.local",
            code=400,
            msg="Bad Request",
            hdrs={},
            fp=io.BytesIO(b'{"message": "Action parameter is missing"}'),
        )

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        res = client.check_action(agent="bot", action="")

    assert attempts == 1
    assert res.status == "blocked"
    assert res.is_allowed is False
    assert res.risk == "high"
    assert "Bad Request: Action parameter is missing" in res.reason
    assert res.compliance == ["Validation Guardrail"]


def test_prompt_construction_variations():
    """Validates prompt construction logic matching Node SDK."""
    client = SentraClient(api_key="sentra_test_sandbox")
    captured = []

    def mock_urlopen(req, **kwargs):
        captured.append(json.loads(req.data.decode("utf-8")))
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"decision": "ALLOW"}).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        # 1. Metadata has prompt
        client.check_action(agent="a", action="b", metadata={"prompt": "Custom prompt text"})
        assert captured[0]["prompt"] == "Custom prompt text"

        # 2. Metadata without prompt
        client.check_action(agent="bot", action="deploy", metadata={"target": "prod"})
        assert captured[1]["prompt"] == 'bot: deploy {"target": "prod"}'

        # 3. Action alone
        client.check_action(agent="bot", action="status")
        assert captured[2]["prompt"] == "bot: status"


def test_demo_blocked_action():
    """demo_blocked_action submits predefined unsafe payload."""
    client = SentraClient(api_key="sentra_test_sandbox")
    captured = []

    def mock_urlopen(req, **kwargs):
        captured.append(json.loads(req.data.decode("utf-8")))
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({
            "status": "blocked",
            "decision": "BLOCK",
            "risk": "high",
            "reason": "Action blocked: potentially sensitive data or restricted pattern detected",
            "impact": "Execution prevented to ensure safety",
            "compliance": ["NIST-AI-RMF", "PCI-DSS"],
        }).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        res = client.demo_blocked_action()

    assert res.status == "blocked"
    assert res.is_allowed is False
    assert captured[0]["agent"] == "demo-pilot-agent"
    assert captured[0]["action"] == "export_credentials"


def test_safe_action_execution_and_error_handling():
    """safe_action executes logic on allow, blocks when disallowed, and wraps exceptions."""
    client = SentraClient(api_key="sentra_test_sandbox")

    # Allowed case
    with patch.object(
        client,
        "check_action",
        return_value=ActionResponse(
            status="allowed", is_allowed=True, risk="low", reason="ok", impact="none"
        ),
    ):
        res = client.safe_action({"agent": "a", "action": "b"}, lambda: 42)
        assert res["success"] is True
        assert res["result"] == 42

    # Blocked case
    with patch.object(
        client,
        "check_action",
        return_value=ActionResponse(
            status="blocked", is_allowed=False, risk="high", reason="no", impact="stopped"
        ),
    ):
        called = False

        def fn():
            nonlocal called
            called = True

        res = client.safe_action(ActionRequest(agent="a", action="b"), fn)
        assert res["success"] is False
        assert called is False

    # Allowed case with execution failure
    with patch.object(
        client,
        "check_action",
        return_value=ActionResponse(
            status="allowed", is_allowed=True, risk="low", reason="ok", impact="none"
        ),
    ):
        def bad_fn():
            raise RuntimeError("Database connection died")

        with pytest.raises(SentraError) as exc_info:
            client.safe_action({"agent": "a", "action": "b"}, bad_fn)
        assert exc_info.value.status == 500


def test_action_response_dict_access_and_equality():
    """ActionResponse supports item access, get(), to_dict(), and equality checks."""
    resp = ActionResponse(
        status="flagged",
        is_allowed=False,
        risk="medium",
        reason="Requires review",
        impact="Human verification",
        compliance=["ISO-27001"],
        explanation="Uncertain pattern",
        confidence=0.8,
        is_pending_approval=True,
    )

    assert resp["status"] == "flagged"
    assert resp["isAllowed"] is False
    assert resp["is_allowed"] is False
    assert resp.get("non_existent", "default") == "default"
    assert resp.isPendingApproval is True

    as_dict = resp.to_dict()
    assert as_dict["status"] == "flagged"
    assert as_dict["isAllowed"] is False

    # Equality check with dict
    assert resp == {
        "status": "flagged",
        "isAllowed": False,
        "risk": "medium",
        "reason": "Requires review",
        "impact": "Human verification",
        "compliance": ["ISO-27001"],
        "explanation": "Uncertain pattern",
        "confidence": 0.8,
        "isPendingApproval": True,
    }
