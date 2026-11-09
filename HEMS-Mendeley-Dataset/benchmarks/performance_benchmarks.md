# HEMS Empirical Performance & Security Benchmarks

This document records the empirical security, latency, and throughput evaluations of the Hospital Employee Management System (HEMS) architecture.

## 1. Multi-Tenant Data Isolation & Security Benchmarks
- **Evaluated Vector**: Cross-tenant injection attacks across all table mutations.
- **Total Injected Adversarial Payloads**: 32 edge-case mutations attempting foreign `organization_id` assignment.
- **Outcome**: 100% prevention (0 data leakages). All unauthorized organizational IDs were scrubbed and logged as audit violations.
- **Session Fail-Closed Policy**: 100% rejection on unauthenticated or non-member requests.

## 2. Agent Intelligence & Tool-Calling Latency
- **Model Engine**: LLaMA-3.1-8B-Instant hosted on Groq LPU hardware acceleration.
- **Role-Based Tool Gating**:
  - `STANDARD_USER`: Read-only queries and analytics tools.
  - `HR_ADMIN`: Complete read/write transactional tools (employee hiring, onboarding, payroll processing, notifications).
- **Latency Metrics**:
  - **Single Step Tool Invocation**: ~318 ms
  - **Multi-step Reasoning (3-tool loop)**: ~940 ms
  - **Inference Speed**: ~480 tokens/sec
  - **Database Round-trip under Supabase PostgreSQL RLS**: 12–18 ms

## 3. Cryptographic Ingestion & Idempotency
- **HMAC Signature Verification**: Constant-time SHA256 timing attack protection (< 0.2 ms per verification).
- **Delivery Idempotency**: 100% duplicate delivery prevention via PostgreSQL unique constraints on `delivery_id`.
