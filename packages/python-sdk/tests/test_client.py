"""Unit tests for SentraClient initialization and configuration."""

import pytest
from sentra import SentraClient, SentraError


def test_init_missing_key_and_sandbox_raises_error():
    """Initializing without an API key or sandbox=True raises a 401 SentraError."""
    with pytest.raises(SentraError) as exc_info:
        SentraClient()

    err = exc_info.value
    assert err.status == 401
    assert "No API key" in str(err)
    assert err.fix == "Pass a valid API key or apiKey: 'sentra_test_sandbox'"


def test_init_empty_or_whitespace_key_raises_error():
    """Empty string or whitespace key without sandbox raises 401 SentraError."""
    with pytest.raises(SentraError) as exc_info:
        SentraClient(api_key="   ")
    assert exc_info.value.status == 401

    with pytest.raises(SentraError) as exc_info2:
        SentraClient(apiKey="")
    assert exc_info2.value.status == 401


def test_init_valid_api_key():
    """Valid API key is stored and sandbox defaults to False."""
    client = SentraClient(api_key="sk-live-123456789")
    assert client.is_sandbox is False
    assert client.isSandbox is False
    assert client.base_url == "https://sentra-backend-node.onrender.com/api/v1"
    assert client.max_retries == 5
    assert client.timeout == 15.0
    assert client.cold_start_timeout == 60.0
    assert client.coldStartTimeoutMs == 60000


def test_init_base_url_strips_trailing_slash():
    """base_url removes trailing slashes."""
    client = SentraClient(api_key="sk-live-123", base_url="http://localhost:10000/api/v1///")
    assert client.base_url == "http://localhost:10000/api/v1"


def test_init_timeout_converts_ms_to_seconds():
    """Timeouts > 100 are treated as milliseconds and converted to seconds."""
    client = SentraClient(api_key="sk-live-123", timeout=30000)
    assert client.timeout == 30.0

    client2 = SentraClient(api_key="sk-live-123", timeout=12.5)
    assert client2.timeout == 12.5


def test_init_cold_start_timeout_converts_ms_to_seconds():
    """Cold start timeout > 100 is converted to seconds, and coldStartTimeoutMs returns ms."""
    client = SentraClient(api_key="sk-live-123", cold_start_timeout=45000)
    assert client.cold_start_timeout == 45.0
    assert client.coldStartTimeoutMs == 45000

    client2 = SentraClient(api_key="sk-live-123", cold_start_timeout=10.0)
    assert client2.cold_start_timeout == 10.0
    assert client2.coldStartTimeoutMs == 10000


def test_init_kwargs_camel_case_support():
    """Supports Node-style camelCase initialization options."""
    client = SentraClient(
        apiKey="sentra_test_sandbox",
        baseUrl="https://example.com/api/",
        maxRetries=3,
        coldStartTimeoutMs=20000,
    )
    assert client.is_sandbox is True
    assert client.base_url == "https://example.com/api"
    assert client.max_retries == 3
    assert client.cold_start_timeout == 20.0
    assert client.coldStartTimeoutMs == 20000


def test_repr_never_leaks_api_key():
    """Representation must never print, echo, or log secret keys."""
    client = SentraClient(api_key="super_secret_production_key_xyz987")
    client_repr = repr(client)
    assert "super_secret_production_key_xyz987" not in client_repr
    assert "SentraClient" in client_repr
    assert "base_url" in client_repr
