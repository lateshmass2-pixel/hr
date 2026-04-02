'use client'

import { useRef, useCallback } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkspaceFile } from '@/types/workspace'

interface CodeEditorProps {
    files: WorkspaceFile[]
    activeFile: WorkspaceFile | null
    openTabs: WorkspaceFile[]
    onTabSelect: (file: WorkspaceFile) => void
    onTabClose: (fileId: string) => void
    onContentChange: (fileId: string, content: string) => void
    onSave: () => void
    onRun: () => void
    readOnly?: boolean
}

const LANGUAGE_ICONS: Record<string, string> = {
    javascript: '🟨',
    typescript: '🔷',
    python: '🐍',
    html: '🌐',
    css: '🎨',
    json: '📋',
    markdown: '📝',
}

// Map file language to Monaco language ID
function getMonacoLanguage(language: string): string {
    const map: Record<string, string> = {
        javascript: 'javascript',
        typescript: 'typescript',
        python: 'python',
        html: 'html',
        css: 'css',
        json: 'json',
        markdown: 'markdown',
    }
    return map[language] || 'plaintext'
}

export function CodeEditor({
    activeFile,
    openTabs,
    onTabSelect,
    onTabClose,
    onContentChange,
    onSave,
    onRun,
    readOnly = false,
}: CodeEditorProps) {
    const editorRef = useRef<any>(null)

    const handleEditorMount: OnMount = useCallback((editor, monaco) => {
        editorRef.current = editor

        // Set custom theme
        monaco.editor.defineTheme('hems-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'type', foreground: '4EC9B0' },
            ],
            colors: {
                'editor.background': '#0D1117',
                'editor.foreground': '#E6EDF3',
                'editor.lineHighlightBackground': '#161B22',
                'editor.selectionBackground': '#264F78',
                'editorLineNumber.foreground': '#484F58',
                'editorLineNumber.activeForeground': '#E6EDF3',
                'editor.inactiveSelectionBackground': '#1A2332',
                'editorCursor.foreground': '#10B981',
                'editorWhitespace.foreground': '#21262D',
                'editorIndentGuide.background': '#21262D',
                'editorIndentGuide.activeBackground': '#30363D',
            },
        })

        monaco.editor.setTheme('hems-dark')

        // Register keyboard shortcuts
        editor.addAction({
            id: 'save-file',
            label: 'Save File',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => onSave(),
        })

        editor.addAction({
            id: 'run-code',
            label: 'Run Code',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            run: () => onRun(),
        })

        // Configure editor settings
        editor.updateOptions({
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
            fontLigatures: true,
            lineHeight: 22,
            letterSpacing: 0.3,
            padding: { top: 16, bottom: 16 },
            minimap: { enabled: false },
            scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
            },
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'expand',
            cursorSmoothCaretAnimation: 'on',
            wordWrap: 'on',
            tabSize: 2,
            formatOnPaste: true,
        })
    }, [onSave, onRun])

    return (
        <div className="flex flex-col h-full bg-[#0D1117]">
            {/* Tab Bar */}
            <div className="flex items-center bg-[#0F172A] border-b border-white/5 overflow-x-auto scrollbar-hide">
                {openTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabSelect(tab)}
                        className={cn(
                            'group flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-r border-white/5 min-w-0 shrink-0 transition-all duration-150',
                            activeFile?.id === tab.id
                                ? 'bg-[#0D1117] text-gray-200 border-b-2 border-b-emerald-500'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        )}
                    >
                        <span className="text-sm leading-none">
                            {LANGUAGE_ICONS[tab.language] || '📄'}
                        </span>
                        <span className="truncate max-w-[120px]">{tab.file_name}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onTabClose(tab.id)
                            }}
                            className={cn(
                                'p-0.5 rounded hover:bg-white/10 transition-colors shrink-0',
                                activeFile?.id === tab.id
                                    ? 'text-gray-400 hover:text-gray-200'
                                    : 'text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100'
                            )}
                        >
                            <X size={10} />
                        </button>
                    </button>
                ))}

                {openTabs.length === 0 && (
                    <div className="px-4 py-2 text-xs text-gray-600">
                        No files open
                    </div>
                )}
            </div>

            {/* Editor */}
            <div className="flex-1 relative">
                {activeFile ? (
                    <Editor
                        key={activeFile.id}
                        defaultValue={activeFile.content}
                        language={getMonacoLanguage(activeFile.language)}
                        theme="hems-dark"
                        onMount={handleEditorMount}
                        onChange={(value) => {
                            if (value !== undefined) {
                                onContentChange(activeFile.id, value)
                            }
                        }}
                        options={{
                            readOnly,
                            domReadOnly: readOnly,
                        }}
                        loading={
                            <div className="flex items-center justify-center h-full bg-[#0D1117]">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                    <span className="text-xs text-gray-500">Loading editor...</span>
                                </div>
                            </div>
                        }
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-4xl mb-3">💻</div>
                            <p className="text-sm text-gray-500 font-medium">Select a file to start coding</p>
                            <p className="text-xs text-gray-600 mt-1">or create a new file from the explorer</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            {activeFile && (
                <div className="flex items-center justify-between px-3 py-1 bg-[#0A3B2A] text-[10px] text-emerald-200/60 border-t border-emerald-500/20">
                    <div className="flex items-center gap-3">
                        <span>{activeFile.language}</span>
                        <span>UTF-8</span>
                        <span>Tab Size: 2</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {readOnly && (
                            <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                                Read Only
                            </span>
                        )}
                        <span>Ln 1, Col 1</span>
                    </div>
                </div>
            )}
        </div>
    )
}
