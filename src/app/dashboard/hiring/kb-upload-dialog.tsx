'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, CheckCircle2, AlertCircle, Loader2, FileUp, Trash2, FileText, RefreshCw } from "lucide-react"
import { uploadKnowledgeBase, getKnowledgeBaseFiles, deleteKnowledgeBaseFile } from "./kb-actions"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

export function KBUploadDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [results, setResults] = useState<any[]>([])
    const [currentFileIndex, setCurrentFileIndex] = useState(0)

    // KB File Listing State
    const [kbFiles, setKbFiles] = useState<any[]>([])
    const [loadingFiles, setLoadingFiles] = useState(false)

    const fetchFiles = async () => {
        setLoadingFiles(true)
        const files = await getKnowledgeBaseFiles()
        setKbFiles(files)
        setLoadingFiles(false)
    }

    // Helper to remove UUID prefix (36 chars + 1 hyphen)
    const getDisplayName = (fileName: string) => {
        if (fileName.length > 37 && fileName.charAt(36) === '-') {
            return fileName.substring(37)
        }
        return fileName
    }

    useEffect(() => {
        if (isOpen) {
            setFiles([])
            setResults([])
            setCurrentFileIndex(0)
            fetchFiles()
        }
    }, [isOpen])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files))
            setResults([])
            setCurrentFileIndex(0)
        }
    }

    const handleDelete = async (fileName: string) => {
        const confirm = window.confirm(`Are you sure you want to delete ${fileName}? This will remove it from the knowledge base.`)
        if (!confirm) return

        toast.promise(deleteKnowledgeBaseFile(fileName), {
            loading: 'Deleting file...',
            success: () => {
                fetchFiles()
                return 'File deleted successfully'
            },
            error: 'Failed to delete file'
        })
    }

    const handleUpload = async () => {
        setUploading(true)
        setResults([])

        for (let i = 0; i < files.length; i++) {
            setCurrentFileIndex(i)
            const file = files[i]
            const formData = new FormData()
            formData.append('file', file)
            formData.append('documentName', file.name)

            try {
                const result = await uploadKnowledgeBase(formData)
                setResults(prev => [...prev, {
                    fileName: file.name,
                    status: result.success ? 'success' : 'error',
                    message: result.message,
                    details: result.success ? `${result.chunkCount} chunks indexed` : result.message
                }])
            } catch (error: any) {
                setResults(prev => [...prev, { fileName: file.name, status: 'error', message: error.message }])
            }
        }
        setUploading(false)
        fetchFiles() // Refresh list after upload
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-dashed border-gray-300 text-gray-600 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50">
                    <BookOpen className="mr-2 h-4 w-4" /> Add to Knowledge Base
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Update Knowledge Base</DialogTitle>
                    <DialogDescription>
                        Manage internal documentation (PDFs) to train the RAG system.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
                    {/* UPLOAD SECTION */}
                    <div className="space-y-4 p-4 border border-dashed rounded-xl bg-gray-50/50">
                        <Label className="text-violet-700 font-semibold flex items-center gap-2">
                            <FileUp size={16} /> Upload New Documents
                        </Label>
                        <div className="grid gap-2">
                            <Input
                                id="kb-file"
                                type="file"
                                accept=".pdf, .txt, .md"
                                multiple
                                onChange={handleFileChange}
                                disabled={uploading}
                                className="bg-white"
                            />
                        </div>

                        {files.length > 0 && (
                            <div className="text-xs text-muted-foreground flex justify-between items-center">
                                <span>{files.length} file(s) selected</span>
                                <Button size="sm" onClick={handleUpload} disabled={uploading}>
                                    {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Start Ingestion"}
                                </Button>
                            </div>
                        )}

                        {/* Progress & Results */}
                        {uploading && (
                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-xs">
                                    <span>Ingesting {files[currentFileIndex]?.name}...</span>
                                    <span>{currentFileIndex + 1} / {files.length}</span>
                                </div>
                                <Progress value={((currentFileIndex + 1) / files.length) * 100} className="h-2" />
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="space-y-2">
                                {results.map((res, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-2 rounded text-xs ${res.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {res.status === 'success' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                                            <span className="truncate max-w-[250px] font-medium">{res.fileName}</span>
                                        </div>
                                        <span className="opacity-80">{res.details}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* EXISTING FILES SECTION */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold flex items-center gap-2 text-gray-700">
                                <BookOpen size={16} /> Existing Documents
                            </Label>
                            <Button variant="ghost" size="icon" onClick={fetchFiles} disabled={loadingFiles}>
                                <RefreshCw size={14} className={loadingFiles ? "animate-spin" : ""} />
                            </Button>
                        </div>

                        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                            {loadingFiles ? (
                                <div className="p-8 flex justify-center text-gray-400">
                                    <Loader2 className="animate-spin w-6 h-6" />
                                </div>
                            ) : kbFiles.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No documents in Knowledge Base.
                                </div>
                            ) : (
                                <ScrollArea className="h-[200px]">
                                    <div className="divide-y divide-gray-100">
                                        {kbFiles.map((file) => (
                                            <div key={file.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-700 truncate max-w-[280px]">
                                                            {getDisplayName(file.name)}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {new Date(file.created_at).toLocaleDateString()} • {(file.metadata?.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                    onClick={() => handleDelete(file.name)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
