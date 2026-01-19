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

// Candidates (fetched from Supabase)
const MOCK_CANDIDATES: Candidate[] = []

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <Search className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Talent Scout</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Discover and source top candidates from multiple platforms</p>
                    </div>
                </div>

                {/* Help Bubble */}
                <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-5 py-3 shadow-md border border-[#e8e4e0]">
                    <Sparkles className="w-5 h-5 text-[#e07850]" />
                    <span className="text-[#1a1a1a] font-medium">Hey, Need help?</span>
                    <span className="text-2xl">👋</span>
                </div>
            </div>

            {/* Search Command Center */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-[#e8e4e0] p-6 shadow-md"
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Role Input */}
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Role</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a0a0a0]" />
                            <input
                                type="text"
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                placeholder="e.g. Senior React Developer"
                                className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] placeholder-[#a0a0a0] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850]"
                            />
                        </div>
                    </div>

                    {/* Location Input */}
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a0a0a0]" />
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="e.g. New York, Remote"
                                className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] placeholder-[#a0a0a0] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850]"
                            />
                        </div>
                    </div>

                    {/* Platform Dropdown */}
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Platform</label>
                        <select
                            value={platform}
                            onChange={e => setPlatform(e.target.value as Platform)}
                            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850]"
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
                            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-medium hover:from-[#d45a3a] hover:to-[#c04a2a] transition-colors shadow-lg"
                        >
                            <Search size={18} />
                            Find Talent
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Empty State */}
            {MOCK_CANDIDATES.length === 0 && (
                <div className="bg-white rounded-3xl border-2 border-dashed border-[#e8e4e0] p-12 text-center shadow-sm">
                    <Search className="h-12 w-12 text-[#a0a0a0] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">Start Your Talent Search</h3>
                    <p className="text-[#6b6b6b] max-w-md mx-auto">
                        Enter a role and location above, then click "Find Talent" to search for candidates on LinkedIn, GitHub, or Behance.
                    </p>
                </div>
            )}

            {/* Candidate Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_CANDIDATES.map((candidate, i) => (
                    <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-3xl border border-[#e8e4e0] p-5 hover:shadow-lg hover:border-[#e07850]/30 transition-all shadow-md"
                    >
                        {/* Header with Avatar & Platform Icon */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center text-white text-lg font-bold shadow-md">
                                {getInitials(candidate.name)}
                            </div>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${candidate.platform === 'linkedin'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-[#f5f3f0] text-[#6b6b6b]'
                                }`}>
                                {candidate.platform === 'linkedin' ? <Linkedin size={16} /> : <Github size={16} />}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="mb-3">
                            <h4 className="font-bold text-[#1a1a1a]">{candidate.name}</h4>
                            <p className="text-sm text-[#6b6b6b]">{candidate.role} @ {candidate.company}</p>
                            <p className="text-xs text-[#a0a0a0] mt-1 flex items-center gap-3">
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
                                <span key={j} className="px-2 py-0.5 bg-[#e07850]/10 text-[#e07850] text-xs rounded-full font-medium border border-[#e07850]/20">
                                    {skill}
                                </span>
                            ))}
                        </div>

                        {/* Match Score */}
                        <div className="mb-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${candidate.matchScore >= 90
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-[#e07850]/10 text-[#e07850] border-[#e07850]/20'
                                }`}>
                                <Star size={12} />
                                {candidate.matchScore}% Match
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-[#e8e4e0]">
                            <button
                                onClick={() => setSelectedCandidate(candidate)}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-xl text-sm font-medium hover:from-[#d45a3a] hover:to-[#c04a2a] transition-colors shadow-md"
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-[#e8e4e0]"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#f5f3f0] hover:bg-[#e8e4e0] transition-colors"
                        >
                            <X size={20} className="text-[#6b6b6b]" />
                        </button>

                        {/* Header Banner */}
                        <div className="h-32 bg-gradient-to-r from-[#e07850]/30 to-[#d45a3a]/10" />

                        {/* Profile Header */}
                        <div className="px-6 -mt-12 relative">
                            {/* Avatar */}
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                                {getInitials(candidate.name)}
                            </div>

                            {/* Platform Badge */}
                            <div className={`absolute top-0 right-6 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${candidate.platform === 'linkedin'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#f5f3f0] text-[#1a1a1a]'
                                }`}>
                                {candidate.platform === 'linkedin' ? <Linkedin size={20} /> : <Github size={20} />}
                            </div>

                            {/* Identity */}
                            <div className="mt-4">
                                <h2 className="text-xl font-bold text-[#1a1a1a]">{candidate.name}</h2>
                                <p className="text-[#6b6b6b]">{candidate.role} @ {candidate.company}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="flex items-center gap-1 text-sm text-[#a0a0a0]">
                                        <MapPin size={14} />
                                        {candidate.location}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${candidate.matchScore >= 90
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-[#e07850]/10 text-[#e07850]'
                                        }`}>
                                        <Star size={10} />
                                        {candidate.matchScore}% Match
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Summary Section */}
                        <div className="px-6 mt-4">
                            <div className="bg-[#e07850]/10 border border-[#e07850]/30 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e07850]/20 text-[#e07850] rounded-full text-xs font-semibold">
                                        <Sparkles size={10} />
                                        AI Insight
                                    </span>
                                </div>
                                <p className="text-sm text-[#1a1a1a]">
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
                        <div className="flex border-b border-[#e8e4e0] mt-6 px-6">
                            {(['about', 'experience', 'education'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-3 text-sm font-medium capitalize transition-colors relative ${activeTab === tab
                                        ? 'text-[#e07850]'
                                        : 'text-[#a0a0a0] hover:text-[#1a1a1a]'
                                        }`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="tab-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e07850]"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'about' && (
                                <div className="space-y-4">
                                    <p className="text-[#6b6b6b] leading-relaxed">{candidate.about}</p>
                                    <div>
                                        <h4 className="text-sm font-semibold text-[#1a1a1a] mb-2">Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {candidate.skills.map((skill, i) => (
                                                <span key={i} className="px-3 py-1 bg-[#f5f3f0] text-[#6b6b6b] text-sm rounded-full border border-[#e8e4e0]">
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
                                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-[#e8e4e0]" />

                                    {/* Timeline Items */}
                                    {candidate.experienceHistory.map((exp, i) => (
                                        <div key={i} className="relative">
                                            {/* Timeline Dot */}
                                            <div className={`absolute -left-8 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${exp.isCurrent ? 'bg-[#e07850]' : 'bg-[#a0a0a0]'
                                                }`} />

                                            {/* Content Card */}
                                            <div className="bg-[#faf8f5] rounded-2xl p-4 border border-[#e8e4e0]">
                                                <div className="text-xs text-[#a0a0a0] uppercase tracking-wider font-medium mb-1">
                                                    {exp.startYear} — {exp.endYear}
                                                </div>
                                                <h4 className="font-bold text-[#1a1a1a]">{exp.role}</h4>
                                                <p className="text-sm text-[#6b6b6b]">at {exp.company}</p>
                                                <p className="text-sm text-[#a0a0a0] mt-2">{exp.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'education' && (
                                <div className="p-4 bg-[#faf8f5] rounded-2xl flex gap-4 border border-[#e8e4e0]">
                                    <div className="w-10 h-10 rounded-lg bg-[#e07850]/20 flex items-center justify-center text-[#e07850]">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-[#1a1a1a]">{candidate.education}</h4>
                                    </div>
                                </div>
                            )}

                            {/* AI Risk Analysis Section */}
                            <div className="mt-6 pt-6 border-t border-[#e8e4e0]">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                                        <Shield size={16} className="text-[#e07850]" />
                                        AI Risk Analysis
                                    </h4>
                                    {!analysisResult && !isAnalyzing && (
                                        <button
                                            onClick={handleAnalyzeRisks}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e07850]/50 text-[#e07850] rounded-full text-xs font-medium hover:bg-[#e07850]/10 transition-colors"
                                        >
                                            <Sparkles size={14} />
                                            Analyze Risks (AI)
                                        </button>
                                    )}
                                </div>

                                {/* Scanning Skeleton */}
                                {isAnalyzing && (
                                    <div className="p-4 bg-[#e07850]/10 rounded-2xl border border-[#e07850]/30">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#e07850]/30 animate-pulse" />
                                            <div className="flex-1">
                                                <div className="h-4 bg-[#e07850]/30 rounded animate-pulse w-32 mb-2" />
                                                <div className="h-3 bg-[#e07850]/20 rounded animate-pulse w-48" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-[#e07850]/20 rounded animate-pulse w-full" />
                                            <div className="h-3 bg-[#e07850]/20 rounded animate-pulse w-3/4" />
                                            <div className="h-3 bg-[#e07850]/20 rounded animate-pulse w-5/6" />
                                        </div>
                                        <p className="text-xs text-[#e07850] mt-3 flex items-center gap-2">
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
                                        className="p-4 bg-[#faf8f5] rounded-2xl border border-[#e8e4e0]"
                                    >
                                        {/* Risk Score */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${analysisResult.riskLevel === 'low'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : analysisResult.riskLevel === 'medium'
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                }`}>
                                                <Shield size={14} />
                                                {analysisResult.riskLevel === 'low' ? 'Low Risk' :
                                                    analysisResult.riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
                                            </span>
                                            <button
                                                onClick={() => { setAnalysisResult(null); setIsAnalyzing(false); }}
                                                className="text-xs text-[#a0a0a0] hover:text-[#1a1a1a]"
                                            >
                                                Clear
                                            </button>
                                        </div>

                                        {/* Key Insights */}
                                        <div className="space-y-2 mb-4">
                                            {analysisResult.insights.map((insight, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm">
                                                    {insight.type === 'positive' ? (
                                                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                                    ) : (
                                                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                    )}
                                                    <span className="text-[#6b6b6b]">{insight.text}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Recommendation */}
                                        <div className="pt-3 border-t border-[#e8e4e0]">
                                            <p className="text-sm">
                                                <span className="font-semibold text-[#1a1a1a]">Recommendation:</span>{' '}
                                                <span className="text-emerald-600 font-medium">{analysisResult.recommendation}</span>
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {!isAnalyzing && !analysisResult && (
                                    <p className="text-xs text-[#a0a0a0]">Click "Analyze Risks" to scan this candidate's profile for potential hiring risks.</p>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions Bar */}
                        <div className="p-4 border-t border-[#e8e4e0] bg-[#faf8f5]">
                            <div className="grid grid-cols-3 gap-2">
                                <button className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 border border-[#e8e4e0] text-[#6b6b6b] rounded-xl font-medium hover:bg-white transition-colors">
                                    <Mail size={18} />
                                    <span className="text-xs">Email</span>
                                </button>
                                <button
                                    onClick={() => setIsScheduleOpen(true)}
                                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 border border-[#e07850]/50 text-[#e07850] rounded-xl font-medium hover:bg-[#e07850]/10 transition-colors"
                                >
                                    <Calendar size={18} />
                                    <span className="text-xs">Schedule</span>
                                </button>
                                <button
                                    onClick={() => setIsOfferOpen(true)}
                                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-xl font-medium hover:from-[#d45a3a] hover:to-[#c04a2a] transition-colors shadow-md"
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
