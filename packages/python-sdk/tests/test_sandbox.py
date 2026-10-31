"""Unit tests for sandbox key detection and routing."""

import json
from unittest.mock import MagicMock, patch

import pytest
from sentra import ActionRequest, SentraClient


@pytest.mark.parametrize(
    "api_key,expected_sandbox",
    [
        ("sentra_test_sandbox", True),
        ("demo", True),
        ("sentra_test_12345", True),
        ("test_custom_key", True),
        ("sentra_live_abcdef123456", False),
        ("sk-proj-prod999", False),
    ],
)
def test_sandbox_key_detection(api_key: str, expected_sandbox: bool):
    """Detects sandbox mode based on key prefixes and special names."""
    client = SentraClient(api_key=api_key)
    assert client.is_sandbox is expected_sandbox
    assert client.isSandbox is expected_sandbox


def test_explicit_sandbox_flag():
    """Explicit sandbox=True activates sandbox regardless of API key."""
    client = SentraClient(sandbox=True)
    assert client.is_sandbox is True

    client2 = SentraClient(api_key="production_format_key", sandbox=True)
    assert client2.is_sandbox is True


def test_sandbox_request_routing_and_payload():
    """In sandbox mode, requests route to /guardrails/demo without Authorization header."""
    client = SentraClient(api_key="sentra_test_sandbox", base_url="https://api.sentra.local/api/v1")

    captured_requests = []

    def mock_urlopen(req, **kwargs):
        captured_requests.append(req)
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({
            "status": "allowed",
            "decision": "ALLOW",
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
            "compliance": [],
        }).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        res = client.check_action(
            agent="test-agent",
            action="read_doc",
            metadata={"doc_id": "123"},
        )

    assert res.is_allowed is True
    assert res.status == "allowed"
    assert len(captured_requests) == 1

    req = captured_requests[0]
    assert req.full_url == "https://api.sentra.local/api/v1/guardrails/demo"
    assert "Authorization" not in req.headers
    assert req.headers["Content-type"] == "application/json"

    body = json.loads(req.data.decode("utf-8"))
    assert body["agent"] == "test-agent"
    assert body["action"] == "read_doc"
    assert body["metadata"] == {"doc_id": "123"}
    assert "prompt" in body


def test_production_request_routing_and_headers():
    """In non-sandbox mode, requests route to /ai/check-action with Authorization header."""
    client = SentraClient(api_key="sentra_live_secret_key_123", base_url="https://api.sentra.local/api/v1")

    captured_requests = []

    def mock_urlopen(req, **kwargs):
        captured_requests.append(req)
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({
            "status": "allowed",
            "decision": "ALLOW",
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
            "compliance": [],
        }).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        res = client.check_action(
            ActionRequest(agent="prod-agent", action="transfer_funds", metadata={"amount": 100})
        )

    assert res.is_allowed is True
    assert len(captured_requests) == 1

    req = captured_requests[0]
    assert req.full_url == "https://api.sentra.local/api/v1/ai/check-action"
    assert req.headers["Authorization"] == "Bearer sentra_live_secret_key_123"
