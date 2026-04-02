// =============================================================================
// Python Code Runner — Pyodide (WebAssembly)
// =============================================================================
// Loads Python interpreter via Pyodide CDN and runs code in-browser.
// First load ~11MB (cached by browser afterward).
// =============================================================================

import type { CodeExecutionResult } from '@/types/workspace'

declare global {
    interface Window {
        loadPyodide?: (config: { indexURL: string }) => Promise<any>
    }
}

let pyodideInstance: any = null
let pyodideLoading: Promise<any> | null = null

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

async function loadPyodideRuntime(): Promise<any> {
    if (pyodideInstance) return pyodideInstance

    if (pyodideLoading) return pyodideLoading

    pyodideLoading = (async () => {
        // Dynamically load pyodide script
        if (!window.loadPyodide) {
            await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script')
                script.src = `${PYODIDE_CDN}pyodide.js`
                script.onload = () => resolve()
                script.onerror = () => reject(new Error('Failed to load Pyodide'))
                document.head.appendChild(script)
            })
        }

        pyodideInstance = await window.loadPyodide!({
            indexURL: PYODIDE_CDN,
        })

        return pyodideInstance
    })()

    return pyodideLoading
}

export async function runPython(code: string, timeoutMs: number = 10000): Promise<CodeExecutionResult> {
    const startTime = performance.now()

    try {
        const pyodide = await Promise.race([
            loadPyodideRuntime(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Pyodide load timeout')), 30000)
            ),
        ])

        // Capture stdout/stderr
        pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
        `)

        // Run user code with timeout
        const result = await Promise.race([
            (async () => {
                try {
                    pyodide.runPython(code)
                } catch (err: any) {
                    // Python exception — write to stderr
                    pyodide.runPython(`sys.stderr.write("""${String(err.message).replace(/"""/g, '\\"\\"\\"')}""")`)
                }

                const stdout = pyodide.runPython('sys.stdout.getvalue()') || ''
                const stderr = pyodide.runPython('sys.stderr.getvalue()') || ''

                // Reset streams
                pyodide.runPython(`
sys.stdout = StringIO()
sys.stderr = StringIO()
                `)

                return { stdout, stderr }
            })(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Execution timed out')), timeoutMs)
            ),
        ])

        const execTime = performance.now() - startTime

        return {
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.stderr ? result.stderr : null,
            executionTime: Math.round(execTime),
            status: result.stderr ? 'error' : 'success',
        }
    } catch (err: any) {
        const execTime = performance.now() - startTime
        return {
            stdout: '',
            stderr: '',
            error: err.message || 'Python execution failed',
            executionTime: Math.round(execTime),
            status: err.message?.includes('timeout') ? 'timeout' : 'error',
        }
    }
}

export function isPyodideLoaded(): boolean {
    return pyodideInstance !== null
}
