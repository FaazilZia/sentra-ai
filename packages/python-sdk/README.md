# sentraa-ai (Python SDK)

Enterprise-grade Python SDK for real-time AI governance and runtime security. Intercept AI actions, enforce security policies, and detect risks before execution.

- **Package name on PyPI:** `sentraa-ai`
- **Import names:** `import sentra` or `import sentra_ai`

---

## Install

```bash
# Core SDK (zero heavy dependencies, certifi only)
pip install sentraa-ai
```

> [!NOTE]
> *Pre-publish verification:* Before official PyPI distribution, install the local built wheel:
> `pip install packages/python-sdk/dist/sentraa_ai-0.1.0-py3-none-any.whl`

### Which Extras to Install

Install provider-specific extras to include optional AI client libraries:

| Provider / Framework | Install Command | Included Dependencies |
|---|---|---|
| **OpenAI & Azure OpenAI** | `pip install "sentraa-ai[openai]"` | `openai>=1.0.0` |
| **Anthropic Claude** | `pip install "sentraa-ai[anthropic]"` | `anthropic>=0.18.0` |
| **Amazon Bedrock** | `pip install "sentraa-ai[bedrock]"` | `boto3>=1.28.0` |
| **Google Vertex AI** | `pip install "sentraa-ai[vertex]"` | `google-genai>=0.1.1` (Python >=3.10) |
| **LangChain** | `pip install "sentraa-ai[langchain]"` | `langchain`, `langchain-core`, `langchain-openai` (Python >=3.9) |
| **All Providers** | `pip install "sentraa-ai[all]"` | All optional provider packages above |

> [!NOTE]
> **Provider Testing & Verification Transparency:**
> - **OpenAI, Azure OpenAI, Google Vertex AI, and LangChain:** Verified live against real provider endpoints and the Sentra sandbox.
> - **Amazon Bedrock:** Tested with mocks only because of an upstream AWS account block (Error 002: account blocked / verification required).
> - **Anthropic:** Wrapper interception and governance logic are 100% verified via unit tests and mock suites; the native provider call is untested live because of no API credit.

---

## Quickstart (sandbox)

Test runtime governance immediately using the explicit sandbox API key (`'sentra_test_sandbox'`). Omitting the API key or passing empty credentials raises an error to prevent accidental unauthenticated calls:

```python
from sentra import SentraClient

sentra = SentraClient(api_key="sentra_test_sandbox")

# 1. Verify an ALLOWED action
allowed = sentra.check_action(
    agent="report-bot",
    action="summarize",
    metadata={"prompt": "Please summarize this public quarterly report."},
)
print(allowed.status)      # "allowed"
print(allowed.is_allowed)  # True

# 2. Verify a real BLOCKED action
blocked = sentra.demo_blocked_action()
print(blocked.status)      # "blocked"
print(blocked.is_allowed)  # False
print(blocked.reason)      # "Action blocked: potentially sensitive data or restricted pattern detected"
```

### Production Setup

Initialize using your organization's API key:

```python
import os
from sentra import SentraClient

sentra = SentraClient(api_key=os.environ.get("SENTRA_API_KEY"))
```

---

## Manual Action Check

Evaluate any action before performing sensitive operations:

```python
result = sentra.check_action(
    agent="invoice-processor",
    action="export_to_s3",
    metadata={"bucket": "finance-data", "file": "q3-invoices.csv"},
)

# IMPORTANT: Always check is_allowed or status == 'allowed'
if result.is_allowed:
    export_to_s3(...)
else:
    print(f"Action prevented ({result.status}): {result.reason}")
```

---

## `safe_action` Helper

Execute protected logic only when governance approves:

```python
def send_email():
    return mailer.send(...)

res = sentra.safe_action(
    {"agent": "crm-bot", "action": "send_email", "metadata": {"recipient": "user@example.com"}},
    send_email,
)

if not res["success"]:
    print(f"Action blocked: {res['governance'].reason}")
```

---

## Provider Wrappers (OpenAI, Azure OpenAI, Anthropic, Bedrock, Vertex, LangChain)

Sentra provides zero-friction wrappers for popular AI SDKs. The wrappers intercept pre-flight completions, messages, generation, or chain calls, validate prompts and models against active security policies, and fail closed if blocked.

### OpenAI Wrapper

```python
from openai import OpenAI
from sentra import SentraClient, wrap_openai

sentra = SentraClient(api_key="sentra_test_sandbox")
client = OpenAI()

# Wrap OpenAI instance
guarded_client = sentra.wrap_openai(client, options={"agent": "support-agent"})

# Blocked calls raise SentraError (HTTP 403) before the provider is called (0 provider calls)
completion = guarded_client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarize customer ticket"}],
)
```

### Azure OpenAI Wrapper

```python
from openai import AzureOpenAI
from sentra import wrap_azure_openai

azure_client = AzureOpenAI(
    azure_endpoint="https://my-resource.openai.azure.com",
    api_key="...",
    api_version="2024-10-21",
)

# Top-level helper automatically uses SENTRA_API_KEY from environment
guarded_azure = wrap_azure_openai(azure_client)

completion = guarded_azure.chat.completions.create(
    model="gpt-5-mini-sentraa",
    messages=[{"role": "user", "content": "Hello"}],
)
```

### Anthropic Wrapper

> **Status:** Wrapper logic and pre-flight interception tested via unit/mock suites. Native provider call is untested live because of no API credit.

```python
from anthropic import Anthropic
from sentra import SentraClient, wrap_anthropic

sentra = SentraClient(api_key="sentra_test_sandbox")
anthropic_client = Anthropic()

guarded_anthropic = sentra.wrap_anthropic(
    anthropic_client,
    options={"agent": "research-agent", "flag_mode": "block"},
)

message = guarded_anthropic.messages.create(
    model="claude-haiku-5-5",
    messages=[{"role": "user", "content": "Analyze public dataset"}],
    max_tokens=100,
)
```

### Amazon Bedrock (boto3) Wrapper

> **Status:** Tested with mocks only because of an AWS account block (Error 002: account blocked / verification required).

```python
import boto3
from sentra import SentraClient, wrap_bedrock

sentra = SentraClient(api_key="sentra_test_sandbox")
bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-1")

guarded_bedrock = sentra.wrap_bedrock(
    bedrock_client,
    options={"agent": "bedrock-agent", "flag_mode": "block"},
)

# Intercepts converse, converse_stream, invoke_model, and invoke_model_with_response_stream
response = guarded_bedrock.converse(
    modelId="amazon.nova-lite-v1:0",
    messages=[{"role": "user", "content": [{"text": "Hello world"}]}],
)
```

### Google Vertex AI Wrapper

```python
from google import genai
from sentra import SentraClient, wrap_vertex

sentra = SentraClient(api_key="sentra_test_sandbox")
vertex_client = genai.Client(vertexai=True, project="my-project", location="us-central1")

guarded_vertex = sentra.wrap_vertex(
    vertex_client,
    options={"agent": "vertex-agent", "flag_mode": "block"},
)

# Intercepts client.models.generate_content and generate_content_stream pre-flight
response = guarded_vertex.models.generate_content(
    model="gemini-2.5-flash",
    contents="Hello from Vertex",
)
```

### LangChain Wrapper

```python
from langchain_openai import AzureChatOpenAI
from sentra import SentraClient, wrap_langchain

sentra = SentraClient(api_key="sentra_test_sandbox")
chain = AzureChatOpenAI(...)

guarded_chain = sentra.wrap_langchain(
    chain,
    options={"agent": "langchain-agent", "flag_mode": "block"},
)

# Intercepts chain.invoke() (LANGCHAIN_INVOKE) and chain.call() (LANGCHAIN_CALL)
result = guarded_chain.invoke("Analyze customer issue")
```
