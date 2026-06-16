"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { deleteProject as deleteProjectAction, createProject as createProjectAction, getProjects as getProjectsAction, getAllProfiles as getAllProfilesAction } from "@/app/dashboard/projects/actions"
import type { ProfileRecord, LeaveRequestRecord, TaskRecord } from "@/lib/database/types"

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

type HemsDataState = {
    employees: Employee[];
    leaves: Leave[];
    jobs: Job[];
    announcements: Announcement[];
    courses: Course[];
    projects: Project[];
    teams: Team[];
    tasks: Task[];
    users: User[];
    candidates: Candidate[];
}

const INITIAL_DATA: HemsDataState = {
    employees: [],
    leaves: [],
    jobs: [],
    announcements: [],
    courses: [],
    projects: [],
    teams: [],
    tasks: [],
    users: [],
    candidates: [],
}

// ============================================================================
// Supabase client — single instance outside to avoid recreation on re-renders
// ============================================================================
const supabase = createClient()

// ============================================================================
// Provider Component
// ============================================================================

export function HemsProvider({ children }: { children: ReactNode }) {
    // Current user (will be set from Supabase auth)
    const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER)
    // Legacy role support
    const [userRole, setUserRole] = useState<"HR" | "EMPLOYEE">("HR")
    // Data states - consolidated
    const [data, setData] = useState<HemsDataState>(INITIAL_DATA)
    const [isLoading, setIsLoading] = useState(true)

    // Computed values for courses (memoized)
    const { enrolledCourses, availableCourses } = useMemo(() => ({
        enrolledCourses: data.courses.filter((c) => c.enrolled),
        availableCourses: data.courses.filter((c) => !c.enrolled)
    }), [data.courses])

    // ========================================================================
    // Optimized Helper Functions
    // ========================================================================

    const getOccupiedUserIds = useCallback((): Set<string> => {
        const occupied = new Set<string>()
        // PROJECT ASSIGNMENT RESTRICTION REMOVED:
        // Users can now be part of unlimited active projects.
        // We no longer populate the 'occupied' set based on data.projects.
        
        /* 
        data.projects.forEach(p => {
            if (p.status !== 'ACTIVE') return
            
            // 1. Members
            const members = Array.isArray(p.memberIds) ? p.memberIds : []
            members.forEach(id => {
                if (id) occupied.add(id)
            })
            
            // 2. Leads (unless HR_ADMIN)
            if (p.teamLeadId) {
                const leadProfile = data.users.find(u => u.id === p.teamLeadId)
                const isHR = leadProfile?.globalRole === 'HR_ADMIN'
                if (!isHR) {
                    occupied.add(p.teamLeadId)
                }
            }
        })
        */

        if (occupied.size > 0) {
            console.log(`[HemsContext] getOccupiedUserIds: ${occupied.size} users are currently busy.`)
        }
        return occupied
    }, [data.projects, data.users])

    const isUserAvailable = useCallback((userId: string): boolean => {
        const occupied = getOccupiedUserIds()
        return !occupied.has(userId)
    }, [getOccupiedUserIds])

    const getProjectRole = useCallback((projectId: string): ProjectRole => {
        const project = data.projects.find(p => p.id === projectId)
        if (!project) return 'VIEWER'
        if (currentUser.globalRole === 'HR_ADMIN') return 'LEADER'
        if (project.teamLeadId === currentUser.id) return 'LEADER'
        if (project.memberIds?.includes(currentUser.id)) return 'MEMBER'
        return 'VIEWER'
    }, [data.projects, currentUser])

    const getProjectsAsLeader = useCallback((): Project[] => {
        return data.projects.filter(p => p.teamLeadId === currentUser.id)
    }, [data.projects, currentUser])

    const getProjectsAsMember = useCallback((): Project[] => {
        return data.projects.filter(p =>
            p.memberIds?.includes(currentUser.id) && p.teamLeadId !== currentUser.id
        )
    }, [data.projects, currentUser])

    const getMyTasks = useCallback((): Task[] => {
        return data.tasks.filter(t => t.assigneeId === currentUser.id)
    }, [data.tasks, currentUser])

    // ========================================================================
    // Data Fetching
    // ========================================================================

    const refreshData = async () => {
        setIsLoading(true)
        try {
            console.log("HemsContext: Starting global data refresh...")
            
            // Explicitly clear projects to ensure absolute fresh state
            setData(prev => ({ ...prev, projects: [] }))
            
            const [
                { data: { user } },
                profilesRes,
                leavesRes,
                projectsRes,
                tasksRes
            ] = await Promise.all([
                supabase.auth.getUser(),
                supabase.from('profiles').select('id, full_name, email, position, role, created_at'),
                supabase.from('leave_requests').select('id, user_id, start_date, end_date, status, reason'),
                getProjectsAction(), // Returns Project[]
                supabase.from('tasks').select('id, project_id, title, status, assignee_id, priority, proof_url, verification_status, due_date')
            ])

            const newData: Partial<HemsDataState> = {}

            // 1. Process Current User & Profiles
            console.log('[HemsContext] profilesRes:', { 
                hasData: !!profilesRes.data, 
                count: profilesRes.data?.length ?? 0,
                error: profilesRes.error 
            })
            
            if (profilesRes.error) {
                console.error('[HemsContext] PROFILES QUERY ERROR:', profilesRes.error)
            }
            
            const profiles = (profilesRes.data as any[]) || []
            
            if (profiles.length > 0) {
                // If we have a user from auth, find their profile
                if (user) {
                    const profile = profiles.find(p => p.id === user.id)
                    if (profile) {
                        setCurrentUser({
                            id: profile.id,
                            name: profile.full_name || user.email?.split('@')[0] || 'User',
                            globalRole: (profile.role === 'HR_ADMIN' || profile.role === 'hr' || profile.role === 'owner') ? 'HR_ADMIN' : 'STANDARD_USER',
                            avatar: undefined,
                            jobTitle: profile.position,
                            status: 'Active'
                        })
                    }
                }

                // Employees: Include ALL profiles for workforce management
                newData.employees = profiles
                    .map((p: any) => ({
                        id: p.id,
                        user_id: p.id,
                        full_name: p.full_name || 'Unknown',
                        email: p.email || '',
                        position: p.position || 'Employee',
                        department: p.department || 'General',
                        status: 'Active' as EmployeeStatus,
                        created_at: p.created_at,
                    }))

                // Users: This is the GLOBAL list for project assignments (Managers, Leads, Team)
                // Everyone can potentially be assigned or be a manager.
                newData.users = profiles.map((p: any) => ({
                    id: p.id,
                    name: p.full_name || 'Unknown',
                    globalRole: (p.role === 'HR_ADMIN' || p.role === 'hr' || p.role === 'owner') ? 'HR_ADMIN' : 'STANDARD_USER',
                    avatar: undefined,
                    jobTitle: p.position ?? undefined,
                    status: 'Active' as const
                }))

                console.log(`HemsContext: Mapped ${newData.users?.length} users and ${newData.employees?.length} employees.`)
            } else {
                // FALLBACK: Client-side profiles query returned nothing (likely RLS issue)
                // Use server action which runs server-side and can bypass client RLS
                console.warn('[HemsContext] Client profiles query returned 0 results. Using server action fallback...')
                try {
                    const serverProfiles = await getAllProfilesAction()
                    console.log(`[HemsContext] Server action fallback returned ${serverProfiles.length} profiles`)
                    
                    if (serverProfiles.length > 0) {
                        if (user) {
                            const profile = serverProfiles.find(p => p.id === user.id)
                            if (profile) {
                                setCurrentUser({
                                    id: profile.id,
                                    name: profile.full_name || user.email?.split('@')[0] || 'User',
                                    globalRole: (profile.role === 'HR_ADMIN' || profile.role === 'hr' || profile.role === 'owner') ? 'HR_ADMIN' : 'STANDARD_USER',
                                    avatar: undefined,
                                    jobTitle: profile.position,
                                    status: 'Active'
                                })
                            }
                        }

                        newData.employees = serverProfiles.map(p => ({
                            id: p.id,
                            user_id: p.id,
                            full_name: p.full_name || 'Unknown',
                            email: p.email || '',
                            position: p.position || 'Employee',
                            department: 'General',
                            status: 'Active' as EmployeeStatus,
                            created_at: new Date().toISOString(),
                            avatar_url: undefined
                        }))

                        newData.users = serverProfiles.map(p => ({
                            id: p.id,
                            name: p.full_name || 'Unknown',
                            globalRole: (p.role === 'HR_ADMIN' || p.role === 'hr' || p.role === 'owner') ? 'HR_ADMIN' : 'STANDARD_USER',
                            avatar: undefined,
                            jobTitle: p.position ?? undefined,
                            status: 'Active' as const
                        }))
                        
                        console.log(`[HemsContext] Fallback mapped ${newData.users.length} users`)
                    }
                } catch (fallbackErr) {
                    console.error('[HemsContext] Server action fallback also failed:', fallbackErr)
                }
            }

            // 2. Process Leaves
            if (leavesRes.data) {
                newData.leaves = (leavesRes.data as unknown as LeaveRequestRecord[]).map((l: LeaveRequestRecord) => ({
                    id: l.id,
                    user_id: l.user_id,
                    type: l.reason?.toLowerCase().includes('sick') ? 'Sick' : 'Annual',
                    start_date: l.start_date,
                    end_date: l.end_date,
                    status: l.status as LeaveStatus,
                    reason: l.reason ?? undefined
                }))
            }

            // 3. Process Projects (Handled by action)
            if (projectsRes) {
                const projects = (projectsRes as any[]).map(p => ({
                    id: p.id,
                    title: p.title,
                    description: p.description || "",
                    status: p.status || 'ACTIVE',
                    progress: p.progress || 0,
                    deadline: p.deadline || p.due_date || p.end_date || "",
                    activityLog: [],
                    teamLeadId: p.team_lead_id || p.teamLeadId || "",
                    memberIds: p.member_ids || p.memberIds || []
                }))
                newData.projects = projects
                console.log(`[HemsContext] Loaded ${projects.length} projects`)
            }

            // 4. Process Tasks
            if (tasksRes.data) {
                newData.tasks = (tasksRes.data as unknown as TaskRecord[]).map((t: TaskRecord) => ({
                    id: t.id,
                    projectId: t.project_id,
                    title: t.title,
                    status: t.status as TaskStatus,
                    assigneeId: t.assignee_id,
                    priority: t.priority as 'High' | 'Medium' | 'Low',
                    proof_url: t.proof_url ?? undefined,
                    verificationStatus: t.verification_status as VerificationStatus,
                    dueDate: t.due_date ?? undefined
                }))
            }

            setData(prev => ({ ...prev, ...newData }))
            console.log("HemsContext: Refresh completed successfully.")

        } catch (error) {
            console.error("Failed to fetch data", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        refreshData()
    }, [])

    // ========================================================================
    // Actions
    // ========================================================================

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

    const addProject = async (project: Omit<Project, "id" | "activityLog" | "progress">) => {
        try {
            console.log('[HemsContext] Refreshing data...')
            const formData = new FormData()
            formData.append('title', project.title)
            if (project.description) formData.append('description', project.description)
            formData.append('status', project.status)
            if (project.deadline) formData.append('due_date', project.deadline)
            if (project.teamLeadId) formData.append('team_lead_id', project.teamLeadId)
            if (project.memberIds) formData.append('member_ids', JSON.stringify(project.memberIds))

            const result = await createProjectAction({}, formData)
            if (result.project) {
                await refreshData()
                return result.project as any
            }
            return null
        } catch (err) {
            return null
        }
    }

    // ========================================================================
    // Context Value
    // ========================================================================

    const value = useMemo(() => ({
        ...data,
        data,
        currentUser,
        setCurrentUser,
        userRole,
        setUserRole,
        enrolledCourses,
        availableCourses,
        isLoading,
        getProjectRole,
        getProjectsAsLeader,
        getProjectsAsMember,
        getMyTasks,
        getOccupiedUserIds,
        isUserAvailable,
        addEmployee: async () => {},
        addJob: (job: Omit<Job, "id" | "created_at" | "applicants">) => {
            const newJob: Job = { ...job, id: crypto.randomUUID(), applicants: 0, created_at: new Date().toISOString() }
            setData(prev => ({ ...prev, jobs: [newJob, ...prev.jobs] }))
        },
        addAnnouncement: (announcement: Omit<Announcement, "id" | "date">) => {
            const newAnnouncement: Announcement = { ...announcement, id: crypto.randomUUID(), date: new Date().toISOString() }
            setData(prev => ({ ...prev, announcements: [newAnnouncement, ...prev.announcements] }))
        },
        enrollCourse: (courseId: number) => {
            setData(prev => ({
                ...prev,
                courses: prev.courses.map(c => c.id === courseId ? { ...c, enrolled: true } : c)
            }))
        },
        addLeave,
        refreshData,
        addProject,
        addTeam: (team: Omit<Team, "id">) => {
            const newTeam: Team = { ...team, id: crypto.randomUUID() }
            setData(prev => ({ ...prev, teams: [...prev.teams, newTeam] }))
        },
        addTask: async (task: Omit<Task, "id">) => {
            const { data: dbTask, error } = await supabase.from('tasks').insert({
                title: task.title,
                project_id: task.projectId,
                assignee_id: task.assigneeId,
                status: 'TODO',
                priority: task.priority
            }).select().single()
            if (dbTask) {
                const newTask: Task = { ...task, id: dbTask.id }
                setData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }))
            }
        },
        updateTask: (taskId: string, updates: Partial<Task>) => {
            setData(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
            }))
        },
        moveTask: (taskId: string, newStatus: TaskStatus, proofUrl?: string) => {
            setData(prev => ({
                ...prev,
                tasks: prev.tasks.map((t) => {
                    if (t.id !== taskId) return t
                    const isDone = newStatus === "Done"
                    return {
                        ...t,
                        status: newStatus,
                        proofUrl: proofUrl || t.proofUrl,
                        verificationStatus: (isDone ? "Pending" : "None") as VerificationStatus,
                    }
                })
            }))
        },
        verifyTask: (taskId: string, isApproved: boolean) => {
            setData(prev => ({
                ...prev,
                tasks: prev.tasks.map((t) => {
                    if (t.id !== taskId) return t
                    return isApproved
                        ? { ...t, verificationStatus: "Verified" as VerificationStatus }
                        : { ...t, status: "In Progress" as TaskStatus, verificationStatus: "Rejected" as VerificationStatus }
                })
            }))
        },
        deleteProject: async (projectId: string) => {
            // Optimistic Update: Remove the project from the local state immediately
            console.log(`[HemsContext] Optimistically deleting project: ${projectId}`)
            const projectToRemove = data.projects.find(p => p.id === projectId)
            
            setData(prev => ({
                ...prev,
                projects: prev.projects.filter(p => p.id !== projectId)
            }))

            const res = await deleteProjectAction(projectId)
            
            if (res.success) {
                console.log('[HemsContext] Project deletion confirmed on server')
                // Wait for a fresh fetch to ensure state is absolute truth
                await refreshData()
            } else {
                console.error('[HemsContext] Project deletion failed on server, rolling back', res.error)
                // Rollback: Re-add the project if deletion failed
                if (projectToRemove) {
                    setData(prev => ({
                        ...prev,
                        projects: [...prev.projects, projectToRemove]
                    }))
                }
                alert(`Failed to delete project: ${res.error}`)
            }
            return res
        }
    }), [data, currentUser, userRole, isLoading, enrolledCourses, availableCourses, getProjectRole, getProjectsAsLeader, getProjectsAsMember, getMyTasks, getOccupiedUserIds, isUserAvailable, addLeave, addProject, refreshData])

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
