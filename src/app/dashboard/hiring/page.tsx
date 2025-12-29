import { createClient } from "@/lib/supabase/server"
import { UploadDialog } from "./upload-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ExternalLink, Mail, Zap } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

async function getApplications() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
    return data || []
}

export default async function HiringDashboard() {
    const applications = await getApplications()

    // Group applications by status
    const columns = {
        'NEW': applications.filter(a => a.status === 'NEW'), // Should unlikely exist if processed immedately, but good for failsafe
        'TEST_PENDING': applications.filter(a => a.status === 'TEST_PENDING'),
        'INTERVIEW_READY': applications.filter(a => a.status === 'INTERVIEW_READY'),
        'REJECTED': applications.filter(a => a.status === 'REJECTED'),
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Hiring Pipeline</h2>
                    <p className="text-muted-foreground">AI-automated candidate tracking.</p>
                </div>
                <UploadDialog />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-[500px]">
                {/* Test Pending Column */}
                <StatusColumn title="Screening / Test Pending" count={columns['TEST_PENDING'].length} color="bg-blue-500/5">
                    {columns['TEST_PENDING'].map(app => (
                        <ApplicationCard key={app.id} app={app} />
                    ))}
                </StatusColumn>

                {/* Interview Ready Column */}
                <StatusColumn title="Interview Ready" count={columns['INTERVIEW_READY'].length} color="bg-green-500/5">
                    {columns['INTERVIEW_READY'].map(app => (
                        <ApplicationCard key={app.id} app={app} />
                    ))}
                </StatusColumn>

                {/* Rejected Column */}
                <StatusColumn title="Rejected (AI)" count={columns['REJECTED'].length} color="bg-red-500/5">
                    {columns['REJECTED'].map(app => (
                        <ApplicationCard key={app.id} app={app} />
                    ))}
                </StatusColumn>

                {/* Other/New Column */}
                {columns['NEW'].length > 0 && (
                    <StatusColumn title="Unprocessed" count={columns['NEW'].length} color="bg-zinc-500/5">
                        {columns['NEW'].map(app => (
                            <ApplicationCard key={app.id} app={app} />
                        ))}
                    </StatusColumn>
                )}
            </div>
        </div>
    )
}

function StatusColumn({ title, count, children, color }: { title: string, count: number, children: React.ReactNode, color: string }) {
    return (
        <div className={`flex flex-col h-full rounded-lg border border-border/50 ${color}`}>
            <div className="p-3 border-b bg-background/50 backdrop-blur flex justify-between items-center rounded-t-lg">
                <h3 className="font-semibold text-sm">{title}</h3>
                <Badge variant="secondary">{count}</Badge>
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    )
}

function ApplicationCard({ app }: { app: any }) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="p-3 pb-2 space-y-1">
                <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm line-clamp-1" title={app.candidate_name}>
                        {app.candidate_name || "Unknown Candidate"}
                    </h4>
                    {app.score !== null && (
                        <Badge variant={app.score >= 60 ? 'default' : 'destructive'} className="text-[10px] px-1 h-5">
                            {app.score}
                        </Badge>
                    )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {app.candidate_email}
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                    {app.ai_reasoning || "No AI summary available."}
                </p>

                <div className="mt-3 flex gap-2">
                    {app.status === 'TEST_PENDING' && (
                        <Link href={`/assessment/${app.id}`} target="_blank" className="w-full">
                            <Badge variant="outline" className="w-full justify-center cursor-pointer hover:bg-secondary">
                                <ExternalLink className="mr-1 h-3 w-3" /> Test Link
                            </Badge>
                        </Link>
                    )}
                    {app.resume_url && (
                        <Link href={app.resume_url} target="_blank" className="w-full">
                            <Badge variant="secondary" className="w-full justify-center cursor-pointer">
                                PDF
                            </Badge>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
