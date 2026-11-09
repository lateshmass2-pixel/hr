# HEMS Research Dataset: Relational Schemas, Synthetic Healthcare Records, and Empirical Verification Benchmarks

## Overview
This dataset provides the relational database schemas, HIPAA-compliant synthetic anonymized employee records, candidate evaluation metrics, work intelligence logs, and empirical test benchmarks for the **Hospital Employee Management System (HEMS)**.

HEMS is built on Next.js 14/15, TypeScript, PostgreSQL, and Supabase, integrating role-gated AI agents and deterministic work-authenticity heuristics.

## Ethical and Privacy Statement
**No real patient, clinical staff, or institutional hospital data is included in this dataset.** All records (identities, contact credentials, timestamps, evaluations, and compensation figures) were synthetically generated using statistical masking and HIPAA Safe Harbor privacy guidelines (45 CFR § 164.514) and GDPR Article 89 research standards.

## Dataset Structure
```text
HEMS-Mendeley-Dataset/
├── README.md
├── DATA_DICTIONARY.csv
├── data/
│   ├── synthetic_employees.json
│   ├── synthetic_employees.csv
│   ├── synthetic_candidates.json
│   ├── synthetic_candidates.csv
│   ├── synthetic_daily_work_reports.json
│   ├── synthetic_daily_work_reports.csv
│   ├── synthetic_activity_anomalies.json
│   └── synthetic_activity_anomalies.csv
├── schema/
│   ├── hems_saas_foundation.sql
│   └── hems_work_intelligence.sql
└── benchmarks/
    ├── vitest_test_results.json
    └── performance_benchmarks.md
```

## Description of Files

### 1. `data/`
- **`synthetic_employees.json` / `.csv`**: Anonymized clinical and administrative personnel across multiple hospital units (ICU, Emergency, Surgery, Pathology, Health Informatics).
- **`synthetic_candidates.json` / `.csv`**: Applicant screening records containing qualification scores, test metrics, recruitment stages, and AI reasoning.
- **`synthetic_daily_work_reports.json` / `.csv`**: Longitudinal activity logs containing daily commit counts, CI runs, file churn metrics, and verification statuses.
- **`synthetic_activity_anomalies.json` / `.csv`**: Algorithmic anomaly detection outputs categorizing activity burst, off-hours anomalies, and unverified bot generation.

### 2. `schema/`
- **`hems_saas_foundation.sql`**: Production DDL establishing multi-tenant organizational boundaries, role-based access control (RBAC), employee management, and payroll schemas.
- **`hems_work_intelligence.sql`**: Schema for git provenance, atomic work evidence, anomaly logging, and daily synthesized reports.

### 3. `benchmarks/`
- **`vitest_test_results.json`**: Formal verification results of 198 automated unit and integration tests across 11 test modules.
- **`performance_benchmarks.md`**: Empirical benchmarks on query latency, role-gated tool-calling speeds, and tenant data isolation.

## Technical Specifications
- **Database Engine**: PostgreSQL 14+ / Supabase
- **Extensions**: `uuid-ossp`, `pgcrypto`, `vector` (pgvector)
- **Application Framework**: Next.js 14+, TypeScript 5+, Vitest 4+

## License
Creative Commons Attribution 4.0 International (CC BY 4.0). You are free to share and adapt this material with appropriate credit to the authors.
