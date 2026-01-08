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
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Projects</h2>
                    <p className="text-gray-500 mt-1">Manage ongoing initiatives and track progress.</p>
                </div>
                <NewProjectDialog />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    // Calculate progress based on tasks (mock for now - can be enhanced)
                    const progress = project.status === 'COMPLETED' ? 100 : project.status === 'ACTIVE' ? 45 : 0

                    return (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                            <div className="group relative h-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 cursor-pointer overflow-hidden">
                                {/* Hover gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="relative p-6 space-y-4">
                                    {/* Header: Status + Menu */}
                                    <div className="flex justify-between items-start gap-2">
                                        <Badge className={
                                            project.status === 'ACTIVE'
                                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                : project.status === 'COMPLETED'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                                        }>
                                            {project.status}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
                                            <ArrowRight className="h-4 w-4 text-orange-600 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0" />
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                                        {project.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px] leading-relaxed">
                                        {project.description || "No description provided."}
                                    </p>

                                    {/* Footer: Team Avatars + Due Date */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        {/* Stacked Avatars */}
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-400 border-2 border-white flex items-center justify-center text-white text-[10px] font-semibold"
                                                >
                                                    {String.fromCharCode(64 + i)}
                                                </div>
                                            ))}
                                            <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-600 text-[10px] font-semibold">
                                                +2
                                            </div>
                                        </div>

                                        {/* Due Date */}
                                        <div className="flex items-center text-xs text-gray-500">
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
                    <div className="col-span-full py-20 text-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                        <Layout className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
                        <p className="text-gray-500 mb-4">Create your first project to get started</p>
                        <NewProjectDialog />
                    </div>
                )}
            </div>
        </div>
    )
}
