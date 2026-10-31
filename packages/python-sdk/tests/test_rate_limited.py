"""Unit tests for 429 rate_limited status behavior."""

import io
import urllib.error
from unittest.mock import patch

from sentra import SentraClient


def test_rate_limited_returns_is_allowed_false_and_correct_status():
    """HTTP 429 must return status='rate_limited', is_allowed=False, and matching details."""
    client = SentraClient(api_key="sentra_test_sandbox")

    http_error_429 = urllib.error.HTTPError(
        url="https://api.sentra.local/api/v1/guardrails/demo",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=io.BytesIO(b'{"error": "Too many requests"}'),
    )

    with patch("urllib.request.urlopen", side_effect=http_error_429):
        decision = client.check_action(
            agent="rate-test-agent",
            action="spam_requests",
            metadata={"count": 50},
        )

    # Validate exact decision properties
    assert decision.status == "rate_limited"
    assert decision.is_allowed is False
    assert decision.isAllowed is False
    assert decision.risk == "low"
    assert decision.reason == "Demo limit reached. Wait a few minutes or use your own API key"
    assert decision.impact == "Demo rate limit reached; action was not permitted to execute"
    assert decision.compliance == ["Rate Limiting Quota"]


def test_rate_limited_in_safe_action():
    """safe_action returns success=False and does not execute callback when rate_limited."""
    client = SentraClient(api_key="sentra_test_sandbox")

    http_error_429 = urllib.error.HTTPError(
        url="https://api.sentra.local/api/v1/guardrails/demo",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=io.BytesIO(b""),
    )

    callback_called = False

    def sample_action():
        nonlocal callback_called
        callback_called = True
        return "success_result"

    with patch("urllib.request.urlopen", side_effect=http_error_429):
        result = client.safe_action(
            {"agent": "rate-agent", "action": "run_job"},
            sample_action,
        )

    assert callback_called is False
    assert result["success"] is False
    assert result["governance"].status == "rate_limited"
    assert result["governance"].is_allowed is False
