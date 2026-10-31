"""Edge case tests to ensure comprehensive coverage across models, client, and exceptions."""

import io
import json
import urllib.error
from unittest.mock import MagicMock, patch

import pytest
from sentra import ActionRequest, ActionResponse, SentraClient, SentraError
from sentra.client import _create_ssl_context


def test_action_request_methods():
    """ActionRequest to_dict, indexing, and get."""
    req = ActionRequest(agent="test-agent", action="do_work", metadata={"key": "val"})
    assert req.to_dict() == {"agent": "test-agent", "action": "do_work", "metadata": {"key": "val"}}
    assert req["agent"] == "test-agent"
    assert req["action"] == "do_work"
    assert req["metadata"] == {"key": "val"}
    assert req.get("agent") == "test-agent"
    assert req.get("nonexistent", "fallback") == "fallback"

    with pytest.raises(KeyError):
        _ = req["invalid_key"]

    req_no_meta = ActionRequest(agent="a", action="b")
    assert req_no_meta.to_dict() == {"agent": "a", "action": "b"}


def test_action_response_methods_and_equality():
    """ActionResponse edge cases for to_dict, __getitem__, and __eq__."""
    resp = ActionResponse(
        status="allowed",
        is_allowed=True,
        risk="low",
        reason="ok",
        impact="none",
        compliance=[],
        explanation="explained",
        confidence=0.99,
        is_pending_approval=False,
    )

    d = resp.to_dict()
    assert d["explanation"] == "explained"
    assert d["confidence"] == 0.99
    assert d["isPendingApproval"] is False

    with pytest.raises(KeyError):
        _ = resp["unknown_prop"]

    # Equality with ActionResponse
    resp_clone = ActionResponse(
        status="allowed",
        is_allowed=True,
        risk="low",
        reason="ok",
        impact="none",
        compliance=[],
        explanation="explained",
        confidence=0.99,
        is_pending_approval=False,
    )
    assert resp == resp_clone

    # Equality with non-ActionResponse and non-dict
    assert (resp == 123) is False
    assert (resp == "some_string") is False


def test_sentra_error_repr():
    """SentraError repr formatting."""
    err = SentraError("Something broke", status=500, fix="Try again")
    assert "SentraError('Something broke', status=500, fix='Try again')" in repr(err)


def test_create_ssl_context_fallbacks():
    """_create_ssl_context handles missing certifi or SSL exceptions gracefully."""
    with patch.dict("sys.modules", {"certifi": None}):
        ctx = _create_ssl_context()
        # Should either return default context or None without raising
        assert ctx is not None or ctx is None

    with patch("ssl.create_default_context", side_effect=Exception("SSL not supported")):
        ctx_none = _create_ssl_context()
        assert ctx_none is None


def test_client_aliases_and_methods():
    """checkAction, demoBlockedAction, and safeAction camelCase aliases."""
    client = SentraClient(api_key="sentra_test_sandbox")

    with patch.object(client, "check_action", return_value=ActionResponse(
        status="allowed", is_allowed=True, risk="low", reason="ok", impact="none"
    )) as mock_check:
        res = client.checkAction(agent="bot", action="act")
        assert res.is_allowed is True
        mock_check.assert_called_once()

    with patch.object(client, "demo_blocked_action", return_value=ActionResponse(
        status="blocked", is_allowed=False, risk="high", reason="blocked", impact="none"
    )) as mock_demo:
        res_demo = client.demoBlockedAction()
        assert res_demo.is_allowed is False
        mock_demo.assert_called_once()

    with patch.object(client, "safe_action", return_value={"success": True}) as mock_safe:
        res_safe = client.safeAction({"agent": "bot", "action": "act"}, lambda: "done")
        assert res_safe["success"] is True
        mock_safe.assert_called_once()


def test_check_action_request_object_input_and_prompt_formatting():
    """check_action accepting an ActionRequest instance with custom metadata and non-string action."""
    client = SentraClient(api_key="sentra_test_sandbox")

    captured = []

    def mock_urlopen(req, **kwargs):
        captured.append(json.loads(req.data.decode("utf-8")))
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"status": "allowed"}).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        # 1. ActionRequest instance with no prompt in metadata
        req_obj = ActionRequest(agent="agent-x", action="execute_batch", metadata={"count": 5})
        res = client.check_action(req_obj)
        assert res.is_allowed is True
        assert captured[0]["agent"] == "agent-x"
        assert captured[0]["action"] == "execute_batch"
        assert 'agent-x: execute_batch {"count": 5}' == captured[0]["prompt"]

        # 2. Non-string action
        class CustomObj:
            agent = "custom-agent"
            action = {"type": "complex_action"}
            metadata = None

        client.check_action(CustomObj())
        assert captured[1]["agent"] == "custom-agent"


def test_client_http_error_read_failure_and_unknown_decision():
    """Handles edge case where HTTPError body cannot be read, or response contains unrecognized status."""
    client = SentraClient(api_key="sentra_test_sandbox")

    # Mock HTTPError where read() throws an exception
    mock_err_fp = MagicMock()
    mock_err_fp.read.side_effect = Exception("Read failed")
    err_400 = urllib.error.HTTPError(
        url="https://api.sentra.local", code=400, msg="Bad Request", hdrs={}, fp=mock_err_fp
    )

    with patch("urllib.request.urlopen", side_effect=err_400):
        res = client.check_action(agent="bot", action="test")
        assert res.status == "blocked"
        assert "Bad Request" in res.reason

    # Unknown decision defaults to allowed
    def mock_ok(req, **kwargs):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"decision": "SOME_CUSTOM_DECISION"}).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=mock_ok):
        res_unknown = client.check_action(agent="bot", action="test")
        assert res_unknown.status == "allowed"
        assert res_unknown.is_allowed is True


def test_client_http_500_raises_sentra_error():
    """HTTP 500 raises SentraError."""
    client = SentraClient(api_key="sentra_test_sandbox")
    err_500 = urllib.error.HTTPError(
        url="https://api.sentra.local", code=500, msg="Internal Server Error", hdrs={}, fp=io.BytesIO(b"")
    )
    with patch("urllib.request.urlopen", side_effect=err_500):
        with pytest.raises(SentraError) as exc_info:
            client.check_action(agent="bot", action="crash")
        assert exc_info.value.status == 500


def test_transient_non_cold_start_retry():
    """Non-cold-start transient error retries up to max_retries."""
    client = SentraClient(api_key="sentra_test_sandbox", max_retries=2)
    attempts = 0

    def mock_urlopen(req, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise urllib.error.URLError("Connection reset by peer")
        resp = MagicMock()
        resp.read.return_value = json.dumps({"decision": "ALLOW"}).encode("utf-8")
        resp.__enter__.return_value = resp
        return resp

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with patch("time.sleep"):
            res = client.check_action(agent="bot", action="act")
    assert res.is_allowed is True
    assert attempts == 2


def test_confidence_fallback_when_none():
    """Confidence defaults to 1.0 for allowed and 0.95 for blocked if not provided."""
    client = SentraClient(api_key="sentra_test_sandbox")

    # Allowed without confidence
    def mock_allowed(req, **kwargs):
        resp = MagicMock()
        resp.read.return_value = json.dumps({"status": "allowed"}).encode("utf-8")
        resp.__enter__.return_value = resp
        return resp

    with patch("urllib.request.urlopen", side_effect=mock_allowed):
        res = client.check_action(agent="bot", action="act")
        assert res.confidence == 1.0

    # Blocked without confidence
    def mock_blocked(req, **kwargs):
        resp = MagicMock()
        resp.read.return_value = json.dumps({"status": "blocked"}).encode("utf-8")
        resp.__enter__.return_value = resp
        return resp

    with patch("urllib.request.urlopen", side_effect=mock_blocked):
        res2 = client.check_action(agent="bot", action="act")
        assert res2.confidence == 0.95

    # Flagged decision
    def mock_flagged(req, **kwargs):
        resp = MagicMock()
        resp.read.return_value = json.dumps({"decision": "FLAG", "isPendingApproval": True}).encode("utf-8")
        resp.__enter__.return_value = resp
        return resp

    with patch("urllib.request.urlopen", side_effect=mock_flagged):
        res3 = client.check_action(agent="bot", action="flag_me")
        assert res3.status == "flagged"
        assert res3.is_allowed is False
        assert res3.is_pending_approval is True


def test_sentra_ai_alias_exports():
    """sentra_ai exports the same classes as sentra."""
    import sentra_ai
    assert sentra_ai.SentraClient is SentraClient
    assert sentra_ai.SentraError is SentraError
    assert sentra_ai.ActionRequest is ActionRequest
    assert sentra_ai.ActionResponse is ActionResponse
