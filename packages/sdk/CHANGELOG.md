# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-27

### Added
- `wrapAnthropic`: Intercept Anthropic SDK client `messages.create` calls with pre-flight security evaluation.
- `wrapOpenAI` enhancements: Support for `chat.completions.create` and `responses.create` pre-flight governance.
- `flagMode` option: Support `'block'` (default, throws `SentraError` 403 like blocked) and `'allow'` (calls provider and routes decision to `onFlag`).
- `onFlag` callback: Callback hook for telemetry, audit logging, or alerting when flagged calls execute.
- Double-wrapping guards: Safe handling against wrapping the same OpenAI or Anthropic client instance multiple times.
- Pre-flight streaming evaluation: Validates input parameters on streaming requests (`stream: true`) before passing through native stream without buffering.
- Fail-closed protection: Prevents provider execution whenever Sentra policy blocks or the Sentra API is unreachable.

## 1.0.2
- Added wrapLangChain() — intercepts LangChain chain.call() and chain.invoke() with full governance evaluation

## [1.0.0] - 2026-05-02

### Added
- Initial release of the Sentra AI SDK.
- `SentraClient` for manual guardrail checks.
- `wrapOpenAI` for automatic LLM action monitoring.
- `wrapFetch` for secure API access control.
- `safeAction` helper for simplified governance patterns.
- Exponential backoff and retry logic.
- Fail-closed security strategy.
