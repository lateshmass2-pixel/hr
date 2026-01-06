'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, DollarSign, Calendar, Sparkles, Gift, Send, Check, FileText } from 'lucide-react'

interface OfferModalProps {
    isOpen: boolean
    onClose: () => void
    candidateName: string
    candidateRole: string
}

type Benefit = 'health' | 'dental' | 'vision' | 'remote' | '401k' | 'pto'

const BENEFITS_OPTIONS: { id: Benefit; label: string }[] = [
    { id: 'health', label: 'Health Insurance' },
    { id: 'dental', label: 'Dental Coverage' },
    { id: 'vision', label: 'Vision Care' },
    { id: 'remote', label: 'Remote Work' },
    { id: '401k', label: '401(k) Match' },
    { id: 'pto', label: 'Unlimited PTO' },
]

export default function OfferModal({ isOpen, onClose, candidateName, candidateRole }: OfferModalProps) {
    const [salary, setSalary] = useState('120,000')
    const [stockOptions, setStockOptions] = useState('5,000')
    const [startDate, setStartDate] = useState('')
    const [selectedBenefits, setSelectedBenefits] = useState<Benefit[]>(['health', 'dental', '401k'])
    const [isGenerating, setIsGenerating] = useState(false)
    const [isGenerated, setIsGenerated] = useState(false)
    const [isSending, setIsSending] = useState(false)

    function toggleBenefit(benefit: Benefit) {
        setSelectedBenefits(prev =>
            prev.includes(benefit)
                ? prev.filter(b => b !== benefit)
                : [...prev, benefit]
        )
        setIsGenerated(false)
    }

    function formatSalary(value: string) {
        // Remove non-digits, then format with commas
        const digits = value.replace(/\D/g, '')
        return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }

    function handleSalaryChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSalary(formatSalary(e.target.value))
        setIsGenerated(false)
    }

    function handleGenerate() {
        setIsGenerating(true)
        setTimeout(() => {
            setIsGenerating(false)
            setIsGenerated(true)
        }, 1500)
    }

    function triggerConfetti() {
        // Dynamic import for canvas-confetti (if available)
        // Fallback: simple visual feedback
        if (typeof window !== 'undefined') {
            import('canvas-confetti').then((confetti) => {
                confetti.default({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5']
                })
            }).catch(() => {
                // Confetti not available, continue silently
            })
        }
    }

    function handleSendOffer() {
        setIsSending(true)
        setTimeout(() => {
            triggerConfetti()
            setIsSending(false)
            onClose()
            alert(`🎉 Offer sent to ${candidateName}!`)
        }, 1500)
    }

    function formatDateForLetter(dateStr: string) {
        if (!dateStr) return '[Start Date]'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const benefitLabels = selectedBenefits.map(b =>
        BENEFITS_OPTIONS.find(opt => opt.id === b)?.label
    ).filter(Boolean)

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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                        <FileText size={20} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Generate Offer Letter</h2>
                                        <p className="text-sm text-gray-500">for {candidateName} • {candidateRole}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Split View Body */}
                            <div className="flex flex-1 overflow-hidden">
                                {/* Left Side - Controls */}
                                <div className="w-[400px] p-6 border-r border-gray-100 overflow-y-auto space-y-6">
                                    {/* Salary Input */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Annual Salary
                                        </label>
                                        <div className="relative">
                                            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={salary}
                                                onChange={handleSalaryChange}
                                                placeholder="120,000"
                                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Stock Options */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Stock Options
                                        </label>
                                        <div className="relative">
                                            <Gift size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={stockOptions}
                                                onChange={(e) => { setStockOptions(e.target.value); setIsGenerated(false); }}
                                                placeholder="5,000 units"
                                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">units</span>
                                        </div>
                                    </div>

                                    {/* Start Date */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <Calendar size={14} />
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value); setIsGenerated(false); }}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Benefits */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                                            Benefits Package
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {BENEFITS_OPTIONS.map(option => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => toggleBenefit(option.id)}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedBenefits.includes(option.id)
                                                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {selectedBenefits.includes(option.id) && <Check size={12} className="inline mr-1" />}
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Generate Button */}
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                Generate Offer (AI)
                                            </>
                                        )}
                                    </button>

                                    {isGenerated && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg"
                                        >
                                            <Check size={16} />
                                            Offer letter generated successfully!
                                        </motion.div>
                                    )}
                                </div>

                                {/* Right Side - Preview */}
                                <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
                                    <div className="bg-white rounded-lg shadow-md min-h-[500px] p-8 mx-auto max-w-[600px]">
                                        {/* Company Header */}
                                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                                                    HR
                                                </div>
                                                <span className="font-bold text-gray-900">HR Portal Inc.</span>
                                            </div>
                                            <span className="text-sm text-gray-500">{today}</span>
                                        </div>

                                        {/* Letter Content */}
                                        <div className="space-y-4 text-gray-700 leading-relaxed">
                                            <p className="font-semibold text-gray-900">
                                                Dear {candidateName},
                                            </p>

                                            <p>
                                                We are thrilled to extend this formal offer of employment for the position of{' '}
                                                <span className="font-semibold text-gray-900">{candidateRole}</span> at HR Portal Inc.
                                                After careful consideration, we believe your skills and experience make you an excellent fit for our team.
                                            </p>

                                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 my-6">
                                                <h4 className="font-semibold text-gray-900 mb-3">Compensation Package</h4>
                                                <ul className="space-y-2 text-sm">
                                                    <li className="flex justify-between">
                                                        <span className="text-gray-600">Annual Salary:</span>
                                                        <span className="font-semibold text-gray-900">${salary}</span>
                                                    </li>
                                                    <li className="flex justify-between">
                                                        <span className="text-gray-600">Stock Options:</span>
                                                        <span className="font-semibold text-gray-900">{stockOptions} units</span>
                                                    </li>
                                                    <li className="flex justify-between">
                                                        <span className="text-gray-600">Start Date:</span>
                                                        <span className="font-semibold text-gray-900">{formatDateForLetter(startDate)}</span>
                                                    </li>
                                                </ul>
                                            </div>

                                            <p>
                                                <span className="font-semibold">Benefits:</span>{' '}
                                                {benefitLabels.length > 0
                                                    ? benefitLabels.join(', ')
                                                    : 'Standard benefits package'
                                                }.
                                            </p>

                                            {/* Remote Work Policy - Conditional */}
                                            {selectedBenefits.includes('remote') && (
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                                                    <p className="text-blue-800">
                                                        <span className="font-semibold">🏠 Remote Work Policy:</span> You will have the flexibility
                                                        to work from home with occasional in-office collaboration days. We provide a $500 home
                                                        office stipend and cover all necessary equipment.
                                                    </p>
                                                </div>
                                            )}

                                            <p>
                                                This offer is contingent upon successful completion of our background verification process.
                                                Please review and sign this letter by{' '}
                                                <span className="font-semibold">{formatDateForLetter(startDate) !== '[Start Date]'
                                                    ? new Date(new Date(startDate).getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                                    : '[Deadline]'
                                                }</span>.
                                            </p>

                                            <p>
                                                We are excited about the possibility of you joining our team and look forward to your positive response.
                                            </p>

                                            <div className="pt-6 mt-6 border-t border-gray-200">
                                                <p className="text-gray-900">Best regards,</p>
                                                <p className="font-semibold text-gray-900 mt-2">The Hiring Team</p>
                                                <p className="text-sm text-gray-500">HR Portal Inc.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2.5 text-gray-600 font-medium text-sm hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendOffer}
                                    disabled={!isGenerated || isSending}
                                    className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Send Offer
                                        </>
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
