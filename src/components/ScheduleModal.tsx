'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Video, Phone, MapPin, Copy, Check, Calendar, Clock, Users } from 'lucide-react'

interface ScheduleModalProps {
    isOpen: boolean
    onClose: () => void
    candidateName: string
}

type InterviewType = 'video' | 'phone' | 'in-person'

const TIME_SLOTS = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
]

const INTERVIEWERS = [
    { id: 1, name: 'You', initials: 'YO', color: 'from-orange-400 to-red-400' },
    { id: 2, name: 'Tech Lead', initials: 'TL', color: 'from-blue-400 to-indigo-400' },
    { id: 3, name: 'CTO', initials: 'CT', color: 'from-purple-400 to-pink-400' },
]

export default function ScheduleModal({ isOpen, onClose, candidateName }: ScheduleModalProps) {
    const [interviewType, setInterviewType] = useState<InterviewType>('video')
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTime, setSelectedTime] = useState('10:00 AM')
    const [selectedInterviewers, setSelectedInterviewers] = useState([1, 2])
    const [copied, setCopied] = useState(false)
    const [sending, setSending] = useState(false)

    const meetLink = 'meet.google.com/abc-defg-hij'

    function handleCopyLink() {
        navigator.clipboard.writeText(`https://${meetLink}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function toggleInterviewer(id: number) {
        setSelectedInterviewers(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        )
    }

    function handleSendInvites() {
        setSending(true)
        setTimeout(() => {
            setSending(false)
            onClose()
            // Show toast notification
            alert('✅ Calendar invites sent to candidate and interviewers!')
        }, 1500)
    }

    function formatDateForEmail(dateStr: string) {
        if (!dateStr) return '[Date]'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Schedule Interview</h2>
                                    <p className="text-sm text-gray-500">with {candidateName}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6">
                                {/* Interview Type Selection */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                                        Interview Type
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { type: 'video' as const, icon: Video, label: 'Video', sublabel: 'Google Meet' },
                                            { type: 'phone' as const, icon: Phone, label: 'Phone', sublabel: 'Voice Call' },
                                            { type: 'in-person' as const, icon: MapPin, label: 'In-Person', sublabel: 'Office Visit' },
                                        ].map(option => (
                                            <button
                                                key={option.type}
                                                onClick={() => setInterviewType(option.type)}
                                                className={`p-4 rounded-xl border-2 transition-all ${interviewType === option.type
                                                        ? 'border-orange-500 bg-orange-50'
                                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                                    }`}
                                            >
                                                <option.icon
                                                    size={24}
                                                    className={interviewType === option.type ? 'text-orange-600 mx-auto' : 'text-gray-400 mx-auto'}
                                                />
                                                <p className={`text-sm font-medium mt-2 ${interviewType === option.type ? 'text-orange-600' : 'text-gray-700'
                                                    }`}>
                                                    {option.label}
                                                </p>
                                                <p className="text-xs text-gray-400">{option.sublabel}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Auto-Generated Video Link */}
                                {interviewType === 'video' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Meeting Link
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={meetLink}
                                                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm"
                                            />
                                            <button
                                                onClick={handleCopyLink}
                                                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${copied
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                    }`}
                                            >
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                                {copied ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Date & Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <Calendar size={14} />
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <Clock size={14} />
                                            Time
                                        </label>
                                        <select
                                            value={selectedTime}
                                            onChange={(e) => setSelectedTime(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        >
                                            {TIME_SLOTS.map(slot => (
                                                <option key={slot} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Interviewers */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Users size={14} />
                                        Interview Panel
                                    </label>
                                    <div className="flex gap-3">
                                        {INTERVIEWERS.map(interviewer => (
                                            <button
                                                key={interviewer.id}
                                                onClick={() => toggleInterviewer(interviewer.id)}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${selectedInterviewers.includes(interviewer.id)
                                                        ? 'border-orange-500 bg-orange-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${interviewer.color} flex items-center justify-center text-white text-sm font-bold ${!selectedInterviewers.includes(interviewer.id) ? 'opacity-40' : ''
                                                    }`}>
                                                    {interviewer.initials}
                                                </div>
                                                <span className={`text-xs font-medium ${selectedInterviewers.includes(interviewer.id) ? 'text-gray-900' : 'text-gray-500'
                                                    }`}>
                                                    {interviewer.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Email Preview */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Email Preview
                                    </label>
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Hi <span className="font-medium text-gray-900">{candidateName}</span>,
                                            <br /><br />
                                            We'd like to invite you to a <span className="font-medium text-gray-900">{interviewType === 'video' ? 'video' : interviewType === 'phone' ? 'phone' : 'in-person'}</span> interview on{' '}
                                            <span className="font-medium text-gray-900">{formatDateForEmail(selectedDate)}</span> at{' '}
                                            <span className="font-medium text-gray-900">{selectedTime}</span>.
                                            {interviewType === 'video' && (
                                                <>
                                                    <br /><br />
                                                    You can join using this link: <span className="text-orange-600 font-medium">{meetLink}</span>
                                                </>
                                            )}
                                            <br /><br />
                                            Best regards,<br />
                                            <span className="font-medium text-gray-900">The Hiring Team</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2.5 text-gray-600 font-medium text-sm hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendInvites}
                                    disabled={!selectedDate || sending}
                                    className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Invites'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
