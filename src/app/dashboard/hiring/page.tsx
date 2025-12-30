import { createClient } from "@/lib/supabase/server"
import { UploadDialog } from "./upload-dialog"
import { DeleteApplicationButton } from "./delete-button"
import { HireDialog } from "./hire-dialog"
import { CreateJobDialog } from "./create-job-dialog"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Mail, CheckCircle2 } from "lucide-react"
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
        'NEW': applications.filter(a => a.status === 'NEW'),
        'TEST_PENDING': applications.filter(a => a.status === 'TEST_PENDING'),
        'INTERVIEW': applications.filter(a => a.status === 'INTERVIEW'),
        'HIRED': applications.filter(a => a.status === 'HIRED'),
        'REJECTED': applications.filter(a => a.status === 'REJECTED'),
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Hiring Pipeline</h2>
                    <p className="text-muted-foreground">AI-automated candidate tracking.</p>
                </div>
                <div className="flex gap-2">
                    <CreateJobDialog />
                    <UploadDialog />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 flex-1 min-h-[500px]">
                {/* Test Pending Column */}
                <StatusColumn title="Screening / Test" count={columns['TEST_PENDING'].length} color="bg-blue-500/5">
                    {columns['TEST_PENDING'].map(app => (
                        <ApplicationCard key={app.id} app={app} />
                    ))}
                </StatusColumn>

                {/* Interview Ready Column */}
                <StatusColumn title="Interview Ready" count={columns['INTERVIEW'].length} color="bg-green-500/5">
                    {columns['INTERVIEW'].map(app => (
                        <ApplicationCard key={app.id} app={app} showHireButton />
                    ))}
                </StatusColumn>

                {/* Hired Column */}
                <StatusColumn title="Hired" count={columns['HIRED'].length} color="bg-purple-500/5">
                    {columns['HIRED'].map(app => (
                        <ApplicationCard key={app.id} app={app} isHired />
                    ))}
                </StatusColumn>

                {/* Rejected Column */}
                <StatusColumn title="Rejected" count={columns['REJECTED'].length} color="bg-red-500/5">
                    {columns['REJECTED'].map(app => (
                        <ApplicationCard key={app.id} app={app} />
                    ))}
                </StatusColumn>

                {/* Unprocessed Column */}
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

function ApplicationCard({ app, showHireButton, isHired }: { app: any, showHireButton?: boolean, isHired?: boolean }) {
    return (
        <Card className={`hover:shadow-md transition-shadow ${isHired ? 'border-purple-200 bg-purple-50/50' : ''}`}>
            <CardHeader className="p-3 pb-2 space-y-1">
                <div className="flex justify-between items-start gap-1">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                        {isHired && <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />}
                        <h4 className="font-medium text-sm line-clamp-1" title={app.candidate_name}>
                            {app.candidate_name || "Unknown Candidate"}
                        </h4>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {(app.score !== null || app.test_score !== null) && (
                            <Badge
                                variant={(app.test_score || app.score) >= 60 ? 'default' : 'destructive'}
                                className="text-[10px] px-1 h-5"
                            >
                                {app.test_score ?? app.score}
                            </Badge>
                        )}
                        {(app.status === 'TEST_PENDING' || app.status === 'REJECTED' || app.status === 'NEW') && (
                            <DeleteApplicationButton
                                applicationId={app.id}
                                candidateName={app.candidate_name || 'Unknown'}
                            />
                        )}
                    </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {app.candidate_email}
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                    {app.ai_reasoning?.substring(0, 100) || "No AI summary available."}
                </p>

                <div className="mt-3 flex gap-2 flex-wrap">
                    {app.status === 'TEST_PENDING' && (
                        <Link href={`/assessment/${app.id}`} target="_blank" className="flex-1">
                            <Badge variant="outline" className="w-full justify-center cursor-pointer hover:bg-secondary">
                                <ExternalLink className="mr-1 h-3 w-3" /> Test Link
                            </Badge>
                        </Link>
                    )}

                    {showHireButton && (
                        <HireDialog application={{
                            id: app.id,
                            candidate_name: app.candidate_name,
                            candidate_email: app.candidate_email,
                            score: app.score,
                            test_score: app.test_score
                        }} />
                    )}

                    {isHired && app.offer_role && (
                        <Badge variant="secondary" className="text-xs">
                            {app.offer_role}
                        </Badge>
                    )}

                    {app.resume_url && (
                        <Link href={app.resume_url} target="_blank">
                            <Badge variant="secondary" className="cursor-pointer">
                                PDF
                            </Badge>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
