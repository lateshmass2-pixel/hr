'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Briefcase, X, Linkedin, Github, ExternalLink, Star, GraduationCap, Building, Lock, Sparkles, Shield, AlertTriangle, CheckCircle, Mail, Calendar, CheckCircle2 } from 'lucide-react'
import ScheduleModal from '@/components/ScheduleModal'
import OfferModal from '@/components/OfferModal'

type Platform = 'linkedin' | 'github' | 'behance'

interface Experience {
    role: string
    company: string
    years: string
    startYear: string
    endYear: string
    description: string
    isCurrent: boolean
}

interface Candidate {
    id: number
    name: string
    role: string
    company: string
    experience: string
    location: string
    skills: string[]
    matchScore: number
    platform: 'linkedin' | 'github'
    profileUrl: string
    about: string
    experienceHistory: Experience[]
    education: string
}

// Mock candidate data with expanded fields
const MOCK_CANDIDATES: Candidate[] = [
    {
        id: 1,
        name: 'Sarah Chen',
        role: 'Senior Frontend Engineer',
        company: 'TechCorp',
        experience: '8 Years',
        location: 'San Francisco, CA',
        skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
        matchScore: 95,
        platform: 'linkedin',
        profileUrl: 'https://linkedin.com/in/example',
        about: 'Passionate frontend engineer with 8+ years of experience building scalable web applications. Led multiple product launches at Fortune 500 companies. Strong advocate for clean code and user-centric design.',
        experienceHistory: [
            { role: 'Senior Frontend Engineer', company: 'TechCorp', years: '2021 - Present', startYear: '2021', endYear: 'Present', description: 'Leading frontend architecture for enterprise SaaS products. Mentoring team of 5 developers.', isCurrent: true },
            { role: 'Frontend Developer', company: 'StartupABC', years: '2018 - 2021', startYear: '2018', endYear: '2021', description: 'Built React-based dashboard that increased user engagement by 40%.', isCurrent: false },
            { role: 'Junior Developer', company: 'WebAgency', years: '2016 - 2018', startYear: '2016', endYear: '2018', description: 'Developed client websites using modern JavaScript frameworks.', isCurrent: false },
        ],
        education: 'Stanford University - B.S. Computer Science',
    },
    {
        id: 2,
        name: 'Marcus Johnson',
        role: 'Full Stack Developer',
        company: 'StartupXYZ',
        experience: '5 Years',
        location: 'New York, NY',
        skills: ['Python', 'React', 'AWS', 'Django'],
        matchScore: 88,
        platform: 'github',
        profileUrl: 'https://github.com/example',
        about: 'Full stack developer specializing in Python and React. Open source contributor with 500+ GitHub contributions. Built products serving millions of users.',
        experienceHistory: [
            { role: 'Full Stack Developer', company: 'StartupXYZ', years: '2020 - Present', startYear: '2020', endYear: 'Present', description: 'Building scalable microservices architecture serving 2M+ users.', isCurrent: true },
            { role: 'Backend Developer', company: 'DataCo', years: '2019 - 2020', startYear: '2019', endYear: '2020', description: 'Developed data pipelines and RESTful APIs.', isCurrent: false },
        ],
        education: 'MIT - M.S. Software Engineering',
    },
    {
        id: 3,
        name: 'Emily Rodriguez',
        role: 'Lead UI/UX Developer',
        company: 'DesignHub',
        experience: '7 Years',
        location: 'Austin, TX',
        skills: ['Figma', 'React', 'CSS', 'Framer'],
        matchScore: 72,
        platform: 'linkedin',
        profileUrl: 'https://linkedin.com/in/example',
        about: 'Design-focused developer bridging the gap between design and engineering. Expert in creating pixel-perfect implementations of complex UI systems.',
        experienceHistory: [
            { role: 'Lead UI/UX Developer', company: 'DesignHub', years: '2019 - Present', startYear: '2019', endYear: 'Present', description: 'Leading design system development and front-end implementation.', isCurrent: true },
            { role: 'UI Developer', company: 'CreativeStudio', years: '2017 - 2019', startYear: '2017', endYear: '2019', description: 'Created responsive web interfaces for e-commerce clients.', isCurrent: false },
        ],
        education: 'Carnegie Mellon - B.Des Human-Computer Interaction',
    },
]

export default function ScoutPage() {
    const [role, setRole] = useState('')
    const [location, setLocation] = useState('')
    const [platform, setPlatform] = useState<Platform>('linkedin')
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

    function handleSearch() {
        let searchUrl = ''
        const query = encodeURIComponent(`${role} ${location}`.trim())

        switch (platform) {
            case 'linkedin':
                searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${query}`
                break
            case 'github':
                searchUrl = `https://github.com/search?q=${query}&type=users`
                break
            case 'behance':
                searchUrl = `https://www.behance.net/search/users?search=${query}`
                break
        }

        window.open(searchUrl, '_blank')
    }

    function getInitials(name: string) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Talent Scout</h2>
                <p className="text-gray-500 text-sm mt-1">Discover and source top candidates from multiple platforms</p>
            </div>

            {/* Search Command Center */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Role Input */}
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                placeholder="e.g. Senior React Developer"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>

                    {/* Location Input */}
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="e.g. New York, Remote"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>

                    {/* Platform Dropdown */}
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                        <select
                            value={platform}
                            onChange={e => setPlatform(e.target.value as Platform)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                        >
                            <option value="linkedin">LinkedIn</option>
                            <option value="github">GitHub</option>
                            <option value="behance">Behance</option>
                        </select>
                    </div>

                    {/* Search Button */}
                    <div className="md:col-span-1 flex items-end">
                        <button
                            onClick={handleSearch}
                            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-sm"
                        >
                            <Search size={18} />
                            Find Talent
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Candidate Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_CANDIDATES.map((candidate, i) => (
                    <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                    >
                        {/* Header with Avatar & Platform Icon */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-lg font-bold">
                                {getInitials(candidate.name)}
                            </div>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${candidate.platform === 'linkedin'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {candidate.platform === 'linkedin' ? <Linkedin size={16} /> : <Github size={16} />}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="mb-3">
                            <h4 className="font-bold text-gray-900">{candidate.name}</h4>
                            <p className="text-sm text-gray-600">{candidate.role} @ {candidate.company}</p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <Briefcase size={12} />
                                    {candidate.experience}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {candidate.location}
                                </span>
                            </p>
                        </div>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {candidate.skills.slice(0, 4).map((skill, j) => (
                                <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                                    {skill}
                                </span>
                            ))}
                        </div>

                        {/* Match Score */}
                        <div className="mb-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${candidate.matchScore >= 90
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                                }`}>
                                <Star size={12} />
                                {candidate.matchScore}% Match
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-gray-100">
                            <button
                                onClick={() => setSelectedCandidate(candidate)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                            >
                                View Profile
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Profile Drawer */}
            <ProfileDrawer
                candidate={selectedCandidate}
                onClose={() => setSelectedCandidate(null)}
            />
        </div>
    )
}

// Profile Drawer Component
function ProfileDrawer({ candidate, onClose }: { candidate: Candidate | null, onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'about' | 'experience' | 'education'>('about')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isScheduleOpen, setIsScheduleOpen] = useState(false)
    const [isOfferOpen, setIsOfferOpen] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<null | {
        riskLevel: 'low' | 'medium' | 'high'
        insights: { type: 'positive' | 'warning', text: string }[]
        recommendation: string
    }>(null)

    function handleAnalyzeRisks() {
        setIsAnalyzing(true)
        setAnalysisResult(null)

        // Simulate AI analysis with 2 second delay
        setTimeout(() => {
            setIsAnalyzing(false)
            setAnalysisResult({
                riskLevel: 'low',
                insights: [
                    { type: 'positive', text: 'Strong tenure at previous roles (avg 2.5 years)' },
                    { type: 'positive', text: 'Consistent skill progression in core technologies' },
                    { type: 'warning', text: 'Gap in employment detected (Jan-Mar 2023)' },
                    { type: 'positive', text: 'Active contributions to open source projects' },
                ],
                recommendation: 'Recommended for Interview'
            })
        }, 2000)
    }

    function getInitials(name: string) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    return (
        <AnimatePresence>
            {candidate && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} className="text-gray-600" />
                        </button>

                        {/* Header Banner */}
                        <div className="h-32 bg-gradient-to-r from-orange-100 to-white" />

                        {/* Profile Header */}
                        <div className="px-6 -mt-12 relative">
                            {/* Avatar */}
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                                {getInitials(candidate.name)}
                            </div>

                            {/* Platform Badge */}
                            <div className={`absolute top-0 right-6 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${candidate.platform === 'linkedin'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-900 text-white'
                                }`}>
                                {candidate.platform === 'linkedin' ? <Linkedin size={20} /> : <Github size={20} />}
                            </div>

                            {/* Identity */}
                            <div className="mt-4">
                                <h2 className="text-xl font-bold text-gray-900">{candidate.name}</h2>
                                <p className="text-gray-600">{candidate.role} @ {candidate.company}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="flex items-center gap-1 text-sm text-gray-500">
                                        <MapPin size={14} />
                                        {candidate.location}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${candidate.matchScore >= 90
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        <Star size={10} />
                                        {candidate.matchScore}% Match
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Summary Section */}
                        <div className="px-6 mt-4">
                            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                        <Sparkles size={10} />
                                        AI Insight
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700">
                                    {candidate.matchScore >= 80
                                        ? `High potential candidate. Strong match for ${candidate.role} due to extensive ${candidate.skills[0]} experience and proven track record at ${candidate.company}.`
                                        : candidate.matchScore >= 50
                                            ? `Solid candidate with good foundation in ${candidate.skills.slice(0, 2).join(' and ')}. Consider for mid-level positions.`
                                            : `Potential gaps in core requirements. May need additional training. Recommended for junior role or different position.`
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 mt-6 px-6">
                            {(['about', 'experience', 'education'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-3 text-sm font-medium capitalize transition-colors relative ${activeTab === tab
                                        ? 'text-orange-600'
                                        : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="tab-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'about' && (
                                <div className="space-y-4">
                                    <p className="text-gray-700 leading-relaxed">{candidate.about}</p>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {candidate.skills.map((skill, i) => (
                                                <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'experience' && (
                                <div className="relative pl-8 space-y-6">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />

                                    {/* Timeline Items */}
                                    {candidate.experienceHistory.map((exp, i) => (
                                        <div key={i} className="relative">
                                            {/* Timeline Dot */}
                                            <div className={`absolute -left-8 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${exp.isCurrent ? 'bg-orange-500' : 'bg-gray-300'
                                                }`} />

                                            {/* Content Card */}
                                            <div className="bg-gray-50 rounded-xl p-4">
                                                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
                                                    {exp.startYear} — {exp.endYear}
                                                </div>
                                                <h4 className="font-bold text-gray-900">{exp.role}</h4>
                                                <p className="text-sm text-gray-600">at {exp.company}</p>
                                                <p className="text-sm text-gray-500 mt-2">{exp.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'education' && (
                                <div className="p-4 bg-gray-50 rounded-xl flex gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{candidate.education}</h4>
                                    </div>
                                </div>
                            )}

                            {/* AI Risk Analysis Section */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Shield size={16} className="text-purple-600" />
                                        AI Risk Analysis
                                    </h4>
                                    {!analysisResult && !isAnalyzing && (
                                        <button
                                            onClick={handleAnalyzeRisks}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-300 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-50 transition-colors"
                                        >
                                            <Sparkles size={14} />
                                            Analyze Risks (AI)
                                        </button>
                                    )}
                                </div>

                                {/* Scanning Skeleton */}
                                {isAnalyzing && (
                                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-purple-200 animate-pulse" />
                                            <div className="flex-1">
                                                <div className="h-4 bg-purple-200 rounded animate-pulse w-32 mb-2" />
                                                <div className="h-3 bg-purple-100 rounded animate-pulse w-48" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-purple-100 rounded animate-pulse w-full" />
                                            <div className="h-3 bg-purple-100 rounded animate-pulse w-3/4" />
                                            <div className="h-3 bg-purple-100 rounded animate-pulse w-5/6" />
                                        </div>
                                        <p className="text-xs text-purple-600 mt-3 flex items-center gap-2">
                                            <Sparkles size={12} className="animate-spin" />
                                            Scanning resume for hiring risks...
                                        </p>
                                    </div>
                                )}

                                {/* Analysis Result */}
                                {analysisResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                                    >
                                        {/* Risk Score */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${analysisResult.riskLevel === 'low'
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : analysisResult.riskLevel === 'medium'
                                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                    : 'bg-red-100 text-red-700 border border-red-200'
                                                }`}>
                                                <Shield size={14} />
                                                {analysisResult.riskLevel === 'low' ? 'Low Risk' :
                                                    analysisResult.riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
                                            </span>
                                            <button
                                                onClick={() => { setAnalysisResult(null); setIsAnalyzing(false); }}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Clear
                                            </button>
                                        </div>

                                        {/* Key Insights */}
                                        <div className="space-y-2 mb-4">
                                            {analysisResult.insights.map((insight, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm">
                                                    {insight.type === 'positive' ? (
                                                        <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                                                    ) : (
                                                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                    )}
                                                    <span className="text-gray-700">{insight.text}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Recommendation */}
                                        <div className="pt-3 border-t border-gray-200">
                                            <p className="text-sm">
                                                <span className="font-semibold text-gray-900">Recommendation:</span>{' '}
                                                <span className="text-green-700 font-medium">{analysisResult.recommendation}</span>
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {!isAnalyzing && !analysisResult && (
                                    <p className="text-xs text-gray-500">Click "Analyze Risks" to scan this candidate's profile for potential hiring risks.</p>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions Bar */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="grid grid-cols-3 gap-2">
                                <button className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors">
                                    <Mail size={18} />
                                    <span className="text-xs">Email</span>
                                </button>
                                <button
                                    onClick={() => setIsScheduleOpen(true)}
                                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 border border-orange-300 text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors"
                                >
                                    <Calendar size={18} />
                                    <span className="text-xs">Schedule</span>
                                </button>
                                <button
                                    onClick={() => setIsOfferOpen(true)}
                                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                                >
                                    <CheckCircle2 size={18} />
                                    <span className="text-xs">Offer</span>
                                </button>
                            </div>
                        </div>

                        {/* Schedule Modal */}
                        <ScheduleModal
                            isOpen={isScheduleOpen}
                            onClose={() => setIsScheduleOpen(false)}
                            candidateName={candidate.name}
                        />

                        {/* Offer Modal */}
                        <OfferModal
                            isOpen={isOfferOpen}
                            onClose={() => setIsOfferOpen(false)}
                            candidateName={candidate.name}
                            candidateRole={candidate.role}
                        />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
