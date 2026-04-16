# Sentra AI — AI Governance & Control Layer

🚀 **Control what AI agents can do AFTER accessing data.**

Sentra AI is a production-ready AI governance and control platform designed to ensure AI agents operate safely. Unlike data security tools that focus on access control, Sentra AI acts as an **Active Interceptor**, enforcing granular permissions and blocking unsafe AI actions in real-time.

---

### 🌐 Live Production
*   **Production Dashboard**: [https://sentra-ai-tau.vercel.app](https://sentra-ai-tau.vercel.app)
*   **Production API**: `https://sentra-backend-node.onrender.com/api`
*   **Status**: All Systems Nominal ✅

---

## 🎯 Core Value Proposition

👉 **Sentra AI = The AI Firewall**
- **AI Permission Engine**: Define policy-based rules for specific agents.
- **Action Control (Interception)**: Block unsafe actions (e.g., sending emails, external API calls) before they execute.
- **Risk Detection**: Automated detection of high-risk requests based on behavioral patterns and keywords.
- **Activity Logging**: Full audit trail of every AI decision (Allowed vs. Blocked).

---

## 🏗️ Technical Architecture

Sentra AI sits between your AI Application and its execution environment:

1. **AI Agent** requests an action (e.g., `send_email`).
2. **Sentra SDK** intercepts the request and calls the Sentra Backend.
3. **Sentra Governance Engine** checks the requested action against the **Permission Matrix**.
4. **Decision (ALLOW/BLOCK)** is returned to the agent.
5. **Activity Log** is updated for DPO oversight.

---

## 📂 Project Structure

```text
Sentra AI/
├── frontend/                 # React Dashboard for Policy Management & Logs
├── backend-node/             # Node.js + Express Governance Engine
├── sdk/                      # JavaScript/TypeScript SDK for AI integration
└── README.md                 # Project Overview
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- PostgreSQL (Supabase recommended)

### 2. Backend Setup
```bash
cd backend-node
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠️ SDK Integration Example

Integrating Sentra AI into your AI agent is simple:

```javascript
import { SentraClient } from '@sentra/sdk';

const sentra = new SentraClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://sentra-backend-node.onrender.com/api'
});

// Before the agent executes an action:
const decision = await sentra.checkAction({
  agent: 'finance-bot',
  action: 'send_email',
  metadata: { recipient: 'victim@example.com' }
});

if (decision.status === 'blocked') {
  console.error(`Action blocked: ${decision.reason}`);
  return;
}

// Proceed with action...
```

---

## 📡 API Endpoints

### Check AI Action
`POST /api/ai/check-action`
```json
{
  "agent": "finance-bot",
  "action": "send_email"
}
```
**Response:**
```json
{
  "status": "blocked",
  "risk_score": "high",
  "reason": "Policy violation: finance-bot is not allowed to send_email"
}
```

### Fetch Activity Logs
`GET /api/ai/logs`
Returns a list of all intercepted actions and their outcomes.

---

## ✅ Demo Flow

1. **Policy Setup**: Go to the **Governance** page and see the `finance-bot` policy allowing `read_data` but blocking `send_email`.
2. **Action Attempt**: Simulate an AI agent attempting `send_email`.
3. **Real-time Blocking**: The system returns a `blocked` status.
4. **Visibility**: Navigate to **AI Activity Logs** to see the intercepted attempt, time-stamped and risk-scored.

---

## 📝 License
Sentra AI is proprietary software. All rights reserved.
