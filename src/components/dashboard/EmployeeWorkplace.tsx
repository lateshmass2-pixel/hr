'use client'

import { useHems } from '@/context/HemsContext'
import { PersonalDashboard } from './PersonalDashboard'
import { TeamLeadDashboard } from './TeamLeadDashboard'

export function EmployeeWorkplace() {
    const { getProjectsAsLeader } = useHems()
    const projectsAsLeader = getProjectsAsLeader()

    // If the employee is a leader of ANY project, show the Team Lead Dashboard
    if (projectsAsLeader.length > 0) {
        return <TeamLeadDashboard />
    }

    // Otherwise, show the standard personal dashboard
    return <PersonalDashboard />
}

