"""Sentra AI wrappers for OpenAI, Anthropic, and Azure OpenAI clients."""

from __future__ import annotations

import inspect
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

DEFAULT_AGENT_OPENAI = "openai-client"
DEFAULT_AGENT_AZURE = "azure-openai-client"
DEFAULT_AGENT_ANTHROPIC = "anthropic-client"

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


def execute_with_governance(
    check: ActionResponse,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
    original_fn: Callable[..., Any],
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
) -> Any:
    """Evaluate decision and conditionally invoke provider synchronous callable."""
    if check.status == STATUS_RATE_LIMITED:
        raise SentraError(f"{ERR_RATE_LIMITED_PREFIX}{check.reason}", status=429, data=check)

    if check.status == STATUS_BLOCKED:
        raise SentraError(f"{ERR_BLOCKED_PREFIX}{check.reason}", status=403, data=check)

    if check.status == STATUS_FLAGGED:
        if flag_mode == FLAG_MODE_BLOCK:
            raise SentraError(f"{ERR_BLOCKED_PREFIX}{check.reason}", status=403, data=check)
        if callable(on_flag):
            on_flag(check)
        return original_fn(*args, **kwargs)

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
    if check.status == STATUS_RATE_LIMITED:
        raise SentraError(f"{ERR_RATE_LIMITED_PREFIX}{check.reason}", status=429, data=check)

    if check.status == STATUS_BLOCKED:
        raise SentraError(f"{ERR_BLOCKED_PREFIX}{check.reason}", status=403, data=check)

    if check.status == STATUS_FLAGGED:
        if flag_mode == FLAG_MODE_BLOCK:
            raise SentraError(f"{ERR_BLOCKED_PREFIX}{check.reason}", status=403, data=check)
        if callable(on_flag):
            on_flag(check)
        return await original_fn(*args, **kwargs)

    return await original_fn(*args, **kwargs)


def _resolve_sentra_client(sentra_instance: SentraClient | None) -> SentraClient:
    if sentra_instance is not None:
        return sentra_instance
    api_key = os.environ.get("SENTRA_API_KEY")
    key_val = api_key if api_key else SANDBOX_DEMO_KEY
    return SentraClient(api_key=key_val, sandbox=api_key is None)


def _build_interceptor(
    sentra: SentraClient,
    original_fn: Callable[..., Any],
    agent: str,
    action: str,
    flag_mode: str,
    on_flag: Callable[[ActionResponse], None] | None,
    prompt_extractor: Callable[[Any], str],
) -> Callable[..., Any]:
    if inspect.iscoroutinefunction(original_fn):

        async def async_interceptor(*args: Any, **kwargs: Any) -> Any:
            params = _extract_params(args, kwargs)
            prompt = prompt_extractor(params)
            model = _extract_model(params)
            metadata = {
                "model": model,
                "prompt_length": len(prompt),
                "prompt": prompt[:500],
            }
            check = sentra.check_action(agent=agent, action=action, metadata=metadata)
            return await async_execute_with_governance(
                check, flag_mode, on_flag, original_fn, args, kwargs
            )

        return async_interceptor

    def sync_interceptor(*args: Any, **kwargs: Any) -> Any:
        params = _extract_params(args, kwargs)
        prompt = prompt_extractor(params)
        model = _extract_model(params)
        metadata = {
            "model": model,
            "prompt_length": len(prompt),
            "prompt": prompt[:500],
        }
        check = sentra.check_action(agent=agent, action=action, metadata=metadata)
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
) -> None:
    if target_obj is None or not hasattr(target_obj, method_name):
        return
    orig_fn = getattr(target_obj, method_name)
    if not callable(orig_fn):
        return
    wrapped = _build_interceptor(
        sentra, orig_fn, agent, action, flag_mode, on_flag, prompt_extractor
    )
    setattr(target_obj, method_name, wrapped)


def _mark_wrapped(client: Any) -> None:
    try:
        setattr(client, ATTR_SENTRA_WRAPPED, True)
    except (AttributeError, TypeError):
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


wrapOpenAI = wrap_openai
wrapAzureOpenAI = wrap_azure_openai
wrapAnthropic = wrap_anthropic
