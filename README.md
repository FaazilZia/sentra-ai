# Sentra AI — Enterprise AI Governance & Command Center

🚀 **Transform technical AI logs into clear business value and regulatory compliance.**

Sentra AI is a high-performance governance layer that sits between your AI Agents and their execution environment. Unlike traditional security tools, Sentra AI acts as an **Active Interceptor**, mapping technical actions to **Business Impact** and **Legal Compliance** in real-time.

---

### 🌐 Live Production
*   **Production Dashboard**: [https://sentra-ai-tau.vercel.app](https://sentra-ai-tau.vercel.app)
*   **Production API**: `https://sentra-backend-node.onrender.com/api`
*   **Status**: Operational ✅ | **Real-time Engine**: Active ⚡️

---

### 🎯 Core Business Value

👉 **Sentra AI = Your AI Trust Layer**
- **Business Impact Mapping**: Every blocked action explains *what* was prevented (e.g., "Prevents Data Exfiltration").
- **AI Explanation Engine**: Real-time human-readable logic for every governance decision.
- **Visual Action Timeline**: Step-by-step visibility from Agent Request to Decision Enforcement.
- **Simulation & Replay**: Re-run historical actions to verify policy updates and risk scores.
- **Security Score Dashboard**: Proactive 0-100 monitoring of your AI security health.
- **Policy Builder UI**: Rapidly create and deploy governance rules across any AI agent.
- **Compliance Guardrails**: Automatic mapping to **GDPR**, **HIPAA**, **SOC2**, and **DPDP**.
- **Industry Contexts**: Tailored profiles for **Finance**, **Healthcare**, and **Enterprise Startups**.
- **Active ROI Monitoring**: Real-time calculation of potential fines and risks avoided.
- **Audit-Ready Export**: One-click CSV/JSON export of the entire activity trail.

---

### 🏗️ Strategic Architecture

Sentra AI provides a "Control Plane" for the modern AI stack:

1.  **AI Agent** requests an execution (e.g., `send_email`, `read_database`).
2.  **Sentra SDK** intercepts the call and validates it against the **Governance Engine**.
3.  **Real-time Decision**: The engine returns an `ALLOW` or `BLOCK` status based on active policies.
4.  **Value Push**: The dashboard updates instantly via **WebSockets**, showing the Reason, Impact, and Compliance mapping.

---

### 📂 Project Structure

```text
Sentra AI/
├── frontend/                 # "Wow" Dashboard (React + Vite + Socket.io)
├── backend-node/             # Governance Engine (Node.js + Prisma + PostgreSQL)
├── sdk/                      # Universal JS/TS SDK for Agent Interception
└── README.md                 # Product Strategy & Documentation
```

---

### 🚀 Launch Instructions

#### 1. Prerequisites
- Node.js 20+
- PostgreSQL (Supabase recommended)
- OpenAI API Key (Optional, for Sentra Copilot)

#### 2. Backend Engine
```bash
cd backend-node
npm install
npx prisma generate
npx prisma db push
npm run seed     # Seeds business governance data
npm run dev      # Server runs at http://localhost:3000
```

#### 3. Frontend Command Center
```bash
cd frontend
npm install
npm run dev      # Dashboard runs at http://localhost:5173
```

---

### 🛠️ SDK Integration (The "Zero-Latency" Way)

Protecting your AI agents takes less than 10 lines of code:

```typescript
import { SentraClient } from '@sentra/sdk';

const sentra = new SentraClient({
  apiKey: process.env.SENTRA_API_KEY,
  baseUrl: 'https://sentra-backend-node.onrender.com/api'
});

// Intercept before execution
const decision = await sentra.checkAction({
  agent: 'finance-bot',
  action: 'external_api_call',
  metadata: { target: 'competitor.com', payload_size: '50MB' }
});

if (decision.status === 'blocked') {
  // Clear business narrative provided by the engine
  console.error(`Blocked! Reason: ${decision.reason} | Impact: ${decision.impact}`);
  return;
}

// Proceed safely...
```

---

### ✅ Demo Simulation Flow

1.  **Select Industry**: Toggle the **Use Case Selector** to "Healthcare".
2.  **Simulate Risk**: The background engine will simulate a `patient-bot` attempting to `read_pii`.
3.  **Real-time Visibility**: Watch the **Activity Feed** update instantly via WebSockets.
4.  **Verify Impact**: See the specific **GDPR Article** protected and the **ROI counter** increase.
5.  **Audit**: Navigate to **AI Activity Logs** for a cryptographically verified compliance trail.

---

### 📝 License & Attribution
Sentra AI is a state-of-the-art AI governance platform. All rights reserved.
Built for the future of secure AI innovation.
