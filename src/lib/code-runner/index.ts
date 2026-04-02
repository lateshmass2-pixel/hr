// =============================================================================
// Unified Code Runner — Routes execution to the correct language runner
// =============================================================================

import type { CodeExecutionResult } from '@/types/workspace'

export async function executeCode(
    code: string,
    language: string
): Promise<CodeExecutionResult> {
    if (!code.trim()) {
        return {
            stdout: '',
            stderr: '',
            error: 'No code to execute',
            executionTime: 0,
            status: 'error',
        }
    }

    switch (language) {
        case 'javascript':
        case 'typescript': {
            const { runJavaScript } = await import('./js-runner')
            return runJavaScript(code)
        }
        case 'python': {
            const { runPython } = await import('./python-runner')
            return runPython(code)
        }
        default:
            return {
                stdout: '',
                stderr: '',
                error: `Language "${language}" is not supported for execution. Supported: JavaScript, Python`,
                executionTime: 0,
                status: 'error',
            }
    }
}

export { type CodeExecutionResult }
