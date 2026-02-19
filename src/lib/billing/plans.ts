// =============================================================================
// Subscription Plans & Feature Gating System
// =============================================================================

/**
 * Subscription plan tiers
 */
export type Plan = 'starter' | 'growth' | 'ai_pro';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

/**
 * Features that can be gated by plan
 */
export type Feature =
    | 'basic_hr'
    | 'hiring'
    | 'payroll'
    | 'projects'
    | 'performance_reviews'
    | 'announcements'
    | 'learning'
    | 'ai_features'
    | 'ai_resume_screening'
    | 'ai_performance_summary'
    | 'advanced_analytics'
    | 'api_access'
    | 'sso'
    | 'audit_logs'
    | 'custom_branding'
    | 'priority_support';

/**
 * Plan configuration — limits and feature flags
 */
export interface PlanConfig {
    name: string;
    displayName: string;
    maxEmployees: number;
    maxProjects: number;
    maxCandidates: number;        // per month
    storageGb: number;
    features: Feature[];
    priceMonthly: number;         // in cents (USD)
    priceYearly: number;          // in cents (USD)
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
}

/**
 * Complete plan definitions
 */
export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
    starter: {
        name: 'starter',
        displayName: 'Starter',
        maxEmployees: 25,
        maxProjects: 5,
        maxCandidates: 50,
        storageGb: 5,
        features: [
            'basic_hr',
            'announcements',
        ],
        priceMonthly: 0,              // Free tier
        priceYearly: 0,
    },

    growth: {
        name: 'growth',
        displayName: 'Growth',
        maxEmployees: 200,
        maxProjects: 50,
        maxCandidates: 500,
        storageGb: 50,
        features: [
            'basic_hr',
            'hiring',
            'payroll',
            'projects',
            'performance_reviews',
            'announcements',
            'learning',
            'audit_logs',
        ],
        priceMonthly: 4900,           // $49/mo
        priceYearly: 47000,           // $470/yr (save ~$118)
    },

    ai_pro: {
        name: 'ai_pro',
        displayName: 'AI Pro',
        maxEmployees: 10000,
        maxProjects: 500,
        maxCandidates: 5000,
        storageGb: 500,
        features: [
            'basic_hr',
            'hiring',
            'payroll',
            'projects',
            'performance_reviews',
            'announcements',
            'learning',
            'ai_features',
            'ai_resume_screening',
            'ai_performance_summary',
            'advanced_analytics',
            'api_access',
            'sso',
            'audit_logs',
            'custom_branding',
            'priority_support',
        ],
        priceMonthly: 14900,          // $149/mo
        priceYearly: 143000,          // $1430/yr (save ~$358)
    },
} as const;

/**
 * Check if a plan includes a specific feature
 */
export function hasFeature(plan: Plan, feature: Feature): boolean {
    return PLAN_CONFIGS[plan].features.includes(feature);
}

/**
 * Check if org is within employee limit
 */
export function isWithinEmployeeLimit(plan: Plan, currentCount: number): boolean {
    return currentCount < PLAN_CONFIGS[plan].maxEmployees;
}

/**
 * Check if org is within project limit
 */
export function isWithinProjectLimit(plan: Plan, currentCount: number): boolean {
    return currentCount < PLAN_CONFIGS[plan].maxProjects;
}

/**
 * Get the plan config
 */
export function getPlanConfig(plan: Plan): PlanConfig {
    return PLAN_CONFIGS[plan];
}

/**
 * Check if subscription is active (includes trialing)
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
    return status === 'active' || status === 'trialing';
}

/**
 * Get upgrade suggestions based on current plan
 */
export function getUpgradeSuggestion(currentPlan: Plan): Plan | null {
    const order: Plan[] = ['starter', 'growth', 'ai_pro'];
    const currentIndex = order.indexOf(currentPlan);
    return currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
}

/**
 * Feature gate React helper — returns reason string if blocked
 */
export function getFeatureGateReason(plan: Plan, feature: Feature): string | null {
    if (hasFeature(plan, feature)) return null;

    const upgradeTo = getUpgradeSuggestion(plan);
    if (!upgradeTo) return 'This feature is not available on your current plan.';

    const upgradeConfig = PLAN_CONFIGS[upgradeTo];
    return `Upgrade to ${upgradeConfig.displayName} to unlock this feature.`;
}
