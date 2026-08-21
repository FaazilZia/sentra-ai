# PII Detection Precision / Recall Benchmark Report

> [!WARNING]
> **Evaluation Mode Notice**: L1/L2 pattern-matching only, L3 semantic layer not evaluated

## 1. Overall Performance Summary

| Metric | Value | Breakdown (Count) |
| :--- | :---: | :---: |
| **Total Test Cases** | `220` | Total Dataset Cases |
| **Precision** | **100.00%** | TP: 96 / (TP+FP: 96) |
| **Recall** | **84.21%** | TP: 96 / (TP+FN: 114) |
| **F1 Score** | **91.43%** | Harmonic Mean |
| **False Positive Rate (FPR)** | **0.00%** | FP: 0 / (FP+TN: 106) |
| **False Negative Rate (FNR)** | **15.79%** | FN: 18 / (FN+TP: 114) |

## 2. Layer-by-Layer Engine Performance

| Engine Layer | Precision | Recall | F1 Score | FPR | FNR |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **piiScanner** | 100.00% | 72.81% | 84.26% | 0.00% | 27.19% |
| **guardrailService** | 100.00% | 44.74% | 61.82% | 0.00% | 55.26% |
| **decisionEngine** | 100.00% | 16.67% | 28.57% | 0.00% | 83.33% |
| **combinedPipeline** | 100.00% | 84.21% | 91.43% | 0.00% | 15.79% |

## 3. Breakdown by Category (4-Taxonomy Bucket)

| Category | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **direct** | 63 | 100.00% | 73.02% | 84.40% | 0.00% | 26.98% | 46 | 0 | 0 | 17 |
| **obfuscated** | 31 | 100.00% | 96.77% | 98.36% | 0.00% | 3.23% | 30 | 0 | 0 | 1 |
| **adversarial** | 20 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 20 | 0 | 0 | 0 |
| **clean** | 106 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 0 | 0 | 106 | 0 |

## 4. Breakdown by PII Type

| PII Type | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **email** | 13 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 13 | 0 | 0 | 0 |
| **phone** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **ssn** | 13 | 100.00% | 92.31% | 96.00% | 0.00% | 7.69% | 12 | 0 | 0 | 1 |
| **aadhaar** | 9 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 9 | 0 | 0 | 0 |
| **pan** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **credit_card** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **medical_record** | 9 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 9 | 0 | 0 | 0 |
| **name_in_context** | 24 | 100.00% | 29.17% | 45.16% | 0.00% | 70.83% | 7 | 0 | 0 | 17 |
| **credential** | 16 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 16 | 0 | 0 | 0 |
| **clean** | 106 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 0 | 0 | 106 | 0 |

## 5. Breakdown by Framework Compliance

| Framework | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **GDPR** | 60 | 100.00% | 81.67% | 89.91% | 0.00% | 18.33% | 49 | 0 | 0 | 11 |
| **DPDP** | 58 | 100.00% | 82.76% | 90.57% | 0.00% | 17.24% | 48 | 0 | 0 | 10 |
| **HIPAA** | 36 | 100.00% | 97.22% | 98.59% | 0.00% | 2.78% | 35 | 0 | 0 | 1 |
| **PCI_DSS** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **NIST_AI_RMF** | 27 | 100.00% | 96.30% | 98.11% | 0.00% | 3.70% | 26 | 0 | 0 | 1 |
| **NONE** | 106 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 0 | 0 | 106 | 0 |

## 6. Weakest Categories & Lowest Recall Areas

- **piiType:name_in_context**: Lowest Recall at `29.17%`

