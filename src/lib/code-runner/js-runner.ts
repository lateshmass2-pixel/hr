// =============================================================================
// JavaScript Code Runner — Web Worker (inline blob)
// =============================================================================
// Executes JS/TS in a sandboxed Web Worker with captured console output.
// =============================================================================

import type { CodeExecutionResult } from '@/types/workspace'

const WORKER_CODE = `
// Sandboxed JS execution environment
self.onmessage = function(e) {
    const { code, timeout } = e.data;
    const logs = [];
    const errors = [];
    const startTime = performance.now();

    // Override console methods
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
    };

    console.log = (...args) => logs.push(args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
        catch { return String(a); }
    }).join(' '));
    console.error = (...args) => errors.push(args.map(a => String(a)).join(' '));
    console.warn = (...args) => logs.push('[WARN] ' + args.map(a => String(a)).join(' '));
    console.info = (...args) => logs.push('[INFO] ' + args.map(a => String(a)).join(' '));

    try {
        // Use indirect eval for global scope
        const result = (0, eval)(code);
        const execTime = performance.now() - startTime;

        // If the code returns a value and nothing was logged, log the result
        if (result !== undefined && logs.length === 0) {
            logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
        }

        self.postMessage({
            stdout: logs.join('\\n'),
            stderr: errors.join('\\n'),
            error: null,
            executionTime: Math.round(execTime),
            status: errors.length > 0 ? 'error' : 'success',
        });
    } catch (err) {
        const execTime = performance.now() - startTime;
        self.postMessage({
            stdout: logs.join('\\n'),
            stderr: errors.join('\\n'),
            error: err.message || String(err),
            executionTime: Math.round(execTime),
            status: 'error',
        });
    }
};
`;

export function runJavaScript(code: string, timeoutMs: number = 5000): Promise<CodeExecutionResult> {
    return new Promise((resolve) => {
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)
        const worker = new Worker(url)

        const timer = setTimeout(() => {
            worker.terminate()
            URL.revokeObjectURL(url)
            resolve({
                stdout: '',
                stderr: '',
                error: 'Execution timed out (5s limit)',
                executionTime: timeoutMs,
                status: 'timeout',
            })
        }, timeoutMs)

        worker.onmessage = (e) => {
            clearTimeout(timer)
            worker.terminate()
            URL.revokeObjectURL(url)
            resolve(e.data as CodeExecutionResult)
        }

        worker.onerror = (e) => {
            clearTimeout(timer)
            worker.terminate()
            URL.revokeObjectURL(url)
            resolve({
                stdout: '',
                stderr: '',
                error: e.message || 'Worker error',
                executionTime: 0,
                status: 'error',
            })
        }

        worker.postMessage({ code, timeout: timeoutMs })
    })
}
