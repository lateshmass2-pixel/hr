"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { deleteProject as deleteProjectAction, createProject as createProjectAction, getProjects as getProjectsAction } from "@/app/dashboard/projects/actions"
import { assertProfileRecord, assertLeaveRequestRecord, assertProjectRecord, assertTaskRecord } from "@/lib/database/types"
import type { ProfileRecord, LeaveRequestRecord, ProjectRecord, TaskRecord } from "@/lib/database/types"

// Types extracted to @/types/hems — re-export for backward compatibility
export type {
    GlobalRole, ProjectRole, EmployeeStatus,
    User, Employee, LeaveType, LeaveStatus, Leave,
    Activity, TaskStatus, VerificationStatus, Task, Team, Project,
    Candidate, Job, Announcement, Course,
    HemsContextType,
} from "@/types/hems"

import type {
    User, Employee, Leave, Job, Announcement, Course,
    Project, Team, Task, Candidate,
    GlobalRole, ProjectRole, TaskStatus,
    EmployeeStatus, LeaveStatus, VerificationStatus,
    HemsContextType,
} from "@/types/hems"

// Create context
const HemsContext = createContext<HemsContextType | undefined>(undefined)

// ============================================================================
// Default User (for initial load before auth)
// ============================================================================

const DEFAULT_USER: User = {
    id: '',
    name: 'Guest',
    globalRole: 'STANDARD_USER',
    avatar: '',
    jobTitle: '',
    status: 'Active'
}

// ============================================================================
// Provider Component
// ============================================================================

export function HemsProvider({ children }: { children: ReactNode }) {
    // Current user (will be set from Supabase auth)
    const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER)

    // Legacy role support
    const [userRole, setUserRole] = useState<"HR" | "EMPLOYEE">("HR")

    // Data states - all start empty, fetched from DB
    const [employees, setEmployees] = useState<Employee[]>([])
    const [leaves, setLeaves] = useState<Leave[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [courses, setCourses] = useState<Course[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const supabase = createClient()

    // Computed values for courses
    const enrolledCourses = courses.filter((c) => c.enrolled)
    const availableCourses = courses.filter((c) => !c.enrolled)

    useEffect(() => {
        refreshData()
    }, [])

    // ========================================================================
    // Helper Functions - Dynamic Role Calculation
    // ========================================================================

    const getProjectRole = (projectId: string): ProjectRole => {
        const project = projects.find(p => p.id === projectId)
        if (!project) return 'VIEWER'

        // HR_ADMIN should have full access to manage the project
        if (currentUser.globalRole === 'HR_ADMIN') return 'LEADER'

        if (project.teamLeadId === currentUser.id) return 'LEADER'
        if (project.memberIds?.includes(currentUser.id)) return 'MEMBER'
        return 'VIEWER'
    }

    const getProjectsAsLeader = (): Project[] => {
        return projects.filter(p => p.teamLeadId === currentUser.id)
    }

    const getProjectsAsMember = (): Project[] => {
        return projects.filter(p =>
            p.memberIds?.includes(currentUser.id) && p.teamLeadId !== currentUser.id
        )
    }

    const getMyTasks = (): Task[] => {
        return tasks.filter(t => t.assigneeId === currentUser.id)
    }

    // ========================================================================
    // Data Fetching
    // ========================================================================

    const refreshData = async () => {
        setIsLoading(true)
        try {
            // Fetch ALL data concurrently to prevent network waterfalls and reduce load time
            const [
                { data: { user } },
                { data: profiles },
                { data: leaveRequests },
                { data: dbProjects },
                { data: dbTasks }
            ] = await Promise.all([
                supabase.auth.getUser(),
                supabase.from('profiles').select('*'),
                supabase.from('leave_requests').select('*'),
                getProjectsAction().then((res) => ({ data: res })), // Proxy to server action
                supabase.from('tasks').select('*')
            ])

            if (user && profiles && Array.isArray(profiles)) {
                // Find current user's profile from the already-fetched list instead of a separate DB call
                const profile = (profiles as any[]).find(p => p.id === user.id)
                if (profile) {
                    setCurrentUser({
                        id: profile.id,
                        name: profile.full_name || user.email?.split('@')[0] || 'User',
                        globalRole: profile.role === 'HR_ADMIN' ? 'HR_ADMIN' : 'STANDARD_USER',
                        avatar: profile.avatar_url,
                        jobTitle: profile.position,
                        status: 'Active'
                    })
                }
            }

            if (profiles && Array.isArray(profiles)) {
                const mappedEmployees: Employee[] = (profiles as unknown as ProfileRecord[])
                    .filter((p: ProfileRecord) => p.role !== 'HR_ADMIN')
                    .map((p: ProfileRecord) => ({
                        id: p.id,
                        full_name: p.full_name || 'Unknown',
                        email: p.email || '',
                        position: p.position || 'Employee',
                        department: p.department || 'General',
                        status: 'Active' as EmployeeStatus,
                        created_at: p.created_at,
                        avatar_url: p.avatar_url ?? undefined
                    }))
                setEmployees(mappedEmployees)

                // Also set users from profiles
                const mappedUsers: User[] = (profiles as unknown as ProfileRecord[]).map((p: ProfileRecord) => ({
                    id: p.id,
                    name: p.full_name || 'Unknown',
                    globalRole: p.role === 'HR_ADMIN' ? 'HR_ADMIN' : 'STANDARD_USER',
                    avatar: p.avatar_url ?? undefined,
                    jobTitle: p.position ?? undefined,
                    status: 'Active' as const
                }))
                setUsers(mappedUsers)
            }
            if (leaveRequests && Array.isArray(leaveRequests)) {
                const mappedLeaves: Leave[] = (leaveRequests as unknown as LeaveRequestRecord[]).map((l: LeaveRequestRecord) => ({
                    id: l.id,
                    user_id: l.user_id,
                    type: l.reason?.toLowerCase().includes('sick') ? 'Sick' : 'Annual',
                    start_date: l.start_date,
                    end_date: l.end_date,
                    status: l.status as LeaveStatus,
                    reason: l.reason ?? undefined
                }))
                setLeaves(mappedLeaves)
            }

            if (dbProjects && Array.isArray(dbProjects)) {
                // The server action already maps these correctly, so we can just use them!
                setProjects(dbProjects as any[])
            }

            if (dbTasks && Array.isArray(dbTasks)) {
                const mappedTasks: Task[] = (dbTasks as unknown as TaskRecord[]).map((t: TaskRecord) => ({
                    id: t.id,
                    projectId: t.project_id,
                    title: t.title,
                    status: t.status as TaskStatus,
                    assigneeId: t.assignee_id,
                    priority: t.priority as 'High' | 'Medium' | 'Low',
                    proofUrl: t.proof_url ?? undefined,
                    verificationStatus: t.verification_status as VerificationStatus,
                    dueDate: t.due_date ?? undefined
                }))
                setTasks(mappedTasks)
            }

        } catch (error) {
            console.error("Failed to fetch data", error)
        } finally {
            setIsLoading(false)
        }
    }

    // ========================================================================
    // Actions
    // ========================================================================

    const addEmployee = async (employee: Omit<Employee, "id">) => {
        console.log("Add Employee blocked by RLS policy on client. Use Server Action.")
    }

    const addLeave = async (leave: Omit<Leave, "id">) => {
        const { error } = await supabase.from('leave_requests').insert({
            user_id: leave.user_id,
            start_date: leave.start_date,
            end_date: leave.end_date,
            reason: leave.reason,
            status: 'approved'
        })
        if (!error) await refreshData()
    }

    const addJob = (job: Omit<Job, "id" | "created_at" | "applicants">) => {
        const newJob: Job = {
            ...job,
            id: crypto.randomUUID(),
            applicants: 0,
            created_at: new Date().toISOString(),
        }
        setJobs((prev) => [newJob, ...prev])
    }

    const addAnnouncement = (announcement: Omit<Announcement, "id" | "date">) => {
        const newAnnouncement: Announcement = {
            ...announcement,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
        }
        setAnnouncements((prev) => [newAnnouncement, ...prev])
    }

    const enrollCourse = (courseId: number) => {
        const course = courses.find(c => c.id === courseId)
        if (course) {
            setCourses((prev) =>
                prev.map((c) =>
                    c.id === courseId ? { ...c, enrolled: true } : c
                )
            )
        }
    }

    const addProject = async (project: Omit<Project, "id" | "activityLog" | "progress">) => {
        try {
            console.log("📝 Creating project via Server Action:", project.title)
            
            const formData = new FormData()
            formData.append('title', project.title)
            if (project.description) formData.append('description', project.description)
            formData.append('status', project.status)
            if (project.deadline) formData.append('due_date', project.deadline)
            if (project.teamLeadId) formData.append('team_lead_id', project.teamLeadId)
            if (project.memberIds && project.memberIds.length > 0) {
                formData.append('member_ids', JSON.stringify(project.memberIds))
            }

            const result = await createProjectAction({}, formData)

            if (result.error || !result.project) {
                console.error("❌ Failed to create project via Server Action:", result.error)
                return null
            }

            const data = result.project as any

            // Add to local state with DB data
            const newProject: Project = {
                id: data.id,
                title: data.title,
                description: data.description || "",
                status: data.status,
                deadline: data.due_date || "",
                teamLeadId: data.team_lead_id,
                memberIds: data.member_ids || [],
                progress: 0,
                activityLog: []
            }
            setProjects(prev => [newProject, ...prev])
            console.log("✅ Project created successfully:", newProject.title)
            return newProject
        } catch (err) {
            console.error("❌ Exception in addProject:", err)
            return null
        }
    }

    const addTeam = (team: Omit<Team, "id">) => {
        const newTeam: Team = {
            ...team,
            id: crypto.randomUUID()
        }
        setTeams(prev => [...prev, newTeam])
    }

    const addTask = async (task: Omit<Task, "id">) => {
        const { data, error } = await supabase.from('tasks').insert({
            title: task.title,
            project_id: task.projectId,
            assignee_id: task.assigneeId,
            status: 'TODO',
            priority: task.priority
        }).select().single()

        if (data) {
            const newTask: Task = {
                ...task,
                id: data.id,
            }
            setTasks(prev => [...prev, newTask])
        } else {
            const newTask: Task = {
                ...task,
                id: crypto.randomUUID(),
            }
            setTasks(prev => [...prev, newTask])
        }
    }

    const updateTask = (taskId: string, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    }

    // Move Task Logic (Handles Proof Submission for Members)
    const moveTask = (taskId: string, newStatus: TaskStatus, proofUrl?: string) => {
        setTasks((prev) =>
            prev.map((t) => {
                if (t.id !== taskId) return t
                const isDone = newStatus === "Done"
                return {
                    ...t,
                    status: newStatus,
                    proofUrl: proofUrl || t.proofUrl,
                    verificationStatus: isDone ? "Pending" : "None",
                }
            })
        )
    }

    // Leader Verification Logic
    const verifyTask = (taskId: string, isApproved: boolean) => {
        setTasks((prev) =>
            prev.map((t) => {
                if (t.id !== taskId) return t
                return isApproved
                    ? { ...t, verificationStatus: "Verified" }
                    : { ...t, status: "In Progress", verificationStatus: "Rejected" }
            })
        )
    }

    // Delete Project
    const deleteProject = async (projectId: string) => {
        // Call Server Action
        const result = await deleteProjectAction(projectId)

        if ('error' in result) {
            console.error("Failed to delete project:", result.error)
            return
        }

        // Update local state on success
        setProjects(prev => prev.filter(p => p.id !== projectId))
        setTasks(prev => prev.filter(t => t.projectId !== projectId))
        setTeams(prev => prev.filter(t => t.projectId !== projectId))
    }

    // ========================================================================
    // Context Value
    // ========================================================================

    const value: HemsContextType = {
        currentUser,
        setCurrentUser,
        userRole,
        setUserRole,
        users,
        employees,
        leaves,
        jobs,
        announcements,
        courses,
        projects,
        teams,
        tasks,
        candidates,
        enrolledCourses,
        availableCourses,
        isLoading,
        getProjectRole,
        getProjectsAsLeader,
        getProjectsAsMember,
        getMyTasks,
        addEmployee,
        addJob,
        addAnnouncement,
        enrollCourse,
        addLeave,
        refreshData,
        addProject,
        addTeam,
        addTask,
        updateTask,
        moveTask,
        verifyTask,
        deleteProject
    }

    return <HemsContext.Provider value={value}>{children}</HemsContext.Provider>
}

// Custom hook to use the context
export function useHems() {
    const context = useContext(HemsContext)
    if (context === undefined) {
        throw new Error("useHems must be used within a HemsProvider")
    }
    return context
}
