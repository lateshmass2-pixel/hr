# Archived scripts

Superseded one-off debug scripts. Kept rather than deleted because they were
never committed, so git history does not have them.

## `inspect-schema.js`

Dumped the live schema by loading `SUPABASE_SERVICE_ROLE_KEY` and hitting the
REST API — from the repository root, where it was easy to run by accident
against production.

**Superseded by:** `supabase db pull`, which writes the schema into
`supabase/migrations/` as a reviewable, version-controlled file instead of
printing it to a terminal. See `supabase/migrations/README.md`.

## `inspect-local-db.js`

Dumped `information_schema` through `PrismaClient`.

**Superseded by:** the same `supabase db pull` flow. It is also now
non-functional: Prisma has been removed from the project (see below).

## Why Prisma was removed

`prisma` and `@prisma/client` were dependencies, and `prisma generate` ran on
every production build, but `PrismaClient` was imported **zero** times in
`src/`. All database access goes through the Supabase client.

The checked-in `prisma/schema.prisma` was worse than unused — it was actively
misleading:

- Clerk-era modelling (`User.clerkId`) for an app that uses Supabase Auth
- no `Organization`/tenant model and no `organizationId` on any model, so it
  described a single-tenant application
- no `@@index` anywhere
- a third competing role enum (`Role { HR_ADMIN, EMPLOYEE }`) alongside the
  `org_role` Postgres enum and the legacy `profiles.role` strings
- no `prisma/migrations/` directory, so it was not even a migration source

A newcomer reading it would have concluded the app was single-tenant.

The file is recoverable from git history if ever needed:

```bash
git log --all --oneline -- prisma/schema.prisma
git show <commit>:prisma/schema.prisma
```
