import { redirect } from 'next/navigation'

// =============================================================================
// /employees/[id]/work-intelligence → dashboard detail page
// =============================================================================
// Spec §19 names this path; the actual implementation lives under
// /dashboard/work-intelligence/employee/[id] (inside the dashboard layout
// with the sidebar). This route simply forwards.
// =============================================================================

export default async function EmployeeWorkIntelligenceAlias({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    redirect(`/dashboard/work-intelligence/employee/${id}`)
}
