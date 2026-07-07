import json
import os

WORKSPACE = "/Users/mohammadfaazilzia/Desktop/Sentra AI"
ARTIFACTS_DIR = "/Users/mohammadfaazilzia/.gemini/antigravity-ide/brain/a801f836-1d55-4eae-91ee-d03ffc8290cc"

with open(os.path.join(WORKSPACE, "scratch/refined_audit_symbols.json"), "r") as f:
    symbols = json.load(f)

with open(os.path.join(WORKSPACE, "scratch/fresh_sweep_results.json"), "r") as f:
    sweep = json.load(f)

# Override classifications for known shadow name false positives
for s in symbols:
    name = s["symbol"]
    file_line = s["file_line"]
    
    # 1. triggerScan in api.ts
    if name == "triggerScan" and "api.ts" in file_line:
        s["classification"] = "A"
        s["evidence"] = "No imports from api.ts. References in IncidentManagement.tsx are to a local triggerScan function."
        s["recommendation"] = "Delete now"
        
    # 2. AtomBackground in AtomBackground.tsx
    if name == "AtomBackground" and "AtomBackground.tsx" in file_line:
        s["classification"] = "A"
        s["evidence"] = "No imports. References in AnimatedBackground.tsx are to a local AtomBackground component."
        s["recommendation"] = "Delete now"
        
    # 3. SidebarItem in SidebarItem.tsx
    if name == "SidebarItem" and "SidebarItem.tsx" in file_line:
        s["classification"] = "A"
        s["evidence"] = "No imports. References in Sidebar.tsx are to a local SidebarItem interface."
        s["recommendation"] = "Delete now"
        
    # 4. hasPermission in permissions.ts
    if name == "hasPermission" and "permissions.ts" in file_line:
        s["classification"] = "A"
        s["evidence"] = "No imports. References in PermissionGate.tsx are to a local hasPermission variable check."
        s["recommendation"] = "Delete now"
        
    # 5. Default Export of prisma.config.ts
    if name == "Default Export of prisma.config.ts":
        s["classification"] = "A"
        s["evidence"] = "No TS/JS imports. Only referenced in Dockerfile COPY and package-lock.json."
        s["recommendation"] = "Delete now"

# Group by classification
groups = {"A": [], "B": [], "C": [], "D": []}
for s in symbols:
    groups[s["classification"]].append(s)

# Formulate report content
report = []
report.append("# Sentraa AI Codebase Audit Report")
report.append("\nThis report lists the status of candidate dead code flagged in the monorepo, categorized by usage status.\n")

report.append("## Classification Summary")
report.append(f"- **Classification A (TRULY DEAD)**: {len(groups['A'])} items")
report.append(f"- **Classification B (DYNAMICALLY USED)**: {len(groups['B'])} items")
report.append(f"- **Classification C (TEST-ONLY)**: {len(groups['C'])} items")
report.append(f"- **Classification D (PLANNED)**: {len(groups['D'])} items\n")

report.append("## Audit Table")
report.append("| File:Line | Symbol | Classification | Evidence | Recommendation |")
report.append("|---|---|---|---|---|")

for cat in ["A", "B", "C", "D"]:
    for s in groups[cat]:
        # Clean paths for displaying
        file_line = s["file_line"]
        symbol = s["symbol"]
        evidence = s["evidence"]
        rec = s["recommendation"]
        
        # Link formatting
        parts = file_line.split(":")
        if len(parts) >= 2:
            link = f"[{os.path.basename(parts[0])}:{parts[1]}](file://{os.path.join(WORKSPACE, parts[0])}#L{parts[1]})"
        else:
            link = file_line
            
        report.append(f"| {link} | `{symbol}` | **{cat}** | {evidence} | {rec} |")

# Unused dependencies
report.append("\n## Fresh Sweep Results\n")
report.append("### Unused npm Dependencies")
report.append(f"- **Frontend (`frontend/package.json`)**: {', '.join([f'`{d}`' for d in sweep['unused_frontend_deps']]) if sweep['unused_frontend_deps'] else 'None'}")
report.append(f"- **Backend (`backend/package.json`)**: {', '.join([f'`{d}`' for d in sweep['unused_backend_deps']]) if sweep['unused_backend_deps'] else 'None'}\n")

# Unused files
report.append("### Unused Files (Never Imported Anywhere)")
report.append("The following files have no import statements or requirements pointing to them:")
for f, d in sweep["unused_files"]:
    link = f"[{os.path.basename(f)}](file://{os.path.join(WORKSPACE, f)})"
    report.append(f"- {link} (Path: `{f}`, Last modified: {d})")

# Commented out code
report.append("\n### Commented-out Code Blocks (>5 lines)")
if sweep["commented_code_blocks"]:
    for b in sweep["commented_code_blocks"]:
        link = f"[{os.path.basename(b['file'])}:{b['start_line']}-{b['end_line']}](file://{os.path.join(WORKSPACE, b['file'])}#L{b['start_line']}-{b['end_line']})"
        report.append(f"- In {link}:\n```typescript\n{b['content']}```")
else:
    report.append("No commented-out code blocks >5 lines found in production files.")

# Action Lists
report.append("\n## Action Lists\n")
report.append("### Short 'Delete Now' List (Classification A only, sorted by file)")
# Sort A items by file path
sorted_A = sorted(groups["A"], key=lambda x: x["file_line"])
for s in sorted_A:
    report.append(f"- `{s['symbol']}` (defined at `{s['file_line']}`)")

report.append("\n### Short 'Needs Faazil's Call' List (Classification D only)")
if groups["D"]:
    for s in groups["D"]:
        report.append(f"- `{s['symbol']}` (defined at `{s['file_line']}`) — {s['evidence']}")
else:
    report.append("No Classification D items found in this pass.")

# Write report to artifact directory
report_path = os.path.join(ARTIFACTS_DIR, "audit_report.md")
with open(report_path, "w") as f:
    f.write("\n".join(report))

print(f"Generated audit report at {report_path}")
