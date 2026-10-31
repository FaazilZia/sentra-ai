"""Unit tests for Sentra AI OpenAI, Azure OpenAI, and Anthropic wrappers."""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import MagicMock

import pytest

from sentra import (
    ActionRequest,
    ActionResponse,
    SentraClient,
    SentraError,
    WrapperOptions,
    wrap_anthropic,
    wrap_azure_openai,
    wrap_openai,
    wrapAnthropic,
    wrapAzureOpenAI,
    wrapOpenAI,
)
from sentra.wrappers import (
    extract_anthropic_prompt,
    extract_content_text,
    extract_openai_prompt,
)


def _create_mock_sentra(response_to_return: dict[str, Any]) -> tuple[SentraClient, list[dict[str, Any]]]:
    sentra = SentraClient(api_key="sentra_test_sandbox")
    recorded_calls: list[dict[str, Any]] = []

    def mock_check_action(*args: Any, **kwargs: Any) -> ActionResponse:
        req = args[0] if args else kwargs
        if isinstance(req, ActionRequest):
            recorded_calls.append({"agent": req.agent, "action": req.action, "metadata": req.metadata})
        elif isinstance(req, dict):
            recorded_calls.append(req)
        else:
            recorded_calls.append({
                "agent": kwargs.get("agent", "agent"),
                "action": kwargs.get("action", ""),
                "metadata": kwargs.get("metadata", {}),
            })
        return ActionResponse(**response_to_return)

    sentra.check_action = mock_check_action  # type: ignore[assignment]
    return sentra, recorded_calls


class MockOpenAIClient:
    def __init__(self, chat_return: Any = None, resp_return: Any = None) -> None:
        self.chat_calls = 0
        self.resp_calls = 0
        self.chat_return = chat_return or {"id": "chat-mock-1", "choices": [{"message": {"content": "ok"}}]}
        self.resp_return = resp_return or {"id": "resp-mock-1"}

        class Completions:
            def __init__(self, outer: MockOpenAIClient) -> None:
                self.outer = outer

            def create(self, *args: Any, **kwargs: Any) -> Any:
                self.outer.chat_calls += 1
                return self.outer.chat_return

        class Chat:
            def __init__(self, outer: MockOpenAIClient) -> None:
                self.completions = Completions(outer)

        class Responses:
            def __init__(self, outer: MockOpenAIClient) -> None:
                self.outer = outer

            def create(self, *args: Any, **kwargs: Any) -> Any:
                self.outer.resp_calls += 1
                return self.outer.resp_return

        self.chat = Chat(self)
        self.responses = Responses(self)


class MockAnthropicClient:
    def __init__(self, return_val: Any = None) -> None:
        self.msg_calls = 0
        self.return_val = return_val or {"id": "msg-mock-1", "content": [{"text": "anthropic ok"}]}

        class Messages:
            def __init__(self, outer: MockAnthropicClient) -> None:
                self.outer = outer

            def create(self, *args: Any, **kwargs: Any) -> Any:
                self.outer.msg_calls += 1
                return self.outer.return_val

        self.messages = Messages(self)


class TestOpenAIWrapper:
    def test_allow_path_executes_provider_once(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
        })
        client = MockOpenAIClient()
        wrapped = sentra.wrap_openai(client)

        result = wrapped.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "hello"}],
        )

        assert client.chat_calls == 1
        assert result == client.chat_return
        assert len(recorded) == 1
        assert recorded[0]["action"] == "OPENAI_CHAT_COMPLETION"
        assert recorded[0]["agent"] == "openai-client"
        assert recorded[0]["metadata"]["model"] == "gpt-4o"

    def test_block_path_makes_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "Action blocked: security policy violation",
            "impact": "Execution prevented",
        })
        client = MockOpenAIClient()
        wrapped = sentra.wrap_openai(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "malicious input"}],
            )

        assert exc_info.value.status == 403
        assert "[Sentra Blocked]" in str(exc_info.value)
        assert client.chat_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "OPENAI_CHAT_COMPLETION"

    def test_flag_path_default_block_makes_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Review required",
            "impact": "Human check",
        })
        client = MockOpenAIClient()
        wrapped = sentra.wrap_openai(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "flagged input"}],
            )

        assert exc_info.value.status == 403
        assert client.chat_calls == 0

    def test_flag_path_allow_invokes_on_flag_and_calls_provider(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Audit logged",
            "impact": "Audited",
        })
        client = MockOpenAIClient()
        flags_recorded: list[ActionResponse] = []

        wrapped = sentra.wrap_openai(
            client,
            options={"flag_mode": "allow", "on_flag": flags_recorded.append, "agent": "custom-agent"},
        )

        result = wrapped.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "audited input"}],
        )

        assert client.chat_calls == 1
        assert result == client.chat_return
        assert len(flags_recorded) == 1
        assert flags_recorded[0].status == "flagged"

    def test_rate_limited_makes_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "rate_limited",
            "is_allowed": False,
            "risk": "low",
            "reason": "Quota reached",
            "impact": "Rate limited",
        })
        client = MockOpenAIClient()
        wrapped = sentra.wrap_openai(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "hi"}])

        assert exc_info.value.status == 429
        assert client.chat_calls == 0

    def test_openai_responses_create_intercepted(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
        })
        client = MockOpenAIClient()
        wrapped = wrap_openai(client, sentra_instance=sentra)

        result = wrapped.responses.create(model="gpt-4o", prompt="hello response")
        assert client.resp_calls == 1
        assert result == client.resp_return
        assert recorded[0]["action"] == "OPENAI_RESPONSES_CREATE"


class TestAzureOpenAIWrapper:
    def test_azure_allow_path_preserves_action_and_agent(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
        })
        client = MockOpenAIClient()
        wrapped = sentra.wrap_azure_openai(client)

        result = wrapped.chat.completions.create(
            model="gpt-5-mini-sentraa",
            messages=[{"role": "user", "content": "azure test"}],
        )

        assert client.chat_calls == 1
        assert result == client.chat_return
        assert len(recorded) == 1
        assert recorded[0]["action"] == "AZURE_OPENAI_CHAT_COMPLETION"
        assert recorded[0]["agent"] == "azure-openai-client"

    def test_azure_block_path_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "Azure action blocked",
            "impact": "Blocked",
        })
        client = MockOpenAIClient()
        wrapped = sentra.wrap_azure_openai(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.chat.completions.create(
                model="gpt-5-mini-sentraa",
                messages=[{"role": "user", "content": "dump keys"}],
            )

        assert exc_info.value.status == 403
        assert client.chat_calls == 0
        assert recorded[0]["action"] == "AZURE_OPENAI_CHAT_COMPLETION"

    def test_azure_responses_create(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
        })
        client = MockOpenAIClient()
        wrapped = wrap_azure_openai(client, sentra_instance=sentra)

        wrapped.responses.create(model="gpt-5-mini-sentraa", prompt="azure response")
        assert client.resp_calls == 1
        assert recorded[0]["action"] == "AZURE_OPENAI_RESPONSES_CREATE"


class TestAnthropicWrapper:
    def test_anthropic_allow_path(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
        })
        client = MockAnthropicClient()
        wrapped = sentra.wrap_anthropic(client)

        result = wrapped.messages.create(
            model="claude-haiku-5-5",
            system="Be concise",
            messages=[{"role": "user", "content": "hello claude"}],
        )

        assert client.msg_calls == 1
        assert result == client.return_val
        assert len(recorded) == 1
        assert recorded[0]["action"] == "ANTHROPIC_MESSAGES_CREATE"
        assert recorded[0]["agent"] == "anthropic-client"
        assert recorded[0]["metadata"]["model"] == "claude-haiku-5-5"
        assert "Be concise" in recorded[0]["metadata"]["prompt"]
        assert "hello claude" in recorded[0]["metadata"]["prompt"]

    def test_anthropic_block_path_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "Blocked Anthropic action",
            "impact": "Blocked",
        })
        client = MockAnthropicClient()
        wrapped = sentra.wrap_anthropic(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.messages.create(
                model="claude-haiku-5-5",
                messages=[{"role": "user", "content": "malicious"}],
            )

        assert exc_info.value.status == 403
        assert client.msg_calls == 0

    def test_anthropic_flag_allow_path(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Flagged",
            "impact": "Audit",
        })
        client = MockAnthropicClient()
        flagged: list[ActionResponse] = []
        options = WrapperOptions(agent="sec-agent", flag_mode="allow", on_flag=flagged.append)

        wrapped = wrap_anthropic(client, options=options, sentra_instance=sentra)
        result = wrapped.messages.create(
            model="claude-haiku-5-5",
            messages=[{"role": "user", "content": "flagged request"}],
        )

        assert client.msg_calls == 1
        assert result == client.return_val
        assert len(flagged) == 1
        assert options["agent"] == "sec-agent"
        assert options.get("flagMode") == "allow"
        assert options.get("nonexistent", "fallback") == "fallback"


class TestAsyncSupport:
    def test_async_openai_wrapper_allow_and_block(self) -> None:
        async def _run() -> None:
            sentra, _ = _create_mock_sentra({
                "status": "allowed",
                "is_allowed": True,
                "risk": "low",
                "reason": "Safe Action",
                "impact": "None",
            })

            async_calls = 0

            class AsyncCompletions:
                async def create(self, *args: Any, **kwargs: Any) -> Any:
                    nonlocal async_calls
                    async_calls += 1
                    return {"id": "async-1"}

            class AsyncChat:
                def __init__(self) -> None:
                    self.completions = AsyncCompletions()

            class AsyncClient:
                def __init__(self) -> None:
                    self.chat = AsyncChat()

            client = AsyncClient()
            wrapped = sentra.wrap_openai(client)

            res = await wrapped.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "hi"}])
            assert async_calls == 1
            assert res == {"id": "async-1"}

            # Now test async block path
            sentra_block, _ = _create_mock_sentra({
                "status": "blocked",
                "is_allowed": False,
                "risk": "high",
                "reason": "Blocked async",
                "impact": "Blocked",
            })
            client_blocked = AsyncClient()
            wrapped_blocked = sentra_block.wrap_openai(client_blocked)

            with pytest.raises(SentraError) as exc_info:
                await wrapped_blocked.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "bad"}])

            assert exc_info.value.status == 403
            assert async_calls == 1  # No additional calls!

            # Test async rate limited path
            sentra_rl, _ = _create_mock_sentra({
                "status": "rate_limited",
                "is_allowed": False,
                "risk": "low",
                "reason": "Async Rate Limited",
                "impact": "Rate limited",
            })
            client_rl = AsyncClient()
            wrapped_rl = sentra_rl.wrap_openai(client_rl)
            with pytest.raises(SentraError) as exc_rl:
                await wrapped_rl.chat.completions.create(model="gpt-4o")
            assert exc_rl.value.status == 429
            assert async_calls == 1

            # Test async flagged block path
            sentra_fl, _ = _create_mock_sentra({
                "status": "flagged",
                "is_allowed": False,
                "risk": "medium",
                "reason": "Async Flagged",
                "impact": "Review",
            })
            client_fl = AsyncClient()
            wrapped_fl = sentra_fl.wrap_openai(client_fl, flag_mode="block")
            with pytest.raises(SentraError) as exc_fl:
                await wrapped_fl.chat.completions.create(model="gpt-4o")
            assert exc_fl.value.status == 403
            assert async_calls == 1

            # Test async flagged allow path
            async_flags: list[ActionResponse] = []
            client_fl_allow = AsyncClient()
            wrapped_fl_allow = sentra_fl.wrap_openai(
                client_fl_allow,
                options=WrapperOptions(agent="async-agent", flag_mode="allow", on_flag=async_flags.append),
            )
            res_fl = await wrapped_fl_allow.chat.completions.create(model="gpt-4o")
            assert res_fl == {"id": "async-1"}
            assert async_calls == 2
            assert len(async_flags) == 1

        asyncio.run(_run())


class TestWrapperEdgeCases:
    def test_none_client_returns_none(self) -> None:
        assert wrap_openai(None) is None
        assert wrap_azure_openai(None) is None
        assert wrap_anthropic(None) is None

    def test_already_wrapped_client_not_rewrapped(self) -> None:
        client = MockOpenAIClient()
        first = wrap_openai(client)
        orig_method = first.chat.completions.create
        second = wrap_openai(first)
        assert second is first
        assert second.chat.completions.create is orig_method

    def test_missing_child_components_safe(self) -> None:
        bare_client = object()
        res = wrap_openai(bare_client)
        assert res is bare_client

        bare_anthropic = object()
        res_a = wrap_anthropic(bare_anthropic)
        assert res_a is bare_anthropic

        class NonCallableClient:
            def __init__(self) -> None:
                class Chat:
                    class Completions:
                        create = "not_callable"
                    completions = Completions()
                self.chat = Chat()
        nc = NonCallableClient()
        assert wrap_openai(nc) is nc

    def test_wrapper_options_and_dict_access(self) -> None:
        opts = WrapperOptions(agent="test-agent", flag_mode="allow")
        assert opts["agent"] == "test-agent"
        assert opts["flag_mode"] == "allow"
        assert opts["flagMode"] == "allow"
        with pytest.raises(KeyError):
            _ = opts["unknown_key"]
        assert opts.get("unknown_key", "default") == "default"

        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
        })
        client = MockOpenAIClient()
        wrapped = sentra.wrap_openai(client, options=opts)
        wrapped.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "hi"}])
        assert recorded[0]["agent"] == "test-agent"

    def test_prompt_extraction_item_dict_and_attrs(self) -> None:
        assert extract_content_text(["str1", "str2"]) == "str1\nstr2"
        assert extract_content_text([{"text": "from-dict"}, {"text": 123}, {"other": "val"}]) == "from-dict"

        class AttrItem:
            text = "from-attr"

        class NonStringAttrItem:
            text = 456

        assert extract_content_text([AttrItem(), NonStringAttrItem()]) == "from-attr"

        # Test positional dict parameter to wrapped method
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
            "impact": "None",
        })
        client = MockOpenAIClient()
        wrapped = sentra.wrap_openai(client)
        wrapped.chat.completions.create({"model": "gpt-pos-dict", "messages": [{"role": "user", "content": "from-pos"}]})
        assert recorded[0]["metadata"]["model"] == "gpt-pos-dict"

        # Test object params with .model attribute
        class ObjParam:
            model = "gpt-obj-param"
            messages = [{"role": "user", "content": "obj content"}]
        wrapped.chat.completions.create(ObjParam())
        assert recorded[1]["metadata"]["model"] == "gpt-obj-param"

    def test_camel_case_method_aliases(self) -> None:
        sentra = SentraClient(api_key="sentra_test_sandbox")
        client = MockOpenAIClient()
        w1 = sentra.wrapOpenAI(client)
        assert getattr(w1, "__sentra_wrapped__", False) is True

        client_az = MockOpenAIClient()
        w2 = sentra.wrapAzureOpenAI(client_az)
        assert getattr(w2, "__sentra_wrapped__", False) is True

        client_an = MockAnthropicClient()
        w3 = sentra.wrapAnthropic(client_an)
        assert getattr(w3, "__sentra_wrapped__", False) is True

    def test_camel_case_top_level_exports(self) -> None:
        c1 = MockOpenAIClient()
        assert wrapOpenAI(c1) is c1
        c2 = MockOpenAIClient()
        assert wrapAzureOpenAI(c2) is c2
        c3 = MockAnthropicClient()
        assert wrapAnthropic(c3) is c3

    def test_prompt_extraction_variations(self) -> None:
        assert extract_openai_prompt(None) == ""
        assert extract_openai_prompt({}) == ""
        assert extract_openai_prompt({"prompt": "direct prompt"}) == "direct prompt"
        assert extract_openai_prompt({"prompt": ["p1", "p2"]}) == "p1\np2"
        assert extract_openai_prompt({"messages": [{"content": "hello"}]}) == "hello"
        assert extract_openai_prompt({"messages": [{"content": [{"text": "part1"}, {"text": "part2"}]}]}) == "part1\npart2"

        class CustomObj:
            def __init__(self, text: str) -> None:
                self.text = text

        assert extract_content_text([CustomObj("custom")]) == "custom"
        assert extract_content_text(123) == ""

        assert extract_anthropic_prompt(None) == ""
        assert extract_anthropic_prompt({}) == ""
        assert extract_anthropic_prompt({"system": "sys"}) == "sys"
        assert extract_anthropic_prompt({"messages": [{"content": "msg"}]}) == "msg"
        assert extract_anthropic_prompt({"system": "sys", "messages": [{"content": "msg"}]}) == "sys\nmsg"

    def test_sentra_client_default_env_construction(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("SENTRA_API_KEY", raising=False)
        client = MockOpenAIClient()
        wrapped = wrap_openai(client)
        assert getattr(wrapped, "__sentra_wrapped__", False) is True
