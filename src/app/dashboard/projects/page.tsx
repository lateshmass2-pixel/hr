import Link from "next/link"
import { getProjects } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowRight, Layout, MoreVertical, CheckSquare, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { NewProjectDialog } from "./new-project-dialog"
import { DeleteProjectButton } from "./delete-project-button"

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
    const projects = await getProjects()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <CheckSquare className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Projects</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Manage ongoing initiatives and track progress.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Help Bubble */}
                    <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border border-[#e8e4e0]">
                        <Sparkles className="w-4 h-4 text-[#e07850]" />
                        <span className="text-[#1a1a1a] text-sm font-medium">Need help?</span>
                        <span className="text-lg">👋</span>
                    </div>
                    <NewProjectDialog />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    // Calculate progress based on tasks (mock for now - can be enhanced)
                    const progress = project.status === 'COMPLETED' ? 100 : project.status === 'ACTIVE' ? 45 : 0

                    return (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                            <div className="group relative h-full bg-white rounded-3xl border border-[#e8e4e0] shadow-md hover:shadow-lg hover:border-[#e07850]/30 transition-all duration-300 cursor-pointer overflow-hidden">
                                {/* Hover gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#e07850]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="relative p-6 space-y-4">
                                    {/* Header: Status + Menu */}
                                    <div className="flex justify-between items-start gap-2">
                                        <Badge className={
                                            project.status === 'ACTIVE'
                                                ? 'bg-[#e07850]/10 text-[#e07850] border-[#e07850]/20'
                                                : project.status === 'COMPLETED'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-[#f5f3f0] text-[#6b6b6b] border-[#e8e4e0]'
                                        }>
                                            {project.status}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
                                            <ArrowRight className="h-4 w-4 text-[#e07850] opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0" />
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-[#1a1a1a] group-hover:text-[#e07850] transition-colors">
                                        {project.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-[#6b6b6b] line-clamp-2 min-h-[40px] leading-relaxed">
                                        {project.description || "No description provided."}
                                    </p>

                                    {/* Footer: Team Avatars + Due Date */}
                                    <div className="flex items-center justify-between pt-2 border-t border-[#e8e4e0]">
                                        {/* Stacked Avatars */}
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] border-2 border-white flex items-center justify-center text-white text-[10px] font-semibold shadow-sm"
                                                >
                                                    {String.fromCharCode(64 + i)}
                                                </div>
                                            ))}
                                            <div className="w-7 h-7 rounded-full bg-[#f5f3f0] border-2 border-white flex items-center justify-center text-[#6b6b6b] text-[10px] font-semibold">
                                                +2
                                            </div>
                                        </div>

                                        {/* Due Date */}
                                        <div className="flex items-center text-xs text-[#a0a0a0]">
                                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                                            {project.due_date ? format(new Date(project.due_date), "MMM d, yyyy") : "No deadline"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )
                })}

                {projects.length === 0 && (
                    <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-[#e8e4e0] bg-white shadow-sm">
                        <Layout className="h-10 w-10 text-[#a0a0a0] mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-[#1a1a1a]">No projects yet</h3>
                        <p className="text-[#6b6b6b] mb-4">Create your first project to get started</p>
                        <NewProjectDialog />
                    </div>
                )}
            </div>
        </div>
    )
}
