import Link from 'next/link'

// =============================================================================
// Work Intelligence sub-navigation — shared across all WI pages.
// Client-safe (no state): plain links styled to match the existing nav-link
// look. Kept as a server component to avoid extra JS.
// =============================================================================

const MANAGER_ITEMS = [
    { href: '/dashboard/work-intelligence', label: 'Overview' },
    { href: '/dashboard/work-intelligence/daily', label: 'Daily Work' },
    { href: '/dashboard/work-intelligence/git-activity', label: 'Git Activity' },
    { href: '/dashboard/work-intelligence/timeline', label: 'Work Timeline' },
    { href: '/dashboard/work-intelligence/authenticity', label: 'Work Authenticity' },
    { href: '/dashboard/work-intelligence/ai-automation', label: 'AI & Automation' },
    { href: '/dashboard/work-intelligence/anomalies', label: 'Anomalies' },
]

const EMPLOYEE_ITEMS = [
    { href: '/dashboard/work-intelligence', label: 'Overview' },
    { href: '/dashboard/work-intelligence/daily', label: 'Daily Work' },
    { href: '/dashboard/work-intelligence/git-activity', label: 'Project Git Activity' },
]

export function WorkIntelligenceNav({ manager = true }: { manager?: boolean }) {
    const visibleItems = manager ? MANAGER_ITEMS : EMPLOYEE_ITEMS

    return (
        <nav className="flex flex-wrap gap-1 text-sm" aria-label="Work Intelligence sections">
            {visibleItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-1.5 rounded-full text-[#14532d] hover:bg-[#14532d]/10 transition-colors"
                >
                    {item.label}
                </Link>
            ))}
        </nav>
    )
}
