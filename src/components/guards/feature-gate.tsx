// =============================================================================
// FeatureGate — Server Component for Plan-Based Feature Gating
// =============================================================================
// Usage:
//   <FeatureGate feature="payroll" orgId={orgId}>
//     <PayrollDashboard />
//   </FeatureGate>
// =============================================================================

import { getCurrentOrganization } from '@/lib/organization';
import { hasFeature, getFeatureGateReason, getUpgradeSuggestion, PLAN_CONFIGS, type Feature } from '@/lib/billing';
import Link from 'next/link';

interface FeatureGateProps {
    feature: Feature;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default async function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
    const orgContext = await getCurrentOrganization();

    if (!orgContext) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <p className="text-muted-foreground">Please select an organization.</p>
            </div>
        );
    }

    const { organization } = orgContext;
    const isAvailable = hasFeature(organization.plan, feature);

    if (isAvailable) {
        return <>{children}</>;
    }

    // Feature is locked — show upgrade prompt
    if (fallback) return <>{fallback}</>;

    const reason = getFeatureGateReason(organization.plan, feature);
    const upgradePlan = getUpgradeSuggestion(organization.plan);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                </svg>
            </div>

            <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold mb-2">Feature Locked</h3>
                <p className="text-muted-foreground text-sm">{reason}</p>
            </div>

            {upgradePlan && (
                <Link
                    href="/dashboard/billing"
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                    Upgrade to {PLAN_CONFIGS[upgradePlan].displayName}
                </Link>
            )}
        </div>
    );
}
