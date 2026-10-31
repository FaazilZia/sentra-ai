"""Unit tests for Sentra AI provider wrappers."""

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
    extract_anthropic_prompt,
    extract_bedrock_prompt,
    extract_content_text,
    extract_langchain_prompt,
    extract_openai_prompt,
    extract_vertex_prompt,
    wrap_anthropic,
    wrap_azure_openai,
    wrap_bedrock,
    wrap_langchain,
    wrap_openai,
    wrap_vertex,
    wrap_vertex_ai,
    wrapAnthropic,
    wrapAzureOpenAI,
    wrapBedrock,
    wrapLangChain,
    wrapOpenAI,
    wrapVertex,
    wrapVertexAI,
)


def _create_mock_sentra(response_to_return: dict[str, Any]) -> tuple[SentraClient, list[dict[str, Any]]]:
    sentra = SentraClient(api_key="sentra_test_sandbox")
    recorded_calls: list[dict[str, Any]] = []

    defaults = {
        "status": "allowed",
        "is_allowed": True,
        "risk": "low",
        "reason": "Safe Action",
        "impact": "None",
        "compliance": [],
    }
    payload = {**defaults, **response_to_return}

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
        return ActionResponse(**payload)

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


class MockConverseCommand:
    def __init__(self, input_val: Any) -> None:
        self.input = input_val


class MockConverseStreamCommand:
    def __init__(self, input_val: Any) -> None:
        self.input = input_val


class MockInvokeModelCommand:
    def __init__(self, input_val: Any) -> None:
        self.input = input_val


class MockInvokeModelWithResponseStreamCommand:
    def __init__(self, input_val: Any) -> None:
        self.input = input_val


class MockBedrockClient:
    def __init__(self) -> None:
        self.converse_calls = 0
        self.converse_stream_calls = 0
        self.invoke_model_calls = 0
        self.invoke_model_with_response_stream_calls = 0
        self.send_calls = 0

    def converse(self, *args: Any, **kwargs: Any) -> Any:
        self.converse_calls += 1
        return {"output": {"message": {"content": [{"text": "bedrock converse ok"}]}}}

    def converse_stream(self, *args: Any, **kwargs: Any) -> Any:
        self.converse_stream_calls += 1
        return [{"stream": "bedrock converse chunk"}]

    def invoke_model(self, *args: Any, **kwargs: Any) -> Any:
        self.invoke_model_calls += 1
        return {"body": b'{"generation": "bedrock invoke ok"}'}

    def invoke_model_with_response_stream(self, *args: Any, **kwargs: Any) -> Any:
        self.invoke_model_with_response_stream_calls += 1
        return [{"stream": "bedrock invoke chunk"}]

    def send(self, *args: Any, **kwargs: Any) -> Any:
        self.send_calls += 1
        return {"output": {"message": {"content": [{"text": "bedrock send ok"}]}}}


class MockAsyncBedrockClient:
    def __init__(self) -> None:
        self.send_calls = 0

    async def send(self, *args: Any, **kwargs: Any) -> Any:
        self.send_calls += 1
        return {"output": {"message": {"content": [{"text": "bedrock async send ok"}]}}}


class MockVertexClient:
    def __init__(self) -> None:
        self.generate_content_calls = 0
        self.generate_content_stream_calls = 0

        class Models:
            def __init__(self, outer: MockVertexClient) -> None:
                self.outer = outer

            def generate_content(self, *args: Any, **kwargs: Any) -> Any:
                self.outer.generate_content_calls += 1
                return {"candidates": [{"content": {"parts": [{"text": "vertex ok"}]}}]}

            def generate_content_stream(self, *args: Any, **kwargs: Any) -> Any:
                self.outer.generate_content_stream_calls += 1
                return [{"stream": "vertex chunk"}]

            def generateContent(self, *args: Any, **kwargs: Any) -> Any:
                return self.generate_content(*args, **kwargs)

            def generateContentStream(self, *args: Any, **kwargs: Any) -> Any:
                return self.generate_content_stream(*args, **kwargs)

        self.models = Models(self)


class MockLangChainChain:
    def __init__(self) -> None:
        self.invoke_calls = 0
        self.call_calls = 0
        self.ainvoke_calls = 0

    def invoke(self, *args: Any, **kwargs: Any) -> Any:
        self.invoke_calls += 1
        return {"output": "langchain invoke ok"}

    def call(self, *args: Any, **kwargs: Any) -> Any:
        self.call_calls += 1
        return {"output": "langchain call ok"}

    async def ainvoke(self, *args: Any, **kwargs: Any) -> Any:
        self.ainvoke_calls += 1
        return {"output": "langchain ainvoke ok"}


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


class TestBedrockWrapper:
    def test_bedrock_allow_path_converse(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        result = wrapped.converse(
            modelId="amazon.nova-lite-v1:0",
            messages=[{"role": "user", "content": [{"text": "hello bedrock"}]}],
        )

        assert client.converse_calls == 1
        assert "output" in result
        assert len(recorded) == 1
        assert recorded[0]["action"] == "BEDROCK_CONVERSE"
        assert recorded[0]["agent"] == "bedrock-client"
        assert recorded[0]["metadata"]["model"] == "amazon.nova-lite-v1:0"
        assert "hello bedrock" in recorded[0]["metadata"]["prompt"]

    def test_bedrock_converse_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "Bedrock request blocked",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.converse(
                modelId="amazon.nova-lite-v1:0",
                messages=[{"role": "user", "content": [{"text": "sensitive prompt"}]}],
            )

        assert exc_info.value.status == 403
        assert "[Sentra Blocked]" in str(exc_info.value)
        assert client.converse_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "BEDROCK_CONVERSE"

    def test_bedrock_converse_stream_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "Streaming converse blocked before opening stream",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.converse_stream(
                modelId="amazon.nova-lite-v1:0",
                messages=[{"role": "user", "content": [{"text": "sensitive stream prompt"}]}],
            )

        assert exc_info.value.status == 403
        assert client.converse_stream_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "BEDROCK_CONVERSE_STREAM"

    def test_bedrock_invoke_model_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "InvokeModel blocked",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.invoke_model(
                modelId="amazon.titan-text-express-v1",
                body=b'{"inputText": "sensitive data"}',
            )

        assert exc_info.value.status == 403
        assert client.invoke_model_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "BEDROCK_INVOKE_MODEL"

    def test_bedrock_invoke_model_stream_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "InvokeModelWithResponseStream blocked before opening stream",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.invoke_model_with_response_stream(
                modelId="amazon.titan-text-express-v1",
                body=b'{"inputText": "sensitive streaming data"}',
            )

        assert exc_info.value.status == 403
        assert client.invoke_model_with_response_stream_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "BEDROCK_INVOKE_MODEL_STREAM"

    def test_bedrock_send_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "Send command blocked",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        cmd = MockConverseCommand({"modelId": "nova-1", "messages": [{"content": "blocked send"}]})
        with pytest.raises(SentraError) as exc_info:
            wrapped.send(cmd)

        assert exc_info.value.status == 403
        assert client.send_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "BEDROCK_CONVERSE"

    def test_bedrock_flag_default_block_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Flagged by policy",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.converse(modelId="m1", messages=[{"content": "flagged"}])

        assert exc_info.value.status == 403
        assert client.converse_calls == 0

    def test_bedrock_flag_allow_invokes_on_flag_and_provider(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Flagged for audit",
        })
        client = MockBedrockClient()
        flagged_events: list[ActionResponse] = []
        wrapped = sentra.wrap_bedrock(
            client,
            options=WrapperOptions(agent="custom-bedrock", flag_mode="allow", on_flag=flagged_events.append),
        )

        result = wrapped.converse(modelId="m1", messages=[{"content": "flagged"}])

        assert client.converse_calls == 1
        assert len(flagged_events) == 1
        assert flagged_events[0].status == "flagged"
        assert "output" in result

    def test_bedrock_rate_limited_makes_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "rate_limited",
            "is_allowed": False,
            "risk": "low",
            "reason": "Rate limited",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.converse(modelId="m1", messages=[{"content": "rl"}])

        assert exc_info.value.status == 429
        assert client.converse_calls == 0

    def test_bedrock_send_command_object_dispatch(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
        })
        client = MockBedrockClient()
        wrapped = sentra.wrap_bedrock(client)

        cmd1 = MockConverseCommand({"modelId": "m1", "messages": [{"content": "c1"}]})
        wrapped.send(cmd1)
        assert recorded[-1]["action"] == "BEDROCK_CONVERSE"

        cmd2 = MockConverseStreamCommand({"modelId": "m2", "messages": [{"content": "c2"}]})
        wrapped.send(cmd2)
        assert recorded[-1]["action"] == "BEDROCK_CONVERSE_STREAM"

        cmd3 = MockInvokeModelCommand({"modelId": "m3", "body": '{"inputText": "c3"}'})
        wrapped.send(cmd3)
        assert recorded[-1]["action"] == "BEDROCK_INVOKE_MODEL"

        cmd4 = MockInvokeModelWithResponseStreamCommand({"modelId": "m4", "body": '{"inputText": "c4"}'})
        wrapped.send(cmd4)
        assert recorded[-1]["action"] == "BEDROCK_INVOKE_MODEL_STREAM"
        assert client.send_calls == 4

    def test_bedrock_async_send_allow_calls_provider(self) -> None:
        async def _run() -> None:
            sentra, recorded = _create_mock_sentra({
                "status": "allowed",
                "is_allowed": True,
                "risk": "low",
                "reason": "Safe Action",
            })
            client = MockAsyncBedrockClient()
            wrapped = sentra.wrap_bedrock(client)

            cmd = MockConverseCommand({"modelId": "nova-1", "messages": [{"content": "hello async"}]})
            res = await wrapped.send(cmd)

            assert client.send_calls == 1
            assert res["output"]["message"]["content"][0]["text"] == "bedrock async send ok"
            assert len(recorded) == 1
            assert recorded[0]["action"] == "BEDROCK_CONVERSE"

        asyncio.run(_run())

    def test_bedrock_async_send_block_zero_provider_calls(self) -> None:
        async def _run() -> None:
            sentra, recorded = _create_mock_sentra({
                "status": "blocked",
                "is_allowed": False,
                "risk": "high",
                "reason": "Async bedrock blocked",
            })
            client = MockAsyncBedrockClient()
            wrapped = sentra.wrap_bedrock(client)

            cmd = MockConverseCommand({"modelId": "nova-1", "messages": [{"content": "blocked async"}]})
            with pytest.raises(SentraError) as exc_info:
                await wrapped.send(cmd)

            assert exc_info.value.status == 403
            assert client.send_calls == 0
            assert len(recorded) == 1

        asyncio.run(_run())

    def test_bedrock_async_send_flag_allow_and_block(self) -> None:
        async def _run() -> None:
            sentra, _ = _create_mock_sentra({
                "status": "flagged",
                "is_allowed": False,
                "risk": "medium",
                "reason": "Flagged async bedrock",
            })
            client1 = MockAsyncBedrockClient()
            wrapped1 = sentra.wrap_bedrock(client1, options=WrapperOptions(flag_mode="block"))
            cmd1 = MockConverseCommand({"modelId": "nova-1", "messages": [{"content": "flagged async"}]})
            with pytest.raises(SentraError):
                await wrapped1.send(cmd1)
            assert client1.send_calls == 0

            client2 = MockAsyncBedrockClient()
            flagged_events: list[ActionResponse] = []
            wrapped2 = sentra.wrap_bedrock(
                client2, options=WrapperOptions(flag_mode="allow", on_flag=flagged_events.append)
            )
            cmd2 = MockConverseCommand({"modelId": "nova-1", "messages": [{"content": "flagged async"}]})
            await wrapped2.send(cmd2)
            assert client2.send_calls == 1
            assert len(flagged_events) == 1

        asyncio.run(_run())

    def test_bedrock_async_send_rate_limited_makes_zero_calls(self) -> None:
        async def _run() -> None:
            sentra, _ = _create_mock_sentra({
                "status": "rate_limited",
                "is_allowed": False,
                "risk": "low",
                "reason": "Rate limited async",
            })
            client = MockAsyncBedrockClient()
            wrapped = sentra.wrap_bedrock(client)
            cmd = MockConverseCommand({"modelId": "nova-1", "messages": [{"content": "rl async"}]})
            with pytest.raises(SentraError) as exc_info:
                await wrapped.send(cmd)
            assert exc_info.value.status == 429
            assert client.send_calls == 0

        asyncio.run(_run())


class TestVertexWrapper:
    def test_vertex_allow_path_generate_content(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
        })
        client = MockVertexClient()
        wrapped = sentra.wrap_vertex(client)

        result = wrapped.models.generate_content(
            model="gemini-2.5-flash",
            contents="Say hello in 5 words",
        )

        assert client.generate_content_calls == 1
        assert "candidates" in result
        assert len(recorded) == 1
        assert recorded[0]["action"] == "VERTEX_GENERATE_CONTENT"
        assert recorded[0]["agent"] == "vertex-client"
        assert recorded[0]["metadata"]["model"] == "gemini-2.5-flash"
        assert recorded[0]["metadata"]["prompt"] == "Say hello in 5 words"

    def test_vertex_generate_content_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "Vertex request blocked",
        })
        client = MockVertexClient()
        wrapped = sentra.wrap_vertex(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.models.generate_content(
                model="gemini-2.5-flash",
                contents="sensitive payload",
            )

        assert exc_info.value.status == 403
        assert "[Sentra Blocked]" in str(exc_info.value)
        assert client.generate_content_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "VERTEX_GENERATE_CONTENT"

    def test_vertex_generate_content_stream_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "Streaming Vertex request blocked before stream opening",
        })
        client = MockVertexClient()
        wrapped = sentra.wrap_vertex(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents="sensitive stream request",
            )

        assert exc_info.value.status == 403
        assert client.generate_content_stream_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "VERTEX_GENERATE_CONTENT_STREAM"

    def test_vertex_flag_default_block_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Flagged by Vertex policy",
        })
        client = MockVertexClient()
        wrapped = sentra.wrap_vertex(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.models.generate_content(model="gemini-2.5-flash", contents="flagged")

        assert exc_info.value.status == 403
        assert client.generate_content_calls == 0

    def test_vertex_flag_allow_invokes_on_flag_and_provider(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Flagged for audit",
        })
        client = MockVertexClient()
        flagged_events: list[ActionResponse] = []
        wrapped = sentra.wrap_vertex(
            client,
            options=WrapperOptions(agent="custom-vertex", flag_mode="allow", on_flag=flagged_events.append),
        )

        result = wrapped.models.generate_content(model="gemini-2.5-flash", contents="flagged")

        assert client.generate_content_calls == 1
        assert len(flagged_events) == 1
        assert flagged_events[0].status == "flagged"
        assert "candidates" in result

    def test_vertex_rate_limited_makes_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "rate_limited",
            "is_allowed": False,
            "risk": "low",
            "reason": "Rate limit exceeded",
        })
        client = MockVertexClient()
        wrapped = sentra.wrap_vertex(client)

        with pytest.raises(SentraError) as exc_info:
            wrapped.models.generate_content(model="gemini-2.5-flash", contents="rl")

        assert exc_info.value.status == 429
        assert client.generate_content_calls == 0

    def test_vertex_direct_generative_model_style(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
        })

        class DirectGenerativeModel:
            def __init__(self) -> None:
                self.calls = 0

            def generate_content(self, *args: Any, **kwargs: Any) -> Any:
                self.calls += 1
                return {"text": "direct gm ok"}

        model_obj = DirectGenerativeModel()
        wrapped = wrap_vertex(model_obj, sentra_instance=sentra)
        res = wrapped.generate_content("hello direct")

        assert model_obj.calls == 1
        assert res == {"text": "direct gm ok"}
        assert recorded[0]["action"] == "VERTEX_GENERATE_CONTENT"

    def test_vertex_wrap_vertex_ai_alias(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
        })
        client = MockVertexClient()
        wrapped = sentra.wrap_vertex_ai(client)
        assert getattr(wrapped, "__sentra_wrapped__", False) is True

        c2 = MockVertexClient()
        wrapped2 = wrapVertexAI(c2, sentra_instance=sentra)
        assert getattr(wrapped2, "__sentra_wrapped__", False) is True


class TestLangChainWrapper:
    def test_langchain_allow_path_invoke(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
        })
        chain = MockLangChainChain()
        wrapped = sentra.wrap_langchain(chain)

        result = wrapped.invoke({"input": "Explain quantum computing simply"})

        assert chain.invoke_calls == 1
        assert result == {"output": "langchain invoke ok"}
        assert len(recorded) == 1
        assert recorded[0]["action"] == "LANGCHAIN_INVOKE"
        assert recorded[0]["agent"] == "langchain-chain"
        assert recorded[0]["metadata"]["prompt_length"] > 0

    def test_langchain_allow_path_legacy_call(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
        })
        chain = MockLangChainChain()
        wrapped = sentra.wrap_langchain(chain)

        result = wrapped.call("Direct string prompt for legacy chain")

        assert chain.call_calls == 1
        assert result == {"output": "langchain call ok"}
        assert len(recorded) == 1
        assert recorded[0]["action"] == "LANGCHAIN_CALL"
        assert recorded[0]["agent"] == "langchain-chain"
        assert recorded[0]["metadata"]["prompt"] == "Direct string prompt for legacy chain"

    def test_langchain_invoke_and_call_produce_different_action_names(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "allowed",
            "is_allowed": True,
            "risk": "low",
            "reason": "Safe Action",
        })
        chain1 = MockLangChainChain()
        chain2 = MockLangChainChain()
        w1 = sentra.wrap_langchain(chain1)
        w2 = sentra.wrap_langchain(chain2)

        w1.invoke({"prompt": "invoke test"})
        w2.call({"prompt": "call test"})

        assert len(recorded) == 2
        req_invoke = recorded[0]
        req_call = recorded[1]
        assert req_invoke["action"] == "LANGCHAIN_INVOKE"
        assert req_call["action"] == "LANGCHAIN_CALL"
        assert req_invoke["action"] != req_call["action"]

    def test_langchain_invoke_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "LangChain invoke blocked by policy",
        })
        chain = MockLangChainChain()
        wrapped = sentra.wrap_langchain(chain)

        with pytest.raises(SentraError) as exc_info:
            wrapped.invoke({"input": "Exfiltrate credentials"})

        assert exc_info.value.status == 403
        assert "[Sentra Blocked]" in str(exc_info.value)
        assert chain.invoke_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "LANGCHAIN_INVOKE"

    def test_langchain_call_block_zero_provider_calls(self) -> None:
        sentra, recorded = _create_mock_sentra({
            "status": "blocked",
            "is_allowed": False,
            "risk": "high",
            "reason": "LangChain call blocked by policy",
        })
        chain = MockLangChainChain()
        wrapped = sentra.wrap_langchain(chain)

        with pytest.raises(SentraError) as exc_info:
            wrapped.call({"input": "Exfiltrate credentials via legacy call"})

        assert exc_info.value.status == 403
        assert chain.call_calls == 0
        assert len(recorded) == 1
        assert recorded[0]["action"] == "LANGCHAIN_CALL"

    def test_langchain_flag_default_block_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Flagged chain run",
        })
        chain = MockLangChainChain()
        wrapped = sentra.wrap_langchain(chain)

        with pytest.raises(SentraError) as exc_info:
            wrapped.invoke({"prompt": "flagged"})

        assert exc_info.value.status == 403
        assert chain.invoke_calls == 0

    def test_langchain_flag_allow_invokes_on_flag_and_provider(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "flagged",
            "is_allowed": False,
            "risk": "medium",
            "reason": "Flagged chain run",
        })
        chain = MockLangChainChain()
        flagged_events: list[ActionResponse] = []
        wrapped = sentra.wrap_langchain(
            chain,
            options=WrapperOptions(agent="custom-lc", flag_mode="allow", on_flag=flagged_events.append),
        )

        result = wrapped.invoke({"prompt": "flagged"})

        assert chain.invoke_calls == 1
        assert len(flagged_events) == 1
        assert flagged_events[0].status == "flagged"
        assert result == {"output": "langchain invoke ok"}

    def test_langchain_rate_limited_makes_zero_calls(self) -> None:
        sentra, _ = _create_mock_sentra({
            "status": "rate_limited",
            "is_allowed": False,
            "risk": "low",
            "reason": "Rate limited chain",
        })
        chain = MockLangChainChain()
        wrapped = sentra.wrap_langchain(chain)

        with pytest.raises(SentraError) as exc_info:
            wrapped.invoke({"prompt": "rl"})

        assert exc_info.value.status == 429
        assert chain.invoke_calls == 0


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

    def test_vertex_async_generate_content_stream_block_zero_provider_calls(self) -> None:
        async def _run() -> None:
            vertex_calls = 0

            class AsyncVertexModels:
                async def generate_content(self, *args: Any, **kwargs: Any) -> Any:
                    nonlocal vertex_calls
                    vertex_calls += 1
                    return {"text": "async vertex ok"}

                async def generate_content_stream(self, *args: Any, **kwargs: Any) -> Any:
                    nonlocal vertex_calls
                    vertex_calls += 1
                    return [{"text": "stream chunk"}]

            class AsyncVertexClient:
                def __init__(self) -> None:
                    class Aio:
                        models = AsyncVertexModels()
                    self.aio = Aio()

            sentra_allow, _ = _create_mock_sentra({
                "status": "allowed",
                "is_allowed": True,
                "risk": "low",
                "reason": "Safe Action",
                "impact": "None",
            })
            v_client = AsyncVertexClient()
            v_wrapped = sentra_allow.wrap_vertex(v_client)
            v_res = await v_wrapped.aio.models.generate_content(model="gemini-2.5-flash", contents="hello async")
            assert vertex_calls == 1
            assert v_res == {"text": "async vertex ok"}

            # Async Vertex block makes zero calls
            sentra_v_block, _ = _create_mock_sentra({
                "status": "blocked",
                "is_allowed": False,
                "risk": "high",
                "reason": "Blocked async vertex",
                "impact": "Blocked",
            })
            vertex_blocked_calls = 0

            class AsyncVertexModelsBlocked:
                async def generate_content_stream(self, *args: Any, **kwargs: Any) -> Any:
                    nonlocal vertex_blocked_calls
                    vertex_blocked_calls += 1
                    return [{"text": "stream chunk"}]

            class AsyncVertexClientBlocked:
                def __init__(self) -> None:
                    class Aio:
                        models = AsyncVertexModelsBlocked()
                    self.aio = Aio()

            v_client_blocked = AsyncVertexClientBlocked()
            v_wrapped_blocked = sentra_v_block.wrap_vertex(v_client_blocked)
            with pytest.raises(SentraError) as exc_v:
                await v_wrapped_blocked.aio.models.generate_content_stream(model="gemini-2.5-flash", contents="blocked")
            assert exc_v.value.status == 403
            assert vertex_blocked_calls == 0

        asyncio.run(_run())

    def test_langchain_async_ainvoke_block_zero_provider_calls(self) -> None:
        async def _run() -> None:
            lc_calls = 0

            class AsyncLangChainChain:
                async def ainvoke(self, *args: Any, **kwargs: Any) -> Any:
                    nonlocal lc_calls
                    lc_calls += 1
                    return {"output": "async ainvoke ok"}

            sentra_allow, _ = _create_mock_sentra({
                "status": "allowed",
                "is_allowed": True,
                "risk": "low",
                "reason": "Safe Action",
                "impact": "None",
            })
            lc_chain = AsyncLangChainChain()
            lc_wrapped = sentra_allow.wrap_langchain(lc_chain)
            lc_res = await lc_wrapped.ainvoke({"input": "async lc"})
            assert lc_calls == 1
            assert lc_res == {"output": "async ainvoke ok"}

            # Async LangChain block makes zero calls
            sentra_lc_block, _ = _create_mock_sentra({
                "status": "blocked",
                "is_allowed": False,
                "risk": "high",
                "reason": "Blocked async lc",
                "impact": "Blocked",
            })
            lc_blocked_calls = 0

            class AsyncLangChainChainBlocked:
                async def ainvoke(self, *args: Any, **kwargs: Any) -> Any:
                    nonlocal lc_blocked_calls
                    lc_blocked_calls += 1
                    return {"output": "blocked"}

            lc_blocked = AsyncLangChainChainBlocked()
            lc_wrapped_blocked = sentra_lc_block.wrap_langchain(lc_blocked)
            with pytest.raises(SentraError) as exc_lc:
                await lc_wrapped_blocked.ainvoke({"input": "blocked async lc"})
            assert exc_lc.value.status == 403
            assert lc_blocked_calls == 0

        asyncio.run(_run())


class TestWrapperEdgeCases:
    def test_none_client_returns_none(self) -> None:
        assert wrap_openai(None) is None
        assert wrap_azure_openai(None) is None
        assert wrap_anthropic(None) is None
        assert wrap_bedrock(None) is None
        assert wrap_vertex(None) is None
        assert wrap_vertex_ai(None) is None
        assert wrap_langchain(None) is None

    def test_already_wrapped_client_not_rewrapped(self) -> None:
        client = MockOpenAIClient()
        first = wrap_openai(client)
        orig_method = first.chat.completions.create
        second = wrap_openai(first)
        assert second is first
        assert second.chat.completions.create is orig_method

        client_b = MockBedrockClient()
        first_b = wrap_bedrock(client_b)
        orig_b = first_b.converse
        second_b = wrap_bedrock(first_b)
        assert second_b is first_b
        assert second_b.converse is orig_b

        client_v = MockVertexClient()
        first_v = wrap_vertex(client_v)
        orig_v = first_v.models.generate_content
        second_v = wrap_vertex(first_v)
        assert second_v is first_v
        assert second_v.models.generate_content is orig_v

        chain_l = MockLangChainChain()
        first_l = wrap_langchain(chain_l)
        orig_l = first_l.invoke
        second_l = wrap_langchain(first_l)
        assert second_l is first_l
        assert second_l.invoke is orig_l

    def test_missing_child_components_safe(self) -> None:
        bare_client = object()
        assert wrap_openai(bare_client) is bare_client
        assert wrap_anthropic(bare_client) is bare_client
        assert wrap_bedrock(bare_client) is bare_client
        assert wrap_vertex(bare_client) is bare_client
        assert wrap_langchain(bare_client) is bare_client

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

        client_b = MockBedrockClient()
        w4 = sentra.wrapBedrock(client_b)
        assert getattr(w4, "__sentra_wrapped__", False) is True

        client_v = MockVertexClient()
        w5 = sentra.wrapVertex(client_v)
        assert getattr(w5, "__sentra_wrapped__", False) is True

        client_v2 = MockVertexClient()
        w6 = sentra.wrapVertexAI(client_v2)
        assert getattr(w6, "__sentra_wrapped__", False) is True

        chain_l = MockLangChainChain()
        w7 = sentra.wrapLangChain(chain_l)
        assert getattr(w7, "__sentra_wrapped__", False) is True

    def test_camel_case_top_level_exports(self) -> None:
        c1 = MockOpenAIClient()
        assert wrapOpenAI(c1) is c1
        c2 = MockOpenAIClient()
        assert wrapAzureOpenAI(c2) is c2
        c3 = MockAnthropicClient()
        assert wrapAnthropic(c3) is c3
        c4 = MockBedrockClient()
        assert wrapBedrock(c4) is c4
        c5 = MockVertexClient()
        assert wrapVertex(c5) is c5
        c6 = MockVertexClient()
        assert wrapVertexAI(c6) is c6
        c7 = MockLangChainChain()
        assert wrapLangChain(c7) is c7

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

        # Bedrock extraction variations
        assert extract_bedrock_prompt(None) == ""
        assert extract_bedrock_prompt({}) == ""
        assert extract_bedrock_prompt("direct string") == "direct string"
        assert extract_bedrock_prompt({"system": [{"text": "bedrock sys"}], "messages": [{"content": [{"text": "bedrock msg"}]}]}) == "bedrock sys\nbedrock msg"
        assert extract_bedrock_prompt({"body": b'{"inputText": "from bytes json"}'}) == "from bytes json"
        assert extract_bedrock_prompt({"body": '{"prompt": "from str json"}'}) == "from str json"
        assert extract_bedrock_prompt({"body": {"prompt": ["line1", "line2"]}}) == "line1\nline2"
        assert extract_bedrock_prompt({"body": {"input": "raw input"}}) == "raw input"

        # Vertex extraction variations
        assert extract_vertex_prompt(None) == ""
        assert extract_vertex_prompt({}) == ""
        assert extract_vertex_prompt("direct vertex") == "direct vertex"
        assert extract_vertex_prompt(["content1", "content2"]) == "content1\ncontent2"
        assert extract_vertex_prompt({"contents": [{"parts": [{"text": "part A"}, {"text": "part B"}]}]}) == "part A\npart B"
        assert extract_vertex_prompt({"config": {"system_instruction": "vertex sys"}, "contents": "user q"}) == "vertex sys\nuser q"

        # LangChain extraction variations
        assert extract_langchain_prompt(None) == ""
        assert extract_langchain_prompt("direct string") == "direct string"
        assert extract_langchain_prompt({"input": "from input"}) == "from input"
        assert extract_langchain_prompt({"prompt": "from prompt"}) == "from prompt"

        class MessageObj:
            content = "msg content"

        assert extract_langchain_prompt(MessageObj()) == "msg content"
        assert "custom_key" in extract_langchain_prompt({"custom_key": 42})

    def test_sentra_client_default_env_construction(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("SENTRA_API_KEY", raising=False)
        client = MockOpenAIClient()
        wrapped = wrap_openai(client)
        assert getattr(wrapped, "__sentra_wrapped__", False) is True
