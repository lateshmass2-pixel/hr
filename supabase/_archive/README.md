# Archived SQL — DO NOT RUN

These 34 files are **historical**. They are kept only so the schema's history
stays readable and so `git log`/`git blame` still work on them.

## Do not run anything in this directory

Several of these scripts are actively destructive
(`aggressive_cleanup.sql`, `cleanup_old_schema.sql`, `disable_trigger.sql`,
`recreate_test_data.sql`), several contradict each other
(`policies.sql` vs `fix_rls_policies.sql` vs `rls_projects.sql`), and several
grant permissive access that has since been deliberately removed.

Running them against any database — especially production — will at best
undo current schema state and at worst delete data.

## Why they were archived

They were loose files at `supabase/`, applied by hand through the Supabase SQL
editor in an order nobody recorded. That meant:

- the production schema could not be reconstructed from the repository
- there was no way to tell which files had been applied to which environment
- two files could define the same object differently, and whichever ran last won
- nothing could be rolled back

`supabase/migrations/` is now the single source of truth. See
`supabase/migrations/README.md` for the rules.

## Security note

Roughly 20 policy definitions in these files are `USING (true)` or
`WITH CHECK (true)` — meaning any authenticated user could read any row,
across tenants. Those are the policies the tenant-isolation work replaces.
They are the reason this directory is quarantined rather than deleted: they
document what the current schema must *not* look like.

Files: `rls_applications.sql`, `rls_projects.sql`,
`rls_projects_tasks_profiles.sql`, `complete_schema.sql`,
`announcements_schema.sql`, `migrate_tasks_to_profiles.sql`.

## What happened to the still-relevant ones

Four scripts described schema the application currently depends on, so they
were promoted into numbered migrations rather than archived:

| Former path | Now |
|---|---|
| `supabase/migrations/add_interview_columns.sql` | `004_applications_interview_columns.sql` |
| `add_skills_column.sql` + `applications_display_fields.sql` | `005_applications_display_fields.sql` (merged — both added `skills`) |
| `resume_embeddings.sql` | `006_resume_embeddings.sql` |
| `job_jd_embedding.sql` | `007_job_postings_jd_embedding.sql` |

## If you need something from here

Do not run the file. Instead, write a new numbered migration in
`supabase/migrations/` that expresses the change you want, and let it go
through review and CI.
