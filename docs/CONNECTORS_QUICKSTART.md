# Sentraa AI — Connectors & Alert Integrations Guide

Sentraa AI provides out-of-the-box integrations to stream alerts, incident reports, and blocked agent actions to your organization's workflow and SIEM tools, as well as inbound connectors to scan enterprise data sources for sensitive data and PII.

All alert delivery is processed via an asynchronous queue with exponential backoff retry. Even if an outbound service (e.g., Slack or Jira) experiences an outage, AI agent decision checks never block, slow down, or fail.

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

---

## 3. PostgreSQL Connector (Metadata-Only Scanning)

Scans PostgreSQL database schemas to detect high-risk table definitions, sensitive columns (e.g., unencrypted SSNs, passwords, payment card identifiers), and governance drift.

> [!IMPORTANT]
> **Metadata-Only Guarantee:** Sentraa scans metadata only (tables and columns via `information_schema.columns` and `information_schema.tables`). Sentraa **NEVER** executes `SELECT * FROM table` and **NEVER stores customer row data**.

### Minimum Permissions & Read-Only User Setup
Always connect Sentraa using a dedicated read-only database user:

```sql
-- 1. Create a dedicated read-only user
CREATE USER sentraa_readonly WITH PASSWORD 'your_strong_password_here';

-- 2. Grant connection rights to target database
GRANT CONNECT ON DATABASE your_database_name TO sentraa_readonly;

-- 3. Grant schema usage (default: public, or your specific schema)
GRANT USAGE ON SCHEMA public TO sentraa_readonly;

-- 4. Grant SELECT permission on existing and future tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sentraa_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO sentraa_readonly;
```

### SSRF Protection
Sentraa automatically validates database host addresses before establishing connections:
- Connections to loopback (`127.0.0.0/8`, `localhost`, `::1`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local metadata addresses (`169.254.169.254`), and DNS names resolving to them are **strictly blocked**.
- In local development or isolated test environments, private targets can be permitted by setting `ALLOW_PRIVATE_NETWORK_TARGETS=true`.

### Setup in Sentraa Dashboard
1. Go to **Settings -> Alerts & Connectors** (or **Settings -> General**).
2. Click **Add Connector** and select **PostgreSQL**.
3. Fill in:
   - **Host:** Public database hostname (e.g., `db.yourcompany.com`)
   - **Port:** `5432`
   - **Database:** Your database name
   - **User:** `sentraa_readonly`
   - **Password:** Read-only user password
   - **Schema:** Default `public` (configurable)
4. Click **Test Connection** to verify credentials and SSRF safety.
5. Click **Save Connector**.

---

## 4. Amazon S3 Connector

Inspects files in AWS S3 buckets to identify sensitive data leaks, credentials, and PII in cloud storage.

### Minimum IAM Permissions
Create an IAM policy granting read-only access to only the specific bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::my-company-vault"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::my-company-vault/*"
    }
  ]
}
```

### Setup in Sentraa Dashboard
1. Go to **Settings -> Alerts & Connectors** -> **Add Connector** -> **Amazon S3**.
2. Fill in:
   - **Bucket Name:** `my-company-vault`
   - **Region:** e.g., `us-east-1`
   - **AWS Access Key ID:** IAM user access key
   - **AWS Secret Access Key:** IAM user secret key
3. Click **Test Connection** to verify bucket accessibility.
4. Click **Save Connector**.

---

## 5. Google Drive Connector

Scans Google Drive documents, text files, and shared drives for sensitive tokens, compliance violations, and PII.

### Minimum Scope & Service Account Setup
1. In the Google Cloud Console, create a Service Account (e.g. `sentraa-reader@my-project.iam.gserviceaccount.com`).
2. Generate and download a Service Account JSON Key (`Keys -> Add Key -> Create new key -> JSON`).
3. Enable the **Google Drive API** in your GCP project.
4. In Google Drive, share target folders or drives with your service account email address with **Viewer** permissions.

### Setup in Sentraa Dashboard
1. Go to **Settings -> Alerts & Connectors** -> **Add Connector** -> **Google Drive**.
2. Either click **Upload Service Account JSON** to automatically populate credentials, or paste:
   - **Service Account Client Email:** `sentraa-reader@my-project.iam.gserviceaccount.com`
   - **Private Key:** Paste RSA private key in any format (literal newlines, escaped `\n`, or Windows `\r\n`).
3. Click **Test Connection** to verify API access.
4. Click **Save Connector**.

---

## 6. Slack Inbound Scanner (Workspace Compliance & PII Scanning)

Scans Slack workspace channels and shared documents for sensitive PII (SSNs, credit card numbers, passwords, API tokens) and regulatory compliance violations.

> [!IMPORTANT]
> **Zero Customer Content Storage Guarantee:** Sentraa scans messages and attached files in-memory to detect compliance and PII violations. Sentraa **NEVER stores raw message text or raw file content**. Only detected violation categories, severity, channel metadata, and message timestamps are preserved in the audit log.

### Step-by-Step Slack App Setup
1. Visit the [Slack API App Console](https://api.slack.com/apps) and click **Create New App** -> **From scratch**.
2. Name your app (e.g. `Sentraa Compliance Scanner`) and select your target workspace.
3. In the sidebar, navigate to **OAuth & Permissions**.
4. Scroll to **Scopes** -> **Bot Token Scopes** and add the following least-privilege scopes:
   - `channels:read` — View public channels across the workspace.
   - `channels:history` — Read message history in public channels for compliance scanning.
   - `files:read` — Inspect attached documents and text files for PII.
   - *(Optional for private channels)*: `groups:read` and `groups:history` (only scans private channels where the bot is explicitly invited).
5. Scroll up and click **Install to Workspace** (or **Reinstall to Workspace**).
6. Copy the generated **Bot User OAuth Token** (starts with `xoxb-`).

### Setup in Sentraa Dashboard
1. Go to **Settings -> Alerts & Connectors** (or **Settings -> General**).
2. Under **Inbound Data Connectors**, click **Add Connector** and select **Slack Workspace**.
3. Fill in:
   - **Connector Name:** e.g., `Corporate Slack Workspace`
   - **Bot User OAuth Token:** Paste your Bot User OAuth Token (`xoxb-...`).
   - **Include Private Channels:** Check only if you need to scan private channels and have invited the bot to those channels.
4. Click **Test Connection** to verify workspace connectivity and channel access.
5. Click **Save Connector**.

### Security & Operational Guardrails
- **Credential Encryption:** Bot tokens are encrypted at rest with AES-256-GCM and never returned to the frontend after saving.
- **Rate Limit Resilience:** Automatic HTTP 429 exponential backoff respecting Slack's `Retry-After` header prevents workspace API throttling.
- **Safety Caps & Lookback Window:** Scans are bounded to a default 7-day lookback window, max 25 channels, max 100 messages per channel, and 1MB max file size to avoid resource exhaustion.
- **Deduplication:** Already-scanned messages and bot messages are automatically skipped.

---

## 7. Model Context Protocol (MCP) Gateway Proxy

Sentraa provides an enterprise governance proxy for Model Context Protocol (MCP) clients such as Claude Desktop, Cursor, or external autonomous agents.

### Claude Desktop Setup (`claude_desktop_config.json`)
Add the following configuration to your `claude_desktop_config.json` (located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "sentraa-governance": {
      "url": "https://api.sentraa.ai/api/v1/mcp/proxy",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AGENT_KEY"
      }
    }
  }
}
```

Replace `YOUR_MCP_AGENT_KEY` with an agent key generated in **Settings -> MCP Gateway**. All tool invocations and model actions are intercepted, evaluated against company security policies, and logged to the immutable audit trail.
