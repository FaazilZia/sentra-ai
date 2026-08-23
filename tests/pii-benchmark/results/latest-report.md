# PII Detection Precision / Recall Benchmark Report

> [!WARNING]
> **Evaluation Mode Notice**: L1/L2 pattern-matching only, L3 semantic layer not evaluated

## 1. Overall Performance Summary

| Metric | Value | Breakdown (Count) |
| :--- | :---: | :---: |
| **Total Test Cases** | `223` | Total Dataset Cases |
| **Precision** | **99.13%** | TP: 114 / (TP+FP: 115) |
| **Recall** | **99.13%** | TP: 114 / (TP+FN: 115) |
| **F1 Score** | **99.13%** | Harmonic Mean |
| **False Positive Rate (FPR)** | **0.93%** | FP: 1 / (FP+TN: 108) |
| **False Negative Rate (FNR)** | **0.87%** | FN: 1 / (FN+TP: 115) |

## 2. Layer-by-Layer Engine Performance

| Engine Layer | Precision | Recall | F1 Score | FPR | FNR |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **piiScanner** | 99.08% | 93.91% | 96.43% | 0.93% | 6.09% |
| **guardrailService** | 100.00% | 44.35% | 61.45% | 0.00% | 55.65% |
| **decisionEngine** | 100.00% | 16.52% | 28.36% | 0.00% | 83.48% |
| **combinedPipeline** | 99.13% | 99.13% | 99.13% | 0.93% | 0.87% |

## 3. Breakdown by Category (4-Taxonomy Bucket)

| Category | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **direct** | 63 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 63 | 0 | 0 | 0 |
| **obfuscated** | 32 | 100.00% | 96.88% | 98.41% | 0.00% | 3.13% | 31 | 0 | 0 | 1 |
| **adversarial** | 20 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 20 | 0 | 0 | 0 |
| **clean** | 108 | 0.00% | 100.00% | 0.00% | 0.93% | 0.00% | 0 | 1 | 107 | 0 |

## 4. Breakdown by PII Type

| PII Type | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **email** | 13 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 13 | 0 | 0 | 0 |
| **phone** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **ssn** | 13 | 100.00% | 92.31% | 96.00% | 0.00% | 7.69% | 12 | 0 | 0 | 1 |
| **aadhaar** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **pan** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **credit_card** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **medical_record** | 9 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 9 | 0 | 0 | 0 |
| **name_in_context** | 24 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 24 | 0 | 0 | 0 |
| **credential** | 16 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 16 | 0 | 0 | 0 |
| **clean** | 108 | 0.00% | 100.00% | 0.00% | 0.93% | 0.00% | 0 | 1 | 107 | 0 |

## 5. Breakdown by Framework Compliance

| Framework | Cases | Precision | Recall | F1 Score | FPR | FNR | TP | FP | TN | FN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **GDPR** | 60 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 60 | 0 | 0 | 0 |
| **DPDP** | 59 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 59 | 0 | 0 | 0 |
| **HIPAA** | 36 | 100.00% | 97.22% | 98.59% | 0.00% | 2.78% | 35 | 0 | 0 | 1 |
| **PCI_DSS** | 10 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 10 | 0 | 0 | 0 |
| **NIST_AI_RMF** | 27 | 100.00% | 100.00% | 100.00% | 0.00% | 0.00% | 27 | 0 | 0 | 0 |
| **NONE** | 108 | 0.00% | 100.00% | 0.00% | 0.93% | 0.00% | 0 | 1 | 107 | 0 |

## 6. Weakest Categories & Lowest Recall Areas

- **category:clean**: Lowest F1 Score at `0.00%`

