import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Two test projects, deliberately separated:
 *
 *   unit      — pure, no I/O, no credentials. Runs on every push in CI.
 *   isolation — cross-tenant security tests. Requires a real (throwaway)
 *               Supabase/Postgres instance, so it cannot run on a bare PR
 *               build. Run with `npm run test:isolation`.
 *
 * Keeping them separate means the fast gate stays fast and the isolation suite
 * can be pointed at a seeded database without every contributor needing one.
 */
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        projects: [
            {
                resolve: {
                    alias: {
                        '@': fileURLToPath(new URL('./src', import.meta.url)),
                    },
                },
                test: {
                    name: 'unit',
                    environment: 'node',
                    include: ['tests/unit/**/*.test.ts'],
                },
            },
            {
                resolve: {
                    alias: {
                        '@': fileURLToPath(new URL('./src', import.meta.url)),
                    },
                },
                test: {
                    name: 'isolation',
                    environment: 'node',
                    include: ['tests/isolation/**/*.test.ts'],
                    // Tenant isolation tests share seeded fixtures; running them
                    // in parallel would make failures non-deterministic.
                    fileParallelism: false,
                    testTimeout: 30_000,
                    hookTimeout: 60_000,
                },
            },
        ],
    },
});
