"""Unit tests for cold-start 60 second wait, retries, and fail-closed behavior."""

import io
import json
import socket
import urllib.error
from unittest.mock import MagicMock, patch

import pytest
from sentra import SentraClient


def test_cold_start_502_503_504_retries_and_succeeds():
    """Client retries on gateway errors (502, 503, 504) with backoff and succeeds on recovery."""
    client = SentraClient(api_key="sentra_test_sandbox", cold_start_timeout=60.0)

    attempts = 0

    def mock_urlopen(req, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise urllib.error.HTTPError(
                url="https://api.sentra.local", code=502, msg="Bad Gateway", hdrs={}, fp=io.BytesIO(b"")
            )
        if attempts == 2:
            raise urllib.error.HTTPError(
                url="https://api.sentra.local", code=503, msg="Service Unavailable", hdrs={}, fp=io.BytesIO(b"")
            )
        if attempts == 3:
            raise urllib.error.HTTPError(
                url="https://api.sentra.local", code=504, msg="Gateway Timeout", hdrs={}, fp=io.BytesIO(b"")
            )

        # Success on 4th attempt
        resp = MagicMock()
        resp.read.return_value = json.dumps({
            "status": "allowed",
            "decision": "ALLOW",
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
            "compliance": [],
        }).encode("utf-8")
        resp.__enter__.return_value = resp
        return resp

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with patch("time.sleep") as mock_sleep:
            res = client.check_action(agent="bot", action="ping")

    assert res.is_allowed is True
    assert res.status == "allowed"
    assert attempts == 4
    # Check that backoff delays were called
    assert mock_sleep.call_count == 3
    delays = [call[0][0] for call in mock_sleep.call_args_list]
    assert delays[0] == 1.0  # min(1.5^0, 5.0) = 1.0
    assert delays[1] == 1.5  # min(1.5^1, 5.0) = 1.5
    assert delays[2] == 2.25  # min(1.5^2, 5.0) = 2.25


def test_cold_start_socket_timeout_retries():
    """Client retries on network timeout errors during cold start."""
    client = SentraClient(api_key="sentra_test_sandbox", cold_start_timeout=60.0)

    attempts = 0

    def mock_urlopen(req, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise socket.timeout("timed out")
        if attempts == 2:
            raise urllib.error.URLError(socket.timeout("timed out"))

        resp = MagicMock()
        resp.read.return_value = json.dumps({
            "status": "allowed",
            "decision": "ALLOW",
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
            "compliance": [],
        }).encode("utf-8")
        resp.__enter__.return_value = resp
        return resp

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with patch("time.sleep"):
            res = client.check_action(agent="bot", action="ping")

    assert res.is_allowed is True
    assert attempts == 3


def test_cold_start_fails_closed_when_budget_exhausted():
    """When cold start retry budget is exhausted, client fails closed with status='blocked'."""
    # Test with explicit max_retries=2
    client = SentraClient(api_key="sentra_test_sandbox", max_retries=2)

    def mock_urlopen(req, **kwargs):
        raise urllib.error.HTTPError(
            url="https://api.sentra.local", code=502, msg="Bad Gateway", hdrs={}, fp=io.BytesIO(b"")
        )

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with patch("time.sleep"):
            res = client.check_action(agent="bot", action="ping")

    assert res.status == "blocked"
    assert res.is_allowed is False
    assert res.isAllowed is False
    assert res.risk == "high"
    assert "Governance engine unreachable" in res.reason
    assert "(fail-closed)" in res.reason
    assert res.impact == "Execution prevented to ensure safety"
    assert res.compliance == ["Safety Fallback"]


def test_cold_start_timeout_elapsed_fails_closed():
    """When elapsed time exceeds cold_start_timeout (e.g. 60s), loop terminates and fails closed."""
    client = SentraClient(api_key="sentra_test_sandbox", cold_start_timeout=60.0)

    # Simulate time advancing past 60s on 3rd attempt
    simulated_times = [0.0, 10.0, 30.0, 65.0, 70.0]

    def mock_urlopen(req, **kwargs):
        raise urllib.error.HTTPError(
            url="https://api.sentra.local", code=503, msg="Service Unavailable", hdrs={}, fp=io.BytesIO(b"")
        )

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with patch("time.sleep"):
            with patch("time.time", side_effect=simulated_times):
                res = client.check_action(agent="bot", action="ping")

    assert res.status == "blocked"
    assert res.is_allowed is False
    assert "Governance engine unreachable" in res.reason
    assert res.compliance == ["Safety Fallback"]
