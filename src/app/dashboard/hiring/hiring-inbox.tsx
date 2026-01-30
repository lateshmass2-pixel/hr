'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    Mail, ExternalLink, Eye, ChevronDown, ChevronUp,
    CheckCircle2, Sparkles
} from 'lucide-react'
import { SoftCard } from '@/components/ui/gradient-stat-card'
import { ScheduleInterviewDialog } from './schedule-interview-dialog'
import { LaunchAssessmentDialog } from './launch-assessment-dialog'
import { DecisionFooter } from './decision-footer'
import { DeleteApplicationButton } from './delete-button'
import { extractSkills } from '@/utils/skill-extractor'
import { cn } from '@/lib/utils'

type TabStatus = 'ALL' | 'TEST_PENDING' | 'INTERVIEW' | 'OFFER' | 'REJECTED'

interface Application {
    id: string
    candidate_name: string
    candidate_email: string
    offer_role?: string
    position?: string
    status: string
    test_score?: number
    score?: number
    resume_url?: string
    resume_text?: string
    ai_reasoning?: string
    raw_text?: string
    skills?: string[]
    created_at?: string
}

interface HiringInboxProps {
    applications: Application[]
}

const tabs: { id: TabStatus; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'TEST_PENDING', label: 'Screening' },
    { id: 'INTERVIEW', label: 'Interview' },
    { id: 'OFFER', label: 'Offer' },
    { id: 'REJECTED', label: 'Rejected' },
]

export function HiringInbox({ applications }: HiringInboxProps) {
    const [activeTab, setActiveTab] = useState<TabStatus>('ALL')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const filteredApplications = activeTab === 'ALL'
        ? applications
        : applications.filter(app => app.status === activeTab)

    const counts: Record<TabStatus, number> = {
        ALL: applications.length,
        TEST_PENDING: applications.filter(a => a.status === 'TEST_PENDING').length,
        INTERVIEW: applications.filter(a => a.status === 'INTERVIEW').length,
        OFFER: applications.filter(a => a.status === 'offer').length,
        REJECTED: applications.filter(a => a.status === 'REJECTED').length,
    }

    return (
        <div className="space-y-5">
            {/* Pill Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            'px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                            activeTab === tab.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        {tab.label}
                        <span className={cn(
                            'ml-2 px-2 py-0.5 rounded-full text-xs font-bold',
                            activeTab === tab.id
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-gray-200 text-gray-500'
                        )}>
                            {counts[tab.id]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Candidate List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredApplications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <SoftCard className="text-center py-12">
                                <Sparkles className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Candidates</h3>
                                <p className="text-gray-500">No candidates in this category yet.</p>
                            </SoftCard>
                        </motion.div>
                    ) : (
                        filteredApplications.map((app, index) => (
                            <CandidateRow
                                key={app.id}
                                application={app}
                                isExpanded={expandedId === app.id}
                                onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                                index={index}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

function CandidateRow({
    application,
    isExpanded,
    onToggle,
    index
}: {
    application: Application
    isExpanded: boolean
    onToggle: () => void
    index: number
}) {
    const score = application.test_score ?? application.score
    const hasScore = score !== null && score !== undefined
    const isHighScore = (score ?? 0) >= 70

    const initials = application.candidate_name
        ? application.candidate_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : '??'

    const resumeContent = [
        application.resume_text || '',
        application.ai_reasoning || '',
        application.raw_text || '',
        application.offer_role || ''
    ].join(' ')
    // Use stored skills if available, otherwise fallback to empty array (or legacy extraction if absolutely necessary, but preferring stored)
    const skills = (application.skills && application.skills.length > 0)
        ? application.skills.slice(0, 5)
        : extractSkills(resumeContent, 4)

    const statusColors: Record<string, string> = {
        'TEST_PENDING': 'bg-amber-100 text-amber-700',
        'INTERVIEW': 'bg-purple-100 text-purple-700',
        'offer': 'bg-emerald-100 text-emerald-700',
        'REJECTED': 'bg-red-100 text-red-700',
        'NEW': 'bg-gray-100 text-gray-700',
    }

    const avatarColors = [
        'from-pink-500 to-rose-500',
        'from-cyan-500 to-teal-500',
        'from-emerald-500 to-teal-500',
        'from-orange-500 to-amber-500',
        'from-purple-500 to-violet-500',
    ]

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ delay: index * 0.03 }}
        >
            <SoftCard
                padding="sm"
                className={cn(
                    'overflow-hidden transition-all duration-300',
                    isExpanded && 'ring-2 ring-orange-200'
                )}
            >
                {/* Main Row */}
                <div
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors -m-4"
                    onClick={onToggle}
                >
                    {/* Avatar */}
                    <div className={cn(
                        "w-12 h-12 rounded-2xl bg-gradient-to-br text-white text-sm font-bold flex items-center justify-center shadow-lg shrink-0",
                        avatarColors[index % avatarColors.length]
                    )}>
                        {initials}
                    </div>

                    {/* Name & Role */}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                            {application.candidate_name || 'Unknown'}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">
                            {application.offer_role || application.position || 'Software Engineer'}
                        </p>
                    </div>

                    {/* Score Badge */}
                    {hasScore && (
                        <div className={cn(
                            'px-3 py-1.5 rounded-full text-sm font-bold',
                            isHighScore ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        )}>
                            {score}%
                        </div>
                    )}

                    {/* Status */}
                    <span className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold hidden sm:block',
                        statusColors[application.status] || statusColors['NEW']
                    )}>
                        {application.status === 'TEST_PENDING' ? 'Screening' :
                            application.status === 'offer' ? 'Offer' : application.status}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {application.status === 'TEST_PENDING' && (score ?? 0) >= 70 && (
                            <ScheduleInterviewDialog application={{
                                id: application.id,
                                candidate_name: application.candidate_name,
                                candidate_email: application.candidate_email,
                                offer_role: application.offer_role
                            }} />
                        )}

                        <button className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 mt-4 border-t border-gray-100 space-y-4">
                                {/* Skills */}
                                {skills.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills</p>
                                        <div className="flex flex-wrap gap-2">
                                            {skills.map((skill, i) => (
                                                <span key={i} className="bg-orange-50 text-orange-600 text-xs px-3 py-1.5 rounded-full font-medium">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Score Bar */}
                                {hasScore && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Match Score</p>
                                            <span className={cn('text-sm font-bold', isHighScore ? 'text-emerald-600' : 'text-amber-600')}>
                                                {score}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${score}%` }}
                                                transition={{ duration: 0.5, delay: 0.1 }}
                                                className={cn('h-full rounded-full', isHighScore ? 'bg-emerald-500' : 'bg-amber-500')}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Mail size={14} />
                                        <span>{application.candidate_email}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {application.status === 'TEST_PENDING' && (
                                            <LaunchAssessmentDialog
                                                candidateId={application.id}
                                                candidateName={application.candidate_name || 'Candidate'}
                                                jobId={undefined} // Pass actual job ID if available in application data
                                            />
                                        )}

                                        {application.resume_url && (
                                            <Link href={application.resume_url} target="_blank">
                                                <button className="pill-button-secondary text-sm px-4 py-2 flex items-center gap-2">
                                                    <Eye size={14} /> Resume
                                                </button>
                                            </Link>
                                        )}

                                        {(application.status === 'TEST_PENDING' || application.status === 'REJECTED' || application.status === 'NEW') && (
                                            <DeleteApplicationButton
                                                applicationId={application.id}
                                                candidateName={application.candidate_name || 'Unknown'}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Decision Footer */}
                                {application.status === 'INTERVIEW' && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <DecisionFooter application={{
                                            id: application.id,
                                            candidate_name: application.candidate_name,
                                            candidate_email: application.candidate_email,
                                            offer_role: application.offer_role
                                        }} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </SoftCard>
        </motion.div>
    )
}

export default HiringInbox
