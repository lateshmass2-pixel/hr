import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// =============================================================================
// Service-role containment
// =============================================================================
// The service-role Supabase client BYPASSES ROW LEVEL SECURITY. On those code
// paths, RLS provides no protection at all, so tenant isolation depends
// entirely on the application remembering to filter by organization_id — which
// is exactly what already failed (see the deleteProject cross-tenant delete
// fixed in src/app/dashboard/projects/actions.ts).
//
// These files are the audited allowlist. Adding to it requires editing this
// config, which makes it a visible, reviewable decision rather than an
// incidental import.
//
// Before adding a file, prefer:
//   1. the normal RLS-backed client (`createClient`), or
//   2. `scopeClient(await createAdminClient(), session.organizationId)` from
//      '@/lib/db/tenant-scoped', which re-imposes the tenant filter.
//
// Audit with: grep -rn "createAdminClient\|supabaseAdmin" src/
// =============================================================================
const SERVICE_ROLE_ALLOWLIST = [
  // The client definitions themselves.
  "src/lib/supabase/admin.ts",
  "src/lib/supabase/server.ts",

  // Tenant-scoping wrapper — needs the raw client to wrap it.
  "src/lib/db/tenant-scoped.ts",

  // Stripe webhook: authenticated by signature, not by a user session, so
  // there is no session to derive a tenant from. Resolves the org from the
  // Stripe customer id.
  "src/app/api/webhooks/stripe/route.ts",

  // User provisioning: calls auth.admin.createUser / deleteUser, which require
  // the service role by definition.
  "src/app/actions/onboarding.ts",
  "src/app/actions/employees.ts",

  // Wrapped in scopeClient() for the delete path.
  "src/app/dashboard/projects/actions.ts",

  // ---------------------------------------------------------------------------
  // OUTSTANDING — allowlisted to keep the build green, but these are NOT
  // considered safe and are tracked in docs/INDUSTRIAL_READINESS_PLAN.md §1.10.
  // ---------------------------------------------------------------------------
  // Public (unauthenticated) assessment flow using the service role.
  "src/app/assessment/actions.ts",
  // deleteApplication deletes by id with no tenant check; `applications` has no
  // organization_id column, so it cannot be scoped until the cut-over (§1.2).
  "src/app/dashboard/hiring/actions.ts",
  // RLS bypassed inside a RENDER path. Should not need the service role at all.
  "src/app/dashboard/hiring/page.tsx",
];

const serviceRoleRestriction = {
  name: "no-service-role-outside-allowlist",
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@/lib/supabase/admin",
            importNames: ["supabaseAdmin"],
            message:
              "supabaseAdmin bypasses Row Level Security. Use createClient(), or wrap it with scopeClient() from '@/lib/db/tenant-scoped'. To allow it here, add this file to SERVICE_ROLE_ALLOWLIST in eslint.config.mjs and explain why.",
          },
          {
            name: "@/lib/supabase/server",
            importNames: ["createAdminClient"],
            message:
              "createAdminClient bypasses Row Level Security. Use createClient(), or wrap it with scopeClient() from '@/lib/db/tenant-scoped'. To allow it here, add this file to SERVICE_ROLE_ALLOWLIST in eslint.config.mjs and explain why.",
          },
        ],
      },
    ],
    // Constructing a privileged client by reading the key directly sidesteps
    // the import restriction above.
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "MemberExpression[object.object.name='process'][object.property.name='env'][property.name='SUPABASE_SERVICE_ROLE_KEY']",
        message:
          "Do not read SUPABASE_SERVICE_ROLE_KEY directly. Use the audited clients in '@/lib/supabase', and wrap them with scopeClient() from '@/lib/db/tenant-scoped'.",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Historical SQL/debug material, kept for reference and never executed.
    "supabase/_archive/**",
    "scripts/_archive/**",
  ]),

  // Apply the service-role restriction to all application source...
  {
    ...serviceRoleRestriction,
    files: ["src/**/*.{ts,tsx}"],
  },

  // ...then lift it for the audited allowlist.
  {
    name: "service-role-allowlist",
    files: SERVICE_ROLE_ALLOWLIST,
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },

  // Tests may reach for internals in order to assert on them.
  {
    name: "test-overrides",
    files: ["tests/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
