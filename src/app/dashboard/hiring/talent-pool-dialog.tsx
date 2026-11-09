'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Users, Loader2, Search, FileText, Sparkles } from "lucide-react"
import { getJobs, matchCandidatesForJob } from "./actions"

type Job = {
    id: string
    title: string
}

type Match = {
    id: string
    candidate_name: string | null
    candidate_email: string | null
    resume_url: string | null
    skills: string[] | null
    similarity: number
    score: number
    rankScore: number
}

function scoreColor(score: number) {
    if (score >= 70) return "bg-green-100 text-green-700 border-green-200"
    if (score >= 45) return "bg-amber-100 text-amber-700 border-amber-200"
    return "bg-red-100 text-red-700 border-red-200"
}

export function TalentPoolDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [jobs, setJobs] = useState<Job[]>([])
    const [selectedJobId, setSelectedJobId] = useState<string>("")
    const [loading, setLoading] = useState(false)
    const [matches, setMatches] = useState<Match[]>([])
    const [searched, setSearched] = useState(false)
    const [error, setError] = useState<string>("")

    useEffect(() => {
        if (isOpen) {
            setSelectedJobId("")
            setMatches([])
            setSearched(false)
            setError("")
            getJobs().then((data) => setJobs((data as Job[]) || []))
        }
    }, [isOpen])

    const handleMatch = async () => {
        if (!selectedJobId) return
        setLoading(true)
        setError("")
        setSearched(true)
        try {
            const result = await matchCandidatesForJob(selectedJobId)
            if (!result.success) {
                setError(result.message || "Matching failed")
                setMatches([])
            } else {
                setMatches(result.matches)
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Matching failed")
            setMatches([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" /> Talent Pool
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-700" /> Match Talent Pool to a Role
                    </DialogTitle>
                    <DialogDescription>
                        Rank every saved resume against a role by cosine similarity. The big number is the
                        relative fit (normalized across these results for easy ranking); &ldquo;match&rdquo; is the
                        absolute similarity.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="flex items-end gap-2">
                        <div className="grid gap-2 flex-1">
                            <Select value={selectedJobId} onValueChange={setSelectedJobId} disabled={loading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role to match..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {jobs.length === 0 && (
                                        <SelectItem value="none" disabled>
                                            No open roles found
                                        </SelectItem>
                                    )}
                                    {jobs.map((job) => (
                                        <SelectItem key={job.id} value={job.id}>
                                            {job.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={handleMatch}
                            disabled={!selectedJobId || loading}
                            className="bg-[#14532d] hover:bg-[#166534]"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            <span className="ml-2">Find Matches</span>
                        </Button>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="max-h-[360px] overflow-y-auto space-y-2">
                        {searched && !loading && matches.length === 0 && !error && (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                No resumes in the talent pool matched this role yet.
                            </p>
                        )}

                        {matches.map((m) => (
                            <div
                                key={m.id}
                                className="flex items-start justify-between gap-3 rounded-lg border p-3"
                            >
                                <div className="min-w-0">
                                    <div className="font-medium truncate">
                                        {m.candidate_name || "Unknown Candidate"}
                                    </div>
                                    {m.candidate_email && (
                                        <div className="text-xs text-muted-foreground truncate">
                                            {m.candidate_email}
                                        </div>
                                    )}
                                    {m.skills && m.skills.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {m.skills.slice(0, 6).map((s, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px]">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    {m.resume_url && (
                                        <a
                                            href={m.resume_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                                        >
                                            <FileText className="h-3 w-3" /> View resume
                                        </a>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <Badge className={`font-mono ${scoreColor(m.rankScore)}`}>
                                        {m.rankScore}%
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        match {m.score}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
