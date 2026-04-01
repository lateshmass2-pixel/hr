// =============================================================================
// HEMS Types — Extracted from HemsContext for reuse across the codebase
// =============================================================================

// ============================================================================
// Roles
// ============================================================================

export type GlobalRole = 'HR_ADMIN' | 'STANDARD_USER'
export type ProjectRole = 'LEADER' | 'MEMBER' | 'VIEWER'
export type EmployeeStatus = "Active" | "Inactive" | "Onboarding"

// ============================================================================
// Core Entities
// ============================================================================

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
// Project Management
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
// Hiring & Other
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
// Context Shape
// ============================================================================

export interface HemsContextType {
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
