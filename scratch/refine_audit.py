import os
import re
import subprocess
import json

WORKSPACE = "/Users/mohammadfaazilzia/Desktop/Sentra AI"

# Map symbols to their exact defining files relative to workspace
def_files = {
    # api_exports
    "fetchPolicyTemplates": "frontend/src/lib/api.ts",
    "duplicatePolicyTemplate": "frontend/src/lib/api.ts",
    "fetchPolicyById": "frontend/src/lib/api.ts",
    "createPolicy": "frontend/src/lib/api.ts",
    "fetchPolicyVersions": "frontend/src/lib/api.ts",
    "fetchPolicyHealth": "frontend/src/lib/api.ts",
    "fetchViolations": "frontend/src/lib/api.ts",
    "updateIncidentStatus": "frontend/src/lib/api.ts",
    "fetchAIActivityLogs": "frontend/src/lib/api.ts",
    "replayAction": "frontend/src/lib/api.ts",
    "createAIAgent": "frontend/src/lib/api.ts",
    "deleteAIAgent": "frontend/src/lib/api.ts",
    "fetchAuditProof": "frontend/src/lib/api.ts",
    "fetchFixTasks": "frontend/src/lib/api.ts",
    "createFixTasks": "frontend/src/lib/api.ts",
    "uploadEvidence": "frontend/src/lib/api.ts",
    "reEvaluateCompliance": "frontend/src/lib/api.ts",
    "fetchComplianceHistory": "frontend/src/lib/api.ts",
    "fetchAuditLogs": "frontend/src/lib/api.ts",
    "createAlertRule": "frontend/src/lib/api.ts",
    "fetchAlertRules": "frontend/src/lib/api.ts",
    "fetchAlerts": "frontend/src/lib/api.ts",
    "markAlertRead": "frontend/src/lib/api.ts",
    "exportComplianceReport": "frontend/src/lib/api.ts",
    "sendAIRequest": "frontend/src/lib/api.ts",
    "fetchGuardrailLogs": "frontend/src/lib/api.ts",
    "exportGuardrailLogs": "frontend/src/lib/api.ts",
    "fetchGuardrailOverrides": "frontend/src/lib/api.ts",
    "requestGuardrailOverride": "frontend/src/lib/api.ts",
    "approveGuardrailOverride": "frontend/src/lib/api.ts",
    "fetchSecurityScore": "frontend/src/lib/api.ts",
    "askAI": "frontend/src/lib/api.ts",
    "chatWithCopilot": "frontend/src/lib/api.ts",
    "fetchBackendHealth": "frontend/src/lib/api.ts",
    "createApiKey": "frontend/src/lib/api.ts",
    "deleteApiKey": "frontend/src/lib/api.ts",
    "triggerScan": "frontend/src/lib/api.ts",
    "fetchScanStatus": "frontend/src/lib/api.ts",
    "fetchConnectors": "frontend/src/lib/api.ts",
    "fetchScans": "frontend/src/lib/api.ts",
    "fetchRiskData": "frontend/src/lib/api.ts",
    "fetchExecutiveMetrics": "frontend/src/lib/api.ts",
    "fetchTopAttackPatterns": "frontend/src/lib/api.ts",
    "fetchRiskTrend": "frontend/src/lib/api.ts",
    "createConnector": "frontend/src/lib/api.ts",
    "fetchExecutiveOverview": "frontend/src/lib/api.ts",
    "updateAlertSettings": "frontend/src/lib/api.ts",
    "testAlert": "frontend/src/lib/api.ts",
    "fetchAgentRiskScore": "frontend/src/lib/api.ts",
    "uploadEuAiActEvidence": "frontend/src/lib/api.ts",
    "fetchLifecycleInfo": "frontend/src/lib/api.ts",
    "transitionModelStage": "frontend/src/lib/api.ts",
    "fetchFriaAssessments": "frontend/src/lib/api.ts",
    "fetchFriaAssessment": "frontend/src/lib/api.ts",
    "createFriaAssessment": "frontend/src/lib/api.ts",

    # UI Components
    "AuditSnapshot": "frontend/src/components/executive/AuditSnapshot.tsx",
    "GlobalControlPanel": "frontend/src/components/executive/GlobalControlPanel.tsx",
    "SystemModeIndicator": "frontend/src/components/executive/SystemModeIndicator.tsx",
    "ActiveRiskEvents": "frontend/src/components/risk/ActiveRiskEvents.tsx",
    "RiskExposurePanel": "frontend/src/components/risk/RiskExposurePanel.tsx",
    "RiskHeatmap": "frontend/src/components/risk/RiskHeatmap.tsx",
    "RiskOwnership": "frontend/src/components/risk/RiskOwnership.tsx",
    "RiskPosture": "frontend/src/components/risk/RiskPosture.tsx",
    "GaugeChart": "frontend/src/components/shared/GaugeChart.tsx",
    "ProgressBar": "frontend/src/components/shared/ProgressBar.tsx",
    "AnimatedCounter": "frontend/src/components/ui/AnimatedCounter.tsx",
    "AtomBackground": "frontend/src/components/ui/AtomBackground.tsx",
    "BackgroundLayer": "frontend/src/components/ui/BackgroundLayer.tsx",
    "DataChartEmpty": "frontend/src/components/ui/DataChartEmpty.tsx",
    "EmptyStateList": "frontend/src/components/ui/EmptyStateList.tsx",
    "FloatingMolecules": "frontend/src/components/ui/FloatingMolecules.tsx",
    "FloatingParticles": "frontend/src/components/ui/FloatingParticles.tsx",
    "GooeyNav": "frontend/src/components/ui/GooeyNav.tsx",
    "NeuralBackground": "frontend/src/components/ui/NeuralBackground.tsx",
    "NeuralCore": "frontend/src/components/ui/NeuralCore.tsx",
    "SidebarItem": "frontend/src/components/ui/SidebarItem.tsx",
    "StatCard": "frontend/src/components/ui/StatCard.tsx",

    # Frontend misc
    "useDashboardData": "frontend/src/hooks/useDashboardData.ts",
    "use3DTilt": "frontend/src/hooks/use3DTilt.ts",
    "hasPermission": "frontend/src/lib/permissions.ts",
    "MODAL_INPUT_CLASS": "frontend/src/lib/governanceUtils.ts",

    # Backend telemetry
    "authFailuresTotal": "backend/src/config/telemetry.ts",
    "activeSessionsGauge": "backend/src/config/telemetry.ts",
    "queueJobsTotal": "backend/src/config/telemetry.ts",
    "policyViolationsTotal": "backend/src/config/telemetry.ts",
    "driftAlertsTotal": "backend/src/config/telemetry.ts",
    "governanceScoreGauge": "backend/src/config/telemetry.ts",
    "evaluationRunsTotal": "backend/src/config/telemetry.ts",
    "auditLogEntriesTotal": "backend/src/config/telemetry.ts",
    "mfaAttempts": "backend/src/config/telemetry.ts",

    # Backend middleware
    "idempotencyMiddleware": "backend/src/middleware/idempotency.middleware.ts",
    "validateRequest": "backend/src/middleware/security.middleware.ts",
    "resolveWorkspace": "backend/src/middleware/tenant.middleware.ts",
    "requireTenantIsolation": "backend/src/middleware/tenant.middleware.ts",
    "enforceIpAllowlist": "backend/src/middleware/tenant.middleware.ts",

    # Backend services
    "MonitoringService": "backend/src/services/monitoring.service.ts",
    "OutcomeService": "backend/src/services/outcome.service.ts",
    "SessionService": "backend/src/services/session.service.ts",
    "checkPermission": "backend/src/services/policy.service.ts",
    "resolveTenantContext": "backend/src/services/tenant.service.ts",
    "triggerAnomalyScan": "backend/src/services/queue.service.ts",

    # Backend workers
    "GDriveGovernanceConnector": "backend/src/workers/gdrive.worker.ts",
    "LangChainGovernanceHandler": "backend/src/workers/langchain.worker.ts",
    "wrapOpenAIChatCompletion": "backend/src/workers/openai.worker.ts",

    # Backend validations
    "checkActionSchema": "backend/src/validations/ai.validation.ts",
    "processAIRequestSchema": "backend/src/validations/guardrail.validation.ts",
    "processDemoRequestSchema": "backend/src/validations/guardrail.validation.ts",
    "postRequestOverrideSchema": "backend/src/validations/guardrail.validation.ts",
    "postApproveOverrideSchema": "backend/src/validations/guardrail.validation.ts",
    "agentSchema": "backend/src/validations/inventory.validation.ts",
    "updateAlertSettingsSchema": "backend/src/validations/organization.validation.ts",
    "createAlertRuleSchema": "backend/src/validations/alert.validation.ts",
    "postFixTasksSchema": "backend/src/validations/compliance.validation.ts",
    "postEvidenceSchema": "backend/src/validations/compliance.validation.ts",
    "postReEvaluateSchema": "backend/src/validations/compliance.validation.ts",
    "postMarkAlertReadSchema": "backend/src/validations/compliance.validation.ts",

    # Backend utils
    "secureRandom": "backend/src/utils/crypto.ts",
    "secureRandomInt": "backend/src/utils/crypto.ts",
    "secureRandomHex": "backend/src/utils/crypto.ts",
    "buildDateRangeFilter": "backend/src/utils/controllerHelpers.ts",
    "applyCrudPolicies": "backend/src/utils/migrationHelpers.ts",
    "runMigrationWithCleanup": "backend/src/utils/migrationHelpers.ts",
    "TABLE_CATEGORIES": "backend/src/utils/migrationHelpers.ts",

    # Backend other
    "getPrisma": "backend/src/config/db.ts",
    "isRedisConfigured": "backend/src/config/redis.ts"
}

def git_grep_w(symbol):
    try:
        res = subprocess.run(
            ["git", "grep", "-w", "-n", symbol],
            cwd=WORKSPACE,
            capture_output=True,
            text=True
        )
        if res.returncode == 0:
            return res.stdout.strip().split("\n")
    except:
        pass
    return []

def get_git_info(file_path, line_num):
    try:
        res = subprocess.run(
            ["git", "blame", "-L", f"{line_num},{line_num}", "--date=short", file_path],
            cwd=WORKSPACE,
            capture_output=True,
            text=True
        )
        if res.returncode == 0 and res.stdout:
            match = re.search(r'\((.*?) (\d{4}-\d{2}-\d{2})', res.stdout)
            if match:
                return match.group(2)
    except:
        pass
    return "N/A"

def get_definition_line(file_path, symbol):
    abs_path = os.path.join(WORKSPACE, file_path)
    if not os.path.exists(abs_path):
        return 1
    try:
        with open(abs_path, 'r', encoding='utf-8') as f:
            for idx, line in enumerate(f, 1):
                if re.search(r'\b' + re.escape(symbol) + r'\b', line):
                    if any(k in line for k in ["const", "let", "function", "class", "interface", "type", "export"]):
                        return idx
        with open(abs_path, 'r', encoding='utf-8') as f:
            for idx, line in enumerate(f, 1):
                if symbol in line:
                    return idx
    except:
        pass
    return 1

all_records = []

# Process explicitly mapped items
for symbol, def_file in def_files.items():
    def_line = get_definition_line(def_file, symbol)
    matches = git_grep_w(symbol)
    
    prod_refs = []
    test_refs = []
    sdk_refs = []
    doc_refs = []
    
    is_frontend = def_file.startswith("frontend/")
    
    for m in matches:
        parts = m.split(":", 2)
        if len(parts) < 3:
            continue
        file_path, line_num, content = parts[0], parts[1], parts[2]
        if "node_modules" in file_path or "dist" in file_path or "scratch" in file_path:
            continue
        if file_path == def_file:
            continue
            
        is_test = "test" in file_path or "spec" in file_path or "playwright" in file_path or "__tests__" in file_path
        is_sdk = "packages/sdk" in file_path
        is_doc = file_path.endswith((".md", ".txt")) or "docs/" in file_path
        
        if is_frontend:
            if file_path.startswith("frontend/src/") and not is_test:
                prod_refs.append(f"{file_path}:{line_num}")
            elif is_test:
                test_refs.append(f"{file_path}:{line_num}")
            elif is_sdk:
                sdk_refs.append(f"{file_path}:{line_num}")
            elif is_doc:
                doc_refs.append(f"{file_path}:{line_num}")
        else: # backend
            if (file_path.startswith("backend/src/") or file_path.startswith("packages/sdk/")) and not is_test:
                prod_refs.append(f"{file_path}:{line_num}")
            elif is_test:
                test_refs.append(f"{file_path}:{line_num}")
            elif is_sdk:
                sdk_refs.append(f"{file_path}:{line_num}")
            elif is_doc:
                doc_refs.append(f"{file_path}:{line_num}")

    blame_date = get_git_info(def_file, def_line)
    
    # Refined JSDoc comment check
    has_todo = False
    context_reason = ""
    try:
        with open(os.path.join(WORKSPACE, def_file), 'r', encoding='utf-8') as f:
            lines = f.readlines()
        d_idx = def_line - 1
        start_scan = max(0, d_idx - 6)
        end_scan = min(len(lines), d_idx + 6)
        for l in lines[start_scan:end_scan]:
            l_lower = l.lower()
            if any(k in l_lower for k in ["todo", "roadmap", "future", "pending", "stub", "soon", "implement", "roadmap"]):
                has_todo = True
                context_reason = l.strip(" *\r\n\t/")
                break
    except Exception as e:
        print(f"Error scanning comments for {symbol}: {e}")
        
    is_recent = blame_date != "N/A" and blame_date >= "2026-06-05"
    
    classification = "A"
    evidence = ""
    recommendation = "Delete"
    
    if prod_refs:
        classification = "B"
        evidence = f"Referenced in production code at: {', '.join(prod_refs[:3])}"
        recommendation = "Keep — in use"
    elif test_refs:
        classification = "C"
        evidence = f"Referenced only in tests at: {', '.join(test_refs[:3])}"
        recommendation = "Remove tests and delete"
    elif has_todo or is_recent:
        classification = "D"
        reasons = []
        if has_todo:
            reasons.append(f"Comment indicates stub/future: '{context_reason}'")
        if is_recent:
            reasons.append(f"Added recently on {blame_date}")
        classification = "D"
        evidence = " | ".join(reasons) + f" (defined at {def_file}:{def_line})"
        recommendation = "Needs Faazil's call"
    else:
        classification = "A"
        evidence = f"No references found outside its defining file (defined at {def_file}:{def_line}, last modified on {blame_date})"
        recommendation = "Delete now"
        
    all_records.append({
        "symbol": symbol,
        "category": "mapped",
        "file_line": f"{def_file}:{def_line}",
        "classification": classification,
        "evidence": evidence,
        "recommendation": recommendation,
        "blame_date": blame_date
    })

# Process double-defined / non-standard items
# 1. emptySchema (x3 files)
empty_files = [
    "backend/src/validations/consent.validation.ts",
    "backend/src/validations/organization.validation.ts",
    "backend/src/validations/drift.validation.ts"
]
for ef in empty_files:
    def_line = get_definition_line(ef, "emptySchema")
    blame_date = get_git_info(ef, def_line)
    
    base_name = os.path.basename(ef).replace(".ts", "")
    matches = git_grep_w("emptySchema")
    imports = []
    for m in matches:
        parts = m.split(":", 2)
        if len(parts) < 3:
            continue
        file_path, line_num, content = parts[0], parts[1], parts[2]
        if file_path == ef or "node_modules" in file_path or "dist" in file_path or "scratch" in file_path:
            continue
        if base_name in content:
            imports.append(f"{file_path}:{line_num}")
            
    classification = "A"
    evidence = "No imports from this validation file found."
    recommendation = "Delete now"
    if imports:
        classification = "B"
        evidence = f"Imported in production code: {', '.join(imports[:3])}"
        recommendation = "Keep — in use"
        
    all_records.append({
        "symbol": f"emptySchema (from {base_name})",
        "category": "backend_validations",
        "file_line": f"{ef}:{def_line}",
        "classification": classification,
        "evidence": evidence,
        "recommendation": recommendation,
        "blame_date": blame_date
    })

# 2. checkActionSchema from validations/guardrail.validation.ts
def_file = "backend/src/validations/guardrail.validation.ts"
def_line = get_definition_line(def_file, "checkActionSchema")
blame_date = get_git_info(def_file, def_line)
matches = git_grep_w("checkActionSchema")
imports = []
for m in matches:
    parts = m.split(":", 2)
    if len(parts) < 3:
        continue
    file_path, line_num, content = parts[0], parts[1], parts[2]
    if file_path == def_file or "node_modules" in file_path or "dist" in file_path or "scratch" in file_path:
        continue
    if "guardrail.validation" in content:
        imports.append(f"{file_path}:{line_num}")
        
classification = "A"
evidence = "No imports from guardrail.validation.ts found for checkActionSchema."
recommendation = "Delete now"
if imports:
    classification = "B"
    evidence = f"Imported in production code: {', '.join(imports[:3])}"
    recommendation = "Keep — in use"
    
all_records.append({
    "symbol": "checkActionSchema (from guardrail.validation.ts)",
    "category": "backend_validations",
    "file_line": f"{def_file}:{def_line}",
    "classification": classification,
    "evidence": evidence,
    "recommendation": recommendation,
    "blame_date": blame_date
})

# 3. risk.routes.ts default export
matches_risk = git_grep_w("risk.routes")
risk_prod = [m for m in matches_risk if "node_modules" not in m and "dist" not in m and "scratch" not in m and "test" not in m and not m.startswith("backend/src/routes/risk.routes.ts")]
risk_blame = get_git_info("backend/src/routes/risk.routes.ts", 1) if os.path.exists(os.path.join(WORKSPACE, "backend/src/routes/risk.routes.ts")) else "N/A"
classification = "A" if not risk_prod else "B"
evidence = f"No imports of risk.routes.ts found in production." if classification == "A" else f"Imported in production at: {', '.join(risk_prod[:2])}"
all_records.append({
    "symbol": "Default Export of risk.routes.ts",
    "category": "backend_other",
    "file_line": "backend/src/routes/risk.routes.ts:1",
    "classification": classification,
    "evidence": evidence,
    "recommendation": "Keep" if classification == "B" else "Delete",
    "blame_date": risk_blame
})

# 4. prisma.config.ts default export
matches_prisma = git_grep_w("prisma.config")
prisma_prod = [m for m in matches_prisma if "node_modules" not in m and "dist" not in m and "scratch" not in m and "test" not in m and not m.startswith("backend/prisma.config.ts")]
prisma_blame = get_git_info("backend/prisma.config.ts", 1) if os.path.exists(os.path.join(WORKSPACE, "backend/prisma.config.ts")) else "N/A"
classification = "A" if not prisma_prod else "B"
evidence = f"No imports or requirements found for prisma.config.ts" if classification == "A" else f"Referenced in: {', '.join(prisma_prod[:2])}"
all_records.append({
    "symbol": "Default Export of prisma.config.ts",
    "category": "backend_other",
    "file_line": "backend/prisma.config.ts:1",
    "classification": classification,
    "evidence": evidence,
    "recommendation": "Keep" if classification == "B" else "Delete",
    "blame_date": prisma_blame
})

with open(os.path.join(WORKSPACE, "scratch/refined_audit_symbols.json"), "w") as f:
    json.dump(all_records, f, indent=2)

print(f"Refined audit completed for {len(all_records)} items.")
