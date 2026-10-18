# Sentraa AI — Connectors & Alert Integrations Guide

Sentraa AI provides out-of-the-box integrations to stream alerts, incident reports, and blocked agent actions to your organization's workflow and SIEM tools.

All outbound alerts are processed via an asynchronous queue with exponential backoff retry. Even if an outbound service (e.g., Slack or Jira) experiences an outage, AI agent decision checks never block, slow down, or fail.

---

## 1. Slack Connector

Dispatches real-time Block Kit incident cards to a Slack channel when an action is **BLOCKED** or **FLAGGED**.

### Setup in 3 Minutes
1. In your Slack workspace, go to **Apps -> Incoming WebHooks** and create a new incoming webhook.
2. Select the target channel (e.g. `#sentraa-alerts`).
3. In the Sentraa Dashboard under **Settings -> Alerts & Connectors**:
   - Paste the Webhook URL (`https://hooks.slack.com/services/...`).
   - Enter the Channel name (`#sentraa-alerts`).
   - Click **Test Connection** to send a verification card.
   - Click **Save Configuration**.

### Security & Redaction
- Webhook URLs are encrypted at rest using AES-256-GCM.
- Sensitive PII (SSNs, Card numbers, credentials) is automatically redacted before dispatch.

---

## 2. Jira Cloud Connector

Automatically creates structured incident tickets in Atlassian Jira Cloud when an AI agent action is **BLOCKED** with **high risk**.

### Setup in 5 Minutes
1. **Target Project:** Ensure you have a project created in Jira Cloud (e.g. key `SEC` or `AI`).
2. **Generate API Token:** Visit [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens) and create an API token.
   - **Permissions:** The token only needs **`Browse Projects`** and **`Create Issues`** in your target project.
3. In Sentraa Dashboard under **Settings -> Alerts & Connectors**:
   - **Jira Site URL:** `https://your-domain.atlassian.net`
   - **Project Key:** e.g., `SEC`
   - **User Email:** Your Atlassian account email
   - **API Token:** Paste your Atlassian API token
   - **Hourly Cap:** e.g., `10` (default)
4. Click **Test Connection** to verify project access.
5. Click **Save Configuration**.

### Behavior & Guardrails
- **Trigger Policy:** Only actions with `status === 'blocked'` and `risk === 'high'` create Jira tickets. Low-risk or FLAGGED actions do not generate Jira tickets.
- **Strict Deduplication:** Retrying alert delivery jobs will never produce duplicate tickets for the same incident.
- **Hourly Ticket Cap & Overflow Aggregation:** To avoid ticket fatigue during security incidents, Sentraa limits individual tickets per org per hour (default: 10). When the cap is reached:
  - The 11th incident triggers creation of an **Hourly Summary Ticket**.
  - Subsequent incidents in that hour are attached as comments to the summary ticket.
- **PII Scrubbing:** Raw SSNs, credit card numbers, and credentials are scrubbed prior to ADF document generation.
