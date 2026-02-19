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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { processApplication, getJobs } from "./actions"
import { Progress } from "@/components/ui/progress"

type Job = {
    id: string
    title: string
}

export function UploadDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [results, setResults] = useState<any[]>([])
    const [currentFileIndex, setCurrentFileIndex] = useState(0)
    const [expectedSkills, setExpectedSkills] = useState("")

    useEffect(() => {
        if (isOpen) {
            // Reset state when dialog opens
            setFiles([])
            setResults([])
            setExpectedSkills("")
            setCurrentFileIndex(0)
        }
    }, [isOpen])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files))
            setResults([])
            setCurrentFileIndex(0)
        }
    }

    const handleUpload = async () => {
        setUploading(true)
        setResults([])

        // Process files sequentially to avoid hitting rate limits or overwhelming the server
        for (let i = 0; i < files.length; i++) {
            setCurrentFileIndex(i)
            const file = files[i]
            const formData = new FormData()
            formData.append('resume', file)

            if (expectedSkills.trim()) {
                formData.append('expectedSkills', expectedSkills)
            }
            // We don't send name/email here, relying on AI extraction

            try {
                const result = await processApplication(formData)
                setResults(prev => [...prev, { fileName: file.name, status: result.message === 'Success' ? 'success' : 'error', message: result.message, score: result.score }])
            } catch (error: any) {
                setResults(prev => [...prev, { fileName: file.name, status: 'error', message: error.message }])
            }
        }
        setUploading(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Upload className="mr-2 h-4 w-4" /> Upload Resumes
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk Resume Upload</DialogTitle>
                    <DialogDescription>
                        Upload resumes and define required skills. Candidates missing these skills will be automatically rejected.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="skills">Required Skills</Label>
                        <Input
                            id="skills"
                            placeholder="e.g. React, Node.js, Python (comma separated)"
                            value={expectedSkills}
                            onChange={(e) => setExpectedSkills(e.target.value)}
                            disabled={uploading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Candidates scored below 50% on these skills will be auto-rejected.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="resume">Select Files (PDF)</Label>
                        <Input
                            id="resume"
                            type="file"
                            accept=".pdf"
                            multiple
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </div>

                    {files.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            {files.length} file(s) selected
                        </div>
                    )}

                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span>Processing {files[currentFileIndex].name}...</span>
                                <span>{currentFileIndex + 1} / {files.length}</span>
                            </div>
                            <Progress value={((currentFileIndex + 1) / files.length) * 100} />
                        </div>
                    )}

                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {results.map((res, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded text-sm ${res.status === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {res.status === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                                    <span className="truncate max-w-[200px]">{res.fileName}</span>
                                </div>
                                {res.status === 'success' && <span className="text-xs font-mono font-bold">Score: {res.score}</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleUpload} disabled={uploading || files.length === 0} className="bg-[#14532d] hover:bg-[#166534]">
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Upload & Parse Candidates'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
