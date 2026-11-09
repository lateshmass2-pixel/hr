import { redirect } from 'next/navigation'

// =============================================================================
// /dashboard/work-authenticity → Work Intelligence overview
// =============================================================================
// Spec §18 names this path; the implementation lives under
// /dashboard/work-intelligence (authenticity board is the 'authenticity'
// tab). Forward there.
// =============================================================================

export default async function WorkAuthenticityAlias() {
    redirect('/dashboard/work-intelligence/authenticity')
}
