import Link from "next/link"
import { getProjects } from "./actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowRight, Layout } from "lucide-react"
import { format } from "date-fns"
import { NewProjectDialog } from "./new-project-dialog"

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
    const projects = await getProjects()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground">Manage ongoing initiatives and track progress.</p>
                </div>
                <NewProjectDialog />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                        <Card className="h-full hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant={
                                        project.status === 'ACTIVE' ? 'default' :
                                            project.status === 'COMPLETED' ? 'secondary' : 'outline'
                                    } className={
                                        project.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : ''
                                    }>
                                        {project.status}
                                    </Badge>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                </div>
                                <CardTitle className="mt-2 group-hover:text-blue-500 transition-colors">{project.title}</CardTitle>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {project.description || "No description provided."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {project.due_date ? format(new Date(project.due_date), "MMM d, yyyy") : "No deadline"}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                {/* Progress Bar Placeholder - Can be real later */}
                                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full w-[0%]" />
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}

                {projects.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-lg border-muted">
                        <Layout className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No projects yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first project to get started</p>
                        <NewProjectDialog />
                    </div>
                )}
            </div>
        </div>
    )
}
