"use client"

import { createContext, useContext, useState, ReactNode } from "react"

// Types
export interface Employee {
    id: string
    full_name: string
    email: string
    position: string
    department: string
    created_at: string
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

interface HemsContextType {
    // State
    employees: Employee[]
    jobs: Job[]
    announcements: Announcement[]
    courses: Course[]
    enrolledCourses: Course[]
    availableCourses: Course[]

    // Actions
    addEmployee: (employee: Omit<Employee, "id" | "created_at">) => void
    addJob: (job: Omit<Job, "id" | "created_at" | "applicants">) => void
    addAnnouncement: (announcement: Omit<Announcement, "id" | "date">) => void
    enrollCourse: (courseId: number) => void
}

// Create context
const HemsContext = createContext<HemsContextType | undefined>(undefined)

// Provider component
export function HemsProvider({ children }: { children: ReactNode }) {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [courses, setCourses] = useState<Course[]>([])

    // Computed values for courses
    const enrolledCourses = courses.filter((c) => c.enrolled)
    const availableCourses = courses.filter((c) => !c.enrolled)

    // Add a new employee
    const addEmployee = (employee: Omit<Employee, "id" | "created_at">) => {
        const newEmployee: Employee = {
            ...employee,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
        }
        setEmployees((prev) => [newEmployee, ...prev])
    }

    // Add a new job
    const addJob = (job: Omit<Job, "id" | "created_at" | "applicants">) => {
        const newJob: Job = {
            ...job,
            id: crypto.randomUUID(),
            applicants: 0,
            created_at: new Date().toISOString(),
        }
        setJobs((prev) => [newJob, ...prev])
    }

    // Add a new announcement
    const addAnnouncement = (announcement: Omit<Announcement, "id" | "date">) => {
        const newAnnouncement: Announcement = {
            ...announcement,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
        }
        setAnnouncements((prev) => [newAnnouncement, ...prev])
    }

    // Enroll in a course
    const enrollCourse = (courseId: number) => {
        setCourses((prev) =>
            prev.map((c) =>
                c.id === courseId ? { ...c, enrolled: true } : c
            )
        )
    }

    const value: HemsContextType = {
        employees,
        jobs,
        announcements,
        courses,
        enrolledCourses,
        availableCourses,
        addEmployee,
        addJob,
        addAnnouncement,
        enrollCourse,
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
