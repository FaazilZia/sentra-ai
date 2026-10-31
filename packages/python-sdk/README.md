# sentra-ai (Python SDK)

Enterprise-grade Python SDK for real-time AI governance and runtime security. Intercept AI actions, enforce security policies, and detect risks before execution.

---

## Installation

```bash
pip install sentra-ai
```

---

## Quickstart

### Sandbox Mode (No Registration Required)

Test runtime governance immediately using the explicit sandbox API key (`'sentra_test_sandbox'`). Omitting the API key or passing empty credentials raises an error to prevent accidental unauthenticated calls:

```python
from sentra import SentraClient

sentra = SentraClient(api_key="sentra_test_sandbox")

# Verify a real BLOCKED action
decision = sentra.demo_blocked_action()
print(decision.status)  # "blocked"
print(decision.is_allowed)  # False
print(decision.reason)  # "Action blocked: potentially sensitive data or restricted pattern detected"
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
