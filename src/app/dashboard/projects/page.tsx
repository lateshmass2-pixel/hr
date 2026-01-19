import Link from "next/link"
import { getProjects } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowRight, Layout, MoreVertical } from "lucide-react"
import { format } from "date-fns"
import { NewProjectDialog } from "./new-project-dialog"
import { DeleteProjectButton } from "./delete-project-button"

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
    const projects = await getProjects()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Projects</h2>
                    <p className="text-zinc-400 mt-1">Manage ongoing initiatives and track progress.</p>
                </div>
                <NewProjectDialog />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    // Calculate progress based on tasks (mock for now - can be enhanced)
                    const progress = project.status === 'COMPLETED' ? 100 : project.status === 'ACTIVE' ? 45 : 0

                    return (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                            <div className="group relative h-full bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] shadow-lg hover:border-violet-500/50 transition-all duration-300 cursor-pointer overflow-hidden">
                                {/* Hover gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="relative p-6 space-y-4">
                                    {/* Header: Status + Menu */}
                                    <div className="flex justify-between items-start gap-2">
                                        <Badge className={
                                            project.status === 'ACTIVE'
                                                ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                                                : project.status === 'COMPLETED'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                    : 'bg-zinc-700 text-zinc-300 border-zinc-600'
                                        }>
                                            {project.status}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
                                            <ArrowRight className="h-4 w-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0" />
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                                        {project.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-zinc-400 line-clamp-2 min-h-[40px] leading-relaxed">
                                        {project.description || "No description provided."}
                                    </p>

                                    {/* Footer: Team Avatars + Due Date */}
                                    <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
                                        {/* Stacked Avatars */}
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-400 border-2 border-[#1a1a1a] flex items-center justify-center text-white text-[10px] font-semibold"
                                                >
                                                    {String.fromCharCode(64 + i)}
                                                </div>
                                            ))}
                                            <div className="w-7 h-7 rounded-full bg-[#2a2a2a] border-2 border-[#1a1a1a] flex items-center justify-center text-zinc-400 text-[10px] font-semibold">
                                                +2
                                            </div>
                                        </div>

                                        {/* Due Date */}
                                        <div className="flex items-center text-xs text-zinc-500">
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
                    <div className="col-span-full py-20 text-center rounded-xl border-2 border-dashed border-[#333] bg-[#1a1a1a]">
                        <Layout className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white">No projects yet</h3>
                        <p className="text-zinc-400 mb-4">Create your first project to get started</p>
                        <NewProjectDialog />
                    </div>
                )}
            </div>
        </div>
    )
}
