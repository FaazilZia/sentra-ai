"""Sentra AI wrappers for OpenAI, Anthropic, Azure OpenAI, Bedrock, Vertex, and LangChain clients."""

from __future__ import annotations

import inspect
import json
import os
from dataclasses import dataclass
from typing import Any, Callable

from .client import SentraClient
from .exceptions import SentraError
from .models import ActionResponse

STATUS_ALLOWED = "allowed"
STATUS_BLOCKED = "blocked"
STATUS_FLAGGED = "flagged"
STATUS_RATE_LIMITED = "rate_limited"

FLAG_MODE_BLOCK = "block"
FLAG_MODE_ALLOW = "allow"

ERR_BLOCKED_PREFIX = "[Sentra Blocked] "
ERR_RATE_LIMITED_PREFIX = "[Sentra Rate Limited] "

ACTION_OPENAI_CHAT = "OPENAI_CHAT_COMPLETION"
ACTION_OPENAI_RESPONSES = "OPENAI_RESPONSES_CREATE"
ACTION_AZURE_CHAT = "AZURE_OPENAI_CHAT_COMPLETION"
ACTION_AZURE_RESPONSES = "AZURE_OPENAI_RESPONSES_CREATE"
ACTION_ANTHROPIC_MESSAGES = "ANTHROPIC_MESSAGES_CREATE"

ACTION_BEDROCK_CONVERSE = "BEDROCK_CONVERSE"
ACTION_BEDROCK_CONVERSE_STREAM = "BEDROCK_CONVERSE_STREAM"
ACTION_BEDROCK_INVOKE_MODEL = "BEDROCK_INVOKE_MODEL"
ACTION_BEDROCK_INVOKE_MODEL_STREAM = "BEDROCK_INVOKE_MODEL_STREAM"

ACTION_VERTEX_GENERATE_CONTENT = "VERTEX_GENERATE_CONTENT"
ACTION_VERTEX_GENERATE_CONTENT_STREAM = "VERTEX_GENERATE_CONTENT_STREAM"

ACTION_LANGCHAIN_INVOKE = "LANGCHAIN_INVOKE"
ACTION_LANGCHAIN_CALL = "LANGCHAIN_CALL"

DEFAULT_AGENT_OPENAI = "openai-client"
DEFAULT_AGENT_AZURE = "azure-openai-client"
DEFAULT_AGENT_ANTHROPIC = "anthropic-client"
DEFAULT_AGENT_BEDROCK = "bedrock-client"
DEFAULT_AGENT_VERTEX = "vertex-client"
DEFAULT_AGENT_LANGCHAIN = "langchain-chain"

ATTR_SENTRA_WRAPPED = "__sentra_wrapped__"
SANDBOX_DEMO_KEY = "sentra_test_sandbox"


@dataclass
class WrapperOptions:
    """Configuration options for provider wrappers."""

    agent: str | None = None
    flag_mode: str = FLAG_MODE_BLOCK
    on_flag: Callable[[ActionResponse], None] | None = None

    def __getitem__(self, key: str) -> Any:
        mapping = {
            "agent": self.agent,
            "flag_mode": self.flag_mode,
            "flagMode": self.flag_mode,
            "on_flag": self.on_flag,
            "onFlag": self.on_flag,
        }
        if key in mapping:
            return mapping[key]
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default


def extract_content_text(content: Any) -> str:
    """Extract plain text string from varying content block shapes."""
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    texts: list[str] = []
    for item in content:
        if isinstance(item, str):
            texts.append(item)
        elif isinstance(item, dict):
            text_val = item.get("text")
            if isinstance(text_val, str) and text_val:
                texts.append(text_val)
        else:
            attr_text = getattr(item, "text", None)
            if isinstance(attr_text, str) and attr_text:
                texts.append(attr_text)
    return "\n".join(texts)


def extract_openai_prompt(params: Any) -> str:
    """Extract prompt text from OpenAI request parameters."""
    if not params:
        return ""
    prompt_val = params.get("prompt") if isinstance(params, dict) else getattr(params, "prompt", None)
    if isinstance(prompt_val, str):
        return prompt_val
    if isinstance(prompt_val, list):
        return "\n".join(str(p) for p in prompt_val)

    messages = params.get("messages") if isinstance(params, dict) else getattr(params, "messages", None)
    if not isinstance(messages, list):
        return ""

    texts: list[str] = []
    for msg in messages:
        content = msg.get("content") if isinstance(msg, dict) else getattr(msg, "content", None)
        text = extract_content_text(content)
        if text:
            texts.append(text)
    return "\n".join(texts)


def extract_anthropic_prompt(params: Any) -> str:
    """Extract prompt text from Anthropic request parameters."""
    if not params:
        return ""
    system_val = params.get("system") if isinstance(params, dict) else getattr(params, "system", None)
    system_text = extract_content_text(system_val)

    messages = params.get("messages") if isinstance(params, dict) else getattr(params, "messages", None)
    messages_text = ""
    if isinstance(messages, list):
        texts: list[str] = []
        for msg in messages:
            content = msg.get("content") if isinstance(msg, dict) else getattr(msg, "content", None)
            text = extract_content_text(content)
            if text:
                texts.append(text)
        messages_text = "\n".join(texts)

    if system_text and messages_text:
        return f"{system_text}\n{messages_text}"
    return system_text or messages_text or ""


def _extract_text_field(item: Any) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        text_val = item.get("text")
        if isinstance(text_val, str) and text_val:
            return text_val
        return ""
    attr_text = getattr(item, "text", None)
    if isinstance(attr_text, str) and attr_text:
        return attr_text
    return ""


def _extract_bedrock_system_text(system_raw: Any) -> str:
    if isinstance(system_raw, str):
        return system_raw
    if isinstance(system_raw, list):
        blocks = [_extract_text_field(item) for item in system_raw]
        return "\n".join(b for b in blocks if b)
    if system_raw is not None:
        return _extract_text_field(system_raw)
    return ""


def _extract_bedrock_message_content(content: Any) -> list[str]:
    if isinstance(content, str):
        return [content]
    if isinstance(content, list):
        return [b for item in content if (b := _extract_text_field(item))]
    return []


def _extract_bedrock_messages_text(messages_raw: Any) -> str:
    if not isinstance(messages_raw, list):
        return ""
    msg_blocks: list[str] = []
    for msg in messages_raw:
        if not msg:
            continue
        if isinstance(msg, str):
            msg_blocks.append(msg)
            continue
        content = msg.get("content") if isinstance(msg, dict) else getattr(msg, "content", None)
        msg_blocks.extend(_extract_bedrock_message_content(content))
    return "\n".join(msg_blocks)


def _extract_bedrock_converse_text(input_data: Any) -> str:
    if not input_data:
        return ""
    system_raw = (
        input_data.get("system") if isinstance(input_data, dict) else getattr(input_data, "system", None)
    )
    system_text = _extract_bedrock_system_text(system_raw)

    messages_raw = (
        input_data.get("messages")
        if isinstance(input_data, dict)
        else getattr(input_data, "messages", None)
    )
    messages_text = _extract_bedrock_messages_text(messages_raw)

    if system_text and messages_text:
        return f"{system_text}\n{messages_text}"
    return system_text or messages_text or ""


def _extract_bedrock_body_dict(body: dict[str, Any]) -> str:
    input_text = body.get("inputText")
    if isinstance(input_text, str):
        return input_text
    prompt_val = body.get("prompt")
    if isinstance(prompt_val, str):
        return prompt_val
    if isinstance(prompt_val, list):
        return "\n".join(str(p) for p in prompt_val)
    if isinstance(body.get("messages"), list):
        return _extract_bedrock_converse_text(body)
    raw_input = body.get("input")
    if isinstance(raw_input, str):
        return raw_input
    if isinstance(raw_input, dict):
        return _extract_bedrock_converse_text(raw_input)
    return ""


def _extract_bedrock_invoke_text(body_data: Any) -> str:
    if not body_data:
        return ""
    body = body_data
    if isinstance(body, (bytes, bytearray)):
        body = body.decode("utf-8", errors="replace")
    if isinstance(body, str):
        try:
            parsed = json.loads(body)
            body = parsed if isinstance(parsed, dict) else body
        except Exception:
            return body

    if isinstance(body, dict):
        return _extract_bedrock_body_dict(body)
    return ""


def extract_bedrock_prompt(params: Any) -> str:
    """Extract prompt text from Amazon Bedrock request parameters."""
    if not params:
        return ""
    if isinstance(params, str):
        return params

    has_messages = (isinstance(params, dict) and "messages" in params) or hasattr(params, "messages")
    has_system = (isinstance(params, dict) and "system" in params) or hasattr(params, "system")
    if has_messages or has_system:
        return _extract_bedrock_converse_text(params)

    has_body = (isinstance(params, dict) and "body" in params) or hasattr(params, "body")
    if has_body:
        body = params.get("body") if isinstance(params, dict) else getattr(params, "body", None)
        return _extract_bedrock_invoke_text(body)

    return _extract_bedrock_invoke_text(params)


def _extract_vertex_part(part: Any) -> str:
    if isinstance(part, str):
        return part
    if isinstance(part, dict):
        text_val = part.get("text")
        if isinstance(text_val, str):
            return text_val
    attr_text = getattr(part, "text", None)
    if isinstance(attr_text, str):
        return attr_text
    return ""


def _extract_vertex_item_text(item: Any) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        text_val = item.get("text")
        if isinstance(text_val, str) and text_val:
            return text_val
        parts = item.get("parts")
        if isinstance(parts, list):
            return "\n".join(_extract_vertex_part(p) for p in parts if _extract_vertex_part(p))
        return ""
    attr_text = getattr(item, "text", None)
    if isinstance(attr_text, str) and attr_text:
        return attr_text
    attr_parts = getattr(item, "parts", None)
    if isinstance(attr_parts, list):
        return "\n".join(_extract_vertex_part(p) for p in attr_parts if _extract_vertex_part(p))
    return ""


def extract_vertex_content_text(contents: Any) -> str:
    """Extract plain text string from Vertex contents structure."""
    if not contents:
        return ""
    if isinstance(contents, str):
        return contents
    if isinstance(contents, list):
        texts = [_extract_vertex_item_text(item) for item in contents]
        return "\n".join(t for t in texts if t)
    return _extract_vertex_item_text(contents)


def _extract_vertex_sys_instruction(params: Any) -> Any:
    config = params.get("config") if isinstance(params, dict) else getattr(params, "config", None)
    sys_instruction = None
    if config is not None:
        sys_instruction = (
            config.get("system_instruction")
            if isinstance(config, dict)
            else getattr(config, "system_instruction", None)
        )
        if sys_instruction is None:
            sys_instruction = (
                config.get("systemInstruction")
                if isinstance(config, dict)
                else getattr(config, "systemInstruction", None)
            )

    if sys_instruction is None:
        sys_instruction = (
            params.get("system_instruction")
            if isinstance(params, dict)
            else getattr(params, "system_instruction", None)
        )
    if sys_instruction is None:
        sys_instruction = (
            params.get("systemInstruction")
            if isinstance(params, dict)
            else getattr(params, "systemInstruction", None)
        )
    return sys_instruction


def _extract_vertex_contents_text(params: Any) -> str:
    contents_raw = None
    if isinstance(params, dict):
        contents_raw = params.get("contents") or params.get("prompt") or params.get("text")
    else:
        contents_raw = (
            getattr(params, "contents", None)
            or getattr(params, "prompt", None)
            or getattr(params, "text", None)
        )
    return extract_vertex_content_text(contents_raw) if contents_raw is not None else ""


def extract_vertex_prompt(params: Any) -> str:
    """Extract prompt text from Google Vertex AI request parameters."""
    if not params:
        return ""
    if isinstance(params, str):
        return params
    if isinstance(params, list):
        return extract_vertex_content_text(params)

    sys_instruction = _extract_vertex_sys_instruction(params)
    system_text = extract_vertex_content_text(sys_instruction) if sys_instruction else ""
    contents_text = _extract_vertex_contents_text(params)

    if system_text and contents_text:
        return f"{system_text}\n{contents_text}"
    return system_text or contents_text or ""


def _extract_langchain_dict_prompt(params: dict[str, Any]) -> str:
    if "prompt" in params and isinstance(params["prompt"], str):
        return params["prompt"]
    if "input" in params and isinstance(params["input"], str):
        return params["input"]
    try:
        return json.dumps(params, default=str)
    except Exception:
        return str(params)


def extract_langchain_prompt(params: Any) -> str:
    """Extract prompt text from LangChain input arguments."""
    if not params:
        return ""
    if isinstance(params, str):
        return params
    attr_content = getattr(params, "content", None)
    if isinstance(attr_content, str):
        return attr_content
    attr_text = getattr(params, "text", None)
    if isinstance(attr_text, str):
        return attr_text
    if isinstance(params, dict):
        return _extract_langchain_dict_prompt(params)
    if isinstance(params, list):
        items = [extract_langchain_prompt(p) for p in params]
        return "\n".join(t for t in items if t)
    try:
        return json.dumps(params, default=str)
    except Exception:
        return str(params)


def _extract_params(args: tuple[Any, ...], kwargs: dict[str, Any]) -> Any:
    if args:
        if isinstance(args[0], dict):
            merged = dict(args[0])
            merged.update(kwargs)
            return merged
        if not kwargs:
            return args[0]
    return kwargs


def _extract_model(params: Any) -> Any:
    if isinstance(params, dict):
        return params.get("model")
    return getattr(params, "model", None)


def _extract_bedrock_model(params: Any) -> str | None:
    if isinstance(params, dict):
        model = params.get("modelId") or params.get("model_id") or params.get("model")
        return str(model) if model else None
    model = (
        getattr(params, "modelId", None)
        or getattr(params, "model_id", None)
        or getattr(params, "model", None)
    )
    return str(model) if model else None


def _extract_vertex_model(params: Any, client_obj: Any = None, target: Any = None) -> str | None:
    model = params.get("model") if isinstance(params, dict) else getattr(params, "model", None)
    if model:
        return str(model)
    for obj in (client_obj, target):
        if obj is not None:
            attr_model = getattr(obj, "model", None) or getattr(obj, "_model", None)
            if attr_model:
                return str(attr_model)
    return None


def _resolve_options(
    options: WrapperOptions | dict[str, Any] | None, kwargs: dict[str, Any]
) -> tuple[str | None, str, Callable[[ActionResponse], None] | None]:
    if isinstance(options, WrapperOptions):
        opt_agent = options.agent
        opt_flag_mode = options.flag_mode
        opt_on_flag = options.on_flag
    elif isinstance(options, dict):
        opt_agent = options.get("agent")
        opt_flag_mode = options.get("flag_mode") or options.get("flagMode") or FLAG_MODE_BLOCK
        opt_on_flag = options.get("on_flag") or options.get("onFlag")
    else:
        opt_agent = kwargs.get("agent")
        opt_flag_mode = kwargs.get("flag_mode") or kwargs.get("flagMode") or FLAG_MODE_BLOCK
        opt_on_flag = kwargs.get("on_flag") or kwargs.get("onFlag")
    return opt_agent, opt_flag_mode, opt_on_flag


def _evaluate_decision(
    check: ActionResponse,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
) -> None:
    if check.status == STATUS_RATE_LIMITED:
        raise SentraError(f"{ERR_RATE_LIMITED_PREFIX}{check.reason}", status=429, data=check)

    if check.status == STATUS_BLOCKED:
        raise SentraError(f"{ERR_BLOCKED_PREFIX}{check.reason}", status=403, data=check)

    if check.status == STATUS_FLAGGED:
        if flag_mode == FLAG_MODE_BLOCK:
            raise SentraError(f"{ERR_BLOCKED_PREFIX}{check.reason}", status=403, data=check)
        if callable(on_flag):
            on_flag(check)


def execute_with_governance(
    check: ActionResponse,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
    original_fn: Callable[..., Any],
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
) -> Any:
    """Evaluate decision and conditionally invoke provider synchronous callable."""
    _evaluate_decision(check, flag_mode, on_flag)
    return original_fn(*args, **kwargs)


async def async_execute_with_governance(
    check: ActionResponse,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
    original_fn: Callable[..., Any],
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
) -> Any:
    """Evaluate decision and conditionally invoke provider asynchronous coroutine."""
    _evaluate_decision(check, flag_mode, on_flag)
    return await original_fn(*args, **kwargs)


def _resolve_sentra_client(sentra_instance: SentraClient | None) -> SentraClient:
    if sentra_instance is not None:
        return sentra_instance
    api_key = os.environ.get("SENTRA_API_KEY")
    key_val = api_key if api_key else SANDBOX_DEMO_KEY
    return SentraClient(api_key=key_val, sandbox=api_key is None)


def _prepare_action_check(
    sentra: SentraClient,
    agent: str,
    action: str,
    prompt: str,
    model: Any = None,
) -> ActionResponse:
    metadata: dict[str, Any] = {
        "prompt_length": len(prompt),
        "prompt": prompt[:500],
    }
    if model is not None:
        metadata["model"] = model
    return sentra.check_action(agent=agent, action=action, metadata=metadata)


def _build_interceptor(
    sentra: SentraClient,
    original_fn: Callable[..., Any],
    agent: str,
    action: str,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
    prompt_extractor: Callable[[Any], str],
    model_extractor: Callable[[Any], Any] | None = None,
) -> Callable[..., Any]:
    def _create_check(args: tuple[Any, ...], kwargs: dict[str, Any]) -> ActionResponse:
        params = _extract_params(args, kwargs)
        prompt = prompt_extractor(params)
        model = model_extractor(params) if model_extractor else _extract_model(params)
        return _prepare_action_check(sentra, agent, action, prompt, model)

    if inspect.iscoroutinefunction(original_fn):

        async def async_interceptor(*args: Any, **kwargs: Any) -> Any:
            check = _create_check(args, kwargs)
            return await async_execute_with_governance(
                check, flag_mode, on_flag, original_fn, args, kwargs
            )

        return async_interceptor

    def sync_interceptor(*args: Any, **kwargs: Any) -> Any:
        check = _create_check(args, kwargs)
        return execute_with_governance(check, flag_mode, on_flag, original_fn, args, kwargs)

    return sync_interceptor


def _patch_child_method(
    target_obj: Any,
    method_name: str,
    sentra: SentraClient,
    agent: str,
    action: str,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
    prompt_extractor: Callable[[Any], str],
    model_extractor: Callable[[Any], Any] | None = None,
) -> None:
    if target_obj is None or not hasattr(target_obj, method_name):
        return
    orig_fn = getattr(target_obj, method_name)
    if not callable(orig_fn):
        return
    wrapped = _build_interceptor(
        sentra, orig_fn, agent, action, flag_mode, on_flag, prompt_extractor, model_extractor
    )
    try:
        setattr(target_obj, method_name, wrapped)
    except (ValueError, TypeError, AttributeError):
        object.__setattr__(target_obj, method_name, wrapped)


def _mark_wrapped(client: Any) -> None:
    try:
        setattr(client, ATTR_SENTRA_WRAPPED, True)
    except (AttributeError, TypeError, ValueError):
        try:
            object.__setattr__(client, ATTR_SENTRA_WRAPPED, True)
        except Exception:
            pass


def _wrap_openai_compatible(
    client: Any,
    options: WrapperOptions | dict[str, Any] | None,
    sentra_instance: SentraClient | None,
    action_chat: str,
    action_responses: str,
    default_agent: str,
    **kwargs: Any,
) -> Any:
    if client is None or getattr(client, ATTR_SENTRA_WRAPPED, False):
        return client

    sentra = _resolve_sentra_client(sentra_instance)
    opt_agent, flag_mode, on_flag = _resolve_options(options, kwargs)
    agent = opt_agent or default_agent

    chat_obj = getattr(client, "chat", None)
    completions_obj = getattr(chat_obj, "completions", None) if chat_obj else None
    _patch_child_method(
        completions_obj, "create", sentra, agent, action_chat, flag_mode, on_flag, extract_openai_prompt
    )

    responses_obj = getattr(client, "responses", None)
    _patch_child_method(
        responses_obj, "create", sentra, agent, action_responses, flag_mode, on_flag, extract_openai_prompt
    )

    _mark_wrapped(client)
    return client


def wrap_openai(
    client: Any,
    options: WrapperOptions | dict[str, Any] | None = None,
    sentra_instance: SentraClient | None = None,
    **kwargs: Any,
) -> Any:
    """Intercept OpenAI client requests for runtime safety and governance."""
    return _wrap_openai_compatible(
        client,
        options,
        sentra_instance,
        action_chat=ACTION_OPENAI_CHAT,
        action_responses=ACTION_OPENAI_RESPONSES,
        default_agent=DEFAULT_AGENT_OPENAI,
        **kwargs,
    )


def wrap_azure_openai(
    client: Any,
    options: WrapperOptions | dict[str, Any] | None = None,
    sentra_instance: SentraClient | None = None,
    **kwargs: Any,
) -> Any:
    """Intercept Azure OpenAI client requests for runtime safety and governance."""
    return _wrap_openai_compatible(
        client,
        options,
        sentra_instance,
        action_chat=ACTION_AZURE_CHAT,
        action_responses=ACTION_AZURE_RESPONSES,
        default_agent=DEFAULT_AGENT_AZURE,
        **kwargs,
    )


def wrap_anthropic(
    client: Any,
    options: WrapperOptions | dict[str, Any] | None = None,
    sentra_instance: SentraClient | None = None,
    **kwargs: Any,
) -> Any:
    """Intercept Anthropic client requests for runtime safety and governance."""
    if client is None or getattr(client, ATTR_SENTRA_WRAPPED, False):
        return client

    sentra = _resolve_sentra_client(sentra_instance)
    opt_agent, flag_mode, on_flag = _resolve_options(options, kwargs)
    agent = opt_agent or DEFAULT_AGENT_ANTHROPIC

    messages_obj = getattr(client, "messages", None)
    _patch_child_method(
        messages_obj,
        "create",
        sentra,
        agent,
        ACTION_ANTHROPIC_MESSAGES,
        flag_mode,
        on_flag,
        extract_anthropic_prompt,
    )

    _mark_wrapped(client)
    return client


def _get_bedrock_command_action(command: Any) -> str:
    name = getattr(command, "constructorName", None) or type(command).__name__
    if "Converse" in name and "Stream" in name:
        return ACTION_BEDROCK_CONVERSE_STREAM
    if "Converse" in name:
        return ACTION_BEDROCK_CONVERSE
    if "Stream" in name or "ResponseStream" in name:
        return ACTION_BEDROCK_INVOKE_MODEL_STREAM
    return ACTION_BEDROCK_INVOKE_MODEL


def _prepare_bedrock_send_check(
    sentra: SentraClient,
    agent: str,
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
) -> ActionResponse:
    cmd = args[0] if args else kwargs.get("command")
    action = _get_bedrock_command_action(cmd)
    cmd_input = getattr(cmd, "input", cmd)
    prompt = extract_bedrock_prompt(cmd_input)
    model = _extract_bedrock_model(cmd_input)
    return _prepare_action_check(sentra, agent, action, prompt, model)


def _patch_bedrock_send(
    client: Any,
    sentra: SentraClient,
    agent: str,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
) -> None:
    orig_send = getattr(client, "send", None)
    if not callable(orig_send):
        return

    if inspect.iscoroutinefunction(orig_send):

        async def async_send_interceptor(*args: Any, **kwargs: Any) -> Any:
            check = _prepare_bedrock_send_check(sentra, agent, args, kwargs)
            return await async_execute_with_governance(
                check, flag_mode, on_flag, orig_send, args, kwargs
            )

        client.send = async_send_interceptor
    else:

        def sync_send_interceptor(*args: Any, **kwargs: Any) -> Any:
            check = _prepare_bedrock_send_check(sentra, agent, args, kwargs)
            return execute_with_governance(check, flag_mode, on_flag, orig_send, args, kwargs)

        client.send = sync_send_interceptor


def wrap_bedrock(
    client: Any,
    options: WrapperOptions | dict[str, Any] | None = None,
    sentra_instance: SentraClient | None = None,
    **kwargs: Any,
) -> Any:
    """Intercept Amazon Bedrock boto3 client requests for runtime safety and governance."""
    if client is None or getattr(client, ATTR_SENTRA_WRAPPED, False):
        return client

    sentra = _resolve_sentra_client(sentra_instance)
    opt_agent, flag_mode, on_flag = _resolve_options(options, kwargs)
    agent = opt_agent or DEFAULT_AGENT_BEDROCK

    boto3_methods = [
        ("converse", ACTION_BEDROCK_CONVERSE),
        ("converse_stream", ACTION_BEDROCK_CONVERSE_STREAM),
        ("invoke_model", ACTION_BEDROCK_INVOKE_MODEL),
        ("invoke_model_with_response_stream", ACTION_BEDROCK_INVOKE_MODEL_STREAM),
    ]

    has_any = False
    for method_name, action in boto3_methods:
        if hasattr(client, method_name) and callable(getattr(client, method_name)):
            _patch_child_method(
                client,
                method_name,
                sentra,
                agent,
                action,
                flag_mode,
                on_flag,
                extract_bedrock_prompt,
                _extract_bedrock_model,
            )
            has_any = True

    if hasattr(client, "send") and callable(getattr(client, "send")):
        _patch_bedrock_send(client, sentra, agent, flag_mode, on_flag)
        has_any = True

    if not has_any:
        return client

    _mark_wrapped(client)
    return client


def _patch_vertex_target(
    target: Any,
    sentra: SentraClient,
    agent: str,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
    client_obj: Any,
) -> bool:
    content_methods = ["generate_content", "generateContent"]
    stream_methods = ["generate_content_stream", "generateContentStream"]

    patched = False
    for m in content_methods:
        if hasattr(target, m) and callable(getattr(target, m)):
            _patch_child_method(
                target,
                m,
                sentra,
                agent,
                ACTION_VERTEX_GENERATE_CONTENT,
                flag_mode,
                on_flag,
                extract_vertex_prompt,
                lambda p: _extract_vertex_model(p, client_obj, target),
            )
            patched = True

    for m in stream_methods:
        if hasattr(target, m) and callable(getattr(target, m)):
            _patch_child_method(
                target,
                m,
                sentra,
                agent,
                ACTION_VERTEX_GENERATE_CONTENT_STREAM,
                flag_mode,
                on_flag,
                extract_vertex_prompt,
                lambda p: _extract_vertex_model(p, client_obj, target),
            )
            patched = True

    return patched


def wrap_vertex(
    client: Any,
    options: WrapperOptions | dict[str, Any] | None = None,
    sentra_instance: SentraClient | None = None,
    **kwargs: Any,
) -> Any:
    """Intercept Google Vertex AI requests for runtime safety and governance."""
    if client is None or getattr(client, ATTR_SENTRA_WRAPPED, False):
        return client

    sentra = _resolve_sentra_client(sentra_instance)
    opt_agent, flag_mode, on_flag = _resolve_options(options, kwargs)
    agent = opt_agent or DEFAULT_AGENT_VERTEX

    models_obj = getattr(client, "models", None)
    aio_obj = getattr(client, "aio", None)
    aio_models_obj = getattr(aio_obj, "models", None) if aio_obj else None

    has_models = False
    if models_obj is not None:
        has_models = _patch_vertex_target(models_obj, sentra, agent, flag_mode, on_flag, client)
        if has_models:
            _mark_wrapped(models_obj)

    has_aio_models = False
    if aio_models_obj is not None:
        has_aio_models = _patch_vertex_target(aio_models_obj, sentra, agent, flag_mode, on_flag, client)
        if has_aio_models:
            _mark_wrapped(aio_models_obj)

    has_direct = _patch_vertex_target(client, sentra, agent, flag_mode, on_flag, client)

    if not (has_models or has_aio_models or has_direct):
        return client

    _mark_wrapped(client)
    return client


def wrap_langchain(
    chain: Any,
    options: WrapperOptions | dict[str, Any] | None = None,
    sentra_instance: SentraClient | None = None,
    **kwargs: Any,
) -> Any:
    """Intercept LangChain chain/runnable requests for runtime safety and governance."""
    if chain is None or getattr(chain, ATTR_SENTRA_WRAPPED, False):
        return chain

    has_call = callable(getattr(chain, "call", None))
    has_invoke = callable(getattr(chain, "invoke", None))
    has_ainvoke = callable(getattr(chain, "ainvoke", None))

    if not (has_call or has_invoke or has_ainvoke):
        return chain

    sentra = _resolve_sentra_client(sentra_instance)
    opt_agent, flag_mode, on_flag = _resolve_options(options, kwargs)
    agent = opt_agent or DEFAULT_AGENT_LANGCHAIN

    if has_call:
        _patch_child_method(
            chain,
            "call",
            sentra,
            agent,
            ACTION_LANGCHAIN_CALL,
            flag_mode,
            on_flag,
            extract_langchain_prompt,
        )

    if has_invoke:
        _patch_child_method(
            chain,
            "invoke",
            sentra,
            agent,
            ACTION_LANGCHAIN_INVOKE,
            flag_mode,
            on_flag,
            extract_langchain_prompt,
        )

    if has_ainvoke:
        _patch_child_method(
            chain,
            "ainvoke",
            sentra,
            agent,
            ACTION_LANGCHAIN_INVOKE,
            flag_mode,
            on_flag,
            extract_langchain_prompt,
        )

    _mark_wrapped(chain)
    return chain


wrapOpenAI = wrap_openai
wrapAzureOpenAI = wrap_azure_openai
wrapAnthropic = wrap_anthropic
wrapBedrock = wrap_bedrock
wrapVertex = wrap_vertex
wrap_vertex_ai = wrap_vertex
wrapVertexAI = wrap_vertex
wrapLangChain = wrap_langchain
