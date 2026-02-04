"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

// ============================================================================
// TYPES - Global & Project Roles
// ============================================================================

export type GlobalRole = 'HR_ADMIN' | 'STANDARD_USER'
export type ProjectRole = 'LEADER' | 'MEMBER' | 'VIEWER'
export type EmployeeStatus = "Active" | "Inactive" | "Onboarding"

export interface User {
    id: string
    name: string
    globalRole: GlobalRole
    avatar?: string
    jobTitle?: string
    status?: 'Active' | 'Away' | 'Busy'
}

export interface Employee {
    id: string
    full_name: string
    email: string
    position: string
    department: string
    status: EmployeeStatus
    created_at: string
    avatar_url?: string
}

export type LeaveType = "Sick" | "Annual"
export type LeaveStatus = "approved" | "pending" | "rejected"

export interface Leave {
    id: string
    user_id: string
    type: LeaveType
    start_date: string
    end_date: string
    status: LeaveStatus
    reason?: string
}

// ============================================================================
// Project Management Types
// ============================================================================

export interface Activity {
    id: string
    userId: string
    action: string
    timestamp: string
    type: 'commit' | 'move' | 'comment' | 'create'
}

export type TaskStatus = "To Do" | "In Progress" | "Review" | "Done"
export type VerificationStatus = "None" | "Pending" | "Verified" | "Rejected"

export interface Task {
    id: string
    projectId: string
    title: string
    status: TaskStatus
    assigneeId: string
    priority: "High" | "Medium" | "Low"
    stagnation?: number
    proofUrl?: string
    verificationStatus: VerificationStatus
    dueDate?: string
}

export interface Team {
    id: string
    name: string
    leadId: string
    memberIds: string[]
    projectId?: string
}

export interface Project {
    id: string
    title: string
    description?: string
    status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
    progress: number
    deadline: string
    activityLog: Activity[]
    teamLeadId: string
    memberIds: string[]
}

// ============================================================================
// Hiring & Other Types
// ============================================================================

export interface Candidate {
    id: string
    name: string
    role: string
    stage: 'Applied' | 'Screening' | 'Interview' | 'Offer'
    interviewDate?: string
    email: string
}

export interface Job {
    id: string
    title: string
    department: string
    location: string
    type: "Full-time" | "Part-time" | "Contract"
    status: "Open" | "Closed" | "Draft"
    applicants: number
    created_at: string
}

export interface Announcement {
    id: string
    title: string
    content: string
    date: string
    priority: "High" | "Normal" | "Low"
    author: string
}

export interface Course {
    id: number
    title: string
    author: string
    duration: string
    rating: number
    thumbnail: string
    category: string
    tags: string[]
    progress: number
    enrolled: boolean
}

// ============================================================================
// Context Type
// ============================================================================

interface HemsContextType {
    // Current User & Role
    currentUser: User
    setCurrentUser: (user: User) => void

    // Legacy support (for gradual migration)
    userRole: "HR" | "EMPLOYEE"
    setUserRole: (role: "HR" | "EMPLOYEE") => void

    // Data
    users: User[]
    employees: Employee[]
    leaves: Leave[]
    jobs: Job[]
    announcements: Announcement[]
    courses: Course[]
    projects: Project[]
    teams: Team[]
    tasks: Task[]
    candidates: Candidate[]
    enrolledCourses: Course[]
    availableCourses: Course[]
    isLoading: boolean

    // Helper Functions
    getProjectRole: (projectId: string) => ProjectRole
    getProjectsAsLeader: () => Project[]
    getProjectsAsMember: () => Project[]
    getMyTasks: () => Task[]

    // Actions
    addEmployee: (employee: Omit<Employee, "id">) => Promise<void>
    addJob: (job: Omit<Job, "id" | "created_at" | "applicants">) => void
    addAnnouncement: (announcement: Omit<Announcement, "id" | "date">) => void
    enrollCourse: (courseId: number) => void
    addLeave: (leave: Omit<Leave, "id">) => Promise<void>
    refreshData: () => Promise<void>
    addProject: (project: Omit<Project, "id" | "activityLog" | "progress">) => Promise<Project | null>
    addTeam: (team: Omit<Team, "id">) => void
    updateTask: (taskId: string, updates: Partial<Task>) => void
    addTask: (task: Omit<Task, "id">) => Promise<void>
    moveTask: (taskId: string, newStatus: TaskStatus, proofUrl?: string) => void
    verifyTask: (taskId: string, isApproved: boolean) => void
    deleteProject: (projectId: string) => Promise<void>
}

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

        // HR_ADMIN can view all but doesn't have leader/member role
        if (currentUser.globalRole === 'HR_ADMIN') return 'VIEWER'

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
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
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

            const { data: profiles } = await supabase.from('profiles').select('*')
            const { data: leaveRequests } = await supabase.from('leave_requests').select('*')

            if (profiles) {
                const mappedEmployees: Employee[] = profiles
                    .filter((p: any) => p.role !== 'HR_ADMIN')
                    .map((p: any) => ({
                        id: p.id,
                        full_name: p.full_name || 'Unknown',
                        email: p.email || '',
                        position: p.position || 'Employee',
                        department: p.department || 'General',
                        status: 'Active',
                        created_at: p.created_at,
                        avatar_url: p.avatar_url
                    }))
                setEmployees(mappedEmployees)

                // Also set users from profiles
                const mappedUsers: User[] = profiles.map((p: any) => ({
                    id: p.id,
                    name: p.full_name || 'Unknown',
                    globalRole: p.role === 'HR_ADMIN' ? 'HR_ADMIN' : 'STANDARD_USER',
                    avatar: p.avatar_url,
                    jobTitle: p.position,
                    status: 'Active'
                }))
                setUsers(mappedUsers)
            }
            if (leaveRequests) {
                const mappedLeaves: Leave[] = leaveRequests.map((l: any) => ({
                    id: l.id,
                    user_id: l.user_id,
                    type: l.reason?.toLowerCase().includes('sick') ? 'Sick' : 'Annual',
                    start_date: l.start_date,
                    end_date: l.end_date,
                    status: l.status,
                    reason: l.reason
                }))
                setLeaves(mappedLeaves)
            }

            // Fetch projects from database
            const { data: dbProjects } = await supabase.from('projects').select('*')
            if (dbProjects) {
                const mappedProjects: Project[] = dbProjects.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    status: p.status || 'ACTIVE',
                    deadline: p.due_date,
                    teamLeadId: p.team_lead_id || '',
                    memberIds: p.member_ids || [],
                    progress: p.progress || 0,
                    activityLog: []
                }))
                setProjects(mappedProjects)
            }

            // Fetch tasks
            const { data: dbTasks } = await supabase.from('tasks').select('*')
            if (dbTasks) {
                const mappedTasks: Task[] = dbTasks.map((t: any) => ({
                    id: t.id,
                    projectId: t.project_id,
                    title: t.title,
                    status: t.status === 'TODO' ? 'To Do' : t.status === 'IN_PROGRESS' ? 'In Progress' : 'Done',
                    assigneeId: t.assignee_id,
                    priority: t.priority || 'Medium',
                    verificationStatus: 'None'
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
        // Insert into Supabase
        const { data, error } = await supabase.from('projects').insert({
            title: project.title,
            description: project.description,
            status: project.status,
            due_date: project.deadline,
            team_lead_id: project.teamLeadId,
            member_ids: project.memberIds
        }).select().single()

        if (error) {
            console.error("Failed to create project (using local fallback):", error)
            // Fallback to local state
            const newProject: Project = {
                ...project,
                id: crypto.randomUUID(),
                progress: 0,
                activityLog: []
            }
            setProjects(prev => [...prev, newProject])
            return newProject
        } else if (data) {
            // Add to local state with DB data
            const newProject: Project = {
                id: data.id,
                title: data.title,
                description: data.description,
                status: data.status,
                deadline: data.due_date,
                teamLeadId: data.team_lead_id,
                memberIds: data.member_ids || [],
                progress: data.progress || 0,
                activityLog: []
            }
            setProjects(prev => [...prev, newProject])
            return newProject
        }
        return null
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
        // Delete from Supabase
        const { error } = await supabase.from('projects').delete().eq('id', projectId)

        if (error) {
            console.error("Failed to delete project:", error)
        }

        // Always update local state
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
