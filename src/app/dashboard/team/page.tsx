'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, Plus, Users, X, Mail, Briefcase, FileText, CheckCircle, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TeamMember {
    id: string
    full_name: string
    email: string
    position?: string
    department?: string
    avatar_url?: string
}

export default function TeamPage() {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [uploadFile, setUploadFile] = useState<File | null>(null)

    // Form state for adding member
    const [newMember, setNewMember] = useState({
        full_name: '',
        email: '',
        position: '',
        department: ''
    })

    useEffect(() => {
        fetchMembers()
    }, [])

    async function fetchMembers() {
        const supabase = createClient()
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
        setMembers(data || [])
        setLoading(false)
    }

    async function handleAddMember(e: React.FormEvent) {
        e.preventDefault()
        const supabase = createClient()

        const { error } = await supabase
            .from('profiles')
            .insert([{
                full_name: newMember.full_name,
                email: newMember.email,
                position: newMember.position,
                department: newMember.department
            }])

        if (!error) {
            setNewMember({ full_name: '', email: '', position: '', department: '' })
            setIsAddOpen(false)
            fetchMembers()
        } else {
            alert('Error adding member: ' + error.message)
        }
    }

    function handleDrag(e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setUploadFile(e.dataTransfer.files[0])
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0])
        }
    }

    async function handleUploadCSV() {
        if (!uploadFile) return

        // TODO: Implement CSV parsing and bulk insert
        alert('CSV Upload functionality - parse and add members from: ' + uploadFile.name)
        setUploadFile(null)
        setIsUploadOpen(false)
    }

    function getInitials(name: string) {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Team Members</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Manage your organization's team and roles</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Help Bubble */}
                    <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border border-[#e8e4e0]">
                        <Sparkles className="w-4 h-4 text-[#e07850]" />
                        <span className="text-[#1a1a1a] text-sm font-medium">Hey, Need help?</span>
                        <span className="text-lg">👋</span>
                    </div>
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e8e4e0] text-[#6b6b6b] rounded-full font-medium text-sm hover:bg-[#faf8f5] hover:border-[#d9d5d0] transition-colors shadow-sm"
                    >
                        <Upload size={16} />
                        Upload CSV
                    </button>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-medium text-sm hover:from-[#d45a3a] hover:to-[#c04a2a] transition-colors shadow-lg"
                    >
                        <Plus size={16} />
                        Add Member
                    </button>
                </div>
            </div>

            {/* Team Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-3xl border border-[#e8e4e0] p-6 animate-pulse shadow-md">
                            <div className="w-20 h-20 rounded-full bg-[#f5f3f0] mx-auto mb-4" />
                            <div className="h-4 bg-[#f5f3f0] rounded w-3/4 mx-auto mb-2" />
                            <div className="h-3 bg-[#f5f3f0] rounded w-1/2 mx-auto" />
                        </div>
                    ))}
                </div>
            ) : members.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-[#e8e4e0] p-12 text-center shadow-sm">
                    <Users className="h-12 w-12 text-[#a0a0a0] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">No team members yet</h3>
                    <p className="text-[#6b6b6b] mb-4">Get started by adding your first team member</p>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-medium text-sm hover:from-[#d45a3a] hover:to-[#c04a2a] transition-colors shadow-lg"
                    >
                        <Plus size={16} />
                        Add Member
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.map((member, i) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-3xl border border-[#e8e4e0] p-6 hover:shadow-lg hover:border-[#e07850]/30 transition-all shadow-md"
                        >
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                {getInitials(member.full_name || 'U')}
                            </div>

                            {/* Info */}
                            <div className="text-center mb-4">
                                <h3 className="font-bold text-[#1a1a1a] text-lg">{member.full_name || 'Unknown'}</h3>
                                <p className="text-[#e07850] font-medium text-sm mt-0.5">
                                    {member.position || 'Team Member'}
                                </p>
                                <p className="text-[#6b6b6b] text-sm mt-1 flex items-center justify-center gap-1">
                                    <Mail size={12} />
                                    {member.email}
                                </p>
                            </div>

                            {/* Stats Footer */}
                            <div className="border-t border-[#e8e4e0] pt-4 flex justify-center gap-6 text-center">
                                <div>
                                    <div className="text-lg font-bold text-[#1a1a1a]">12</div>
                                    <div className="text-xs text-[#a0a0a0]">Projects</div>
                                </div>
                                <div className="w-px bg-[#e8e4e0]" />
                                <div>
                                    <div className="text-lg font-bold text-[#1a1a1a]">98%</div>
                                    <div className="text-xs text-[#a0a0a0]">Attendance</div>
                                </div>
                                <div className="w-px bg-[#e8e4e0]" />
                                <div>
                                    <div className="text-lg font-bold text-[#1a1a1a]">4.8</div>
                                    <div className="text-xs text-[#a0a0a0]">Rating</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Upload CSV Modal */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsUploadOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-white rounded-3xl p-6 w-full max-w-md mx-4 shadow-xl border border-[#e8e4e0]"
                    >
                        <button
                            onClick={() => setIsUploadOpen(false)}
                            className="absolute top-4 right-4 text-[#a0a0a0] hover:text-[#1a1a1a] transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">Upload Team CSV</h3>
                        <p className="text-sm text-[#6b6b6b] mb-6">
                            Upload a CSV file with columns: name, email, position, department
                        </p>

                        {/* Dropzone */}
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${dragActive
                                ? 'border-[#e07850] bg-[#e07850]/5'
                                : uploadFile
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-[#e8e4e0] bg-[#faf8f5]'
                                }`}
                        >
                            {uploadFile ? (
                                <div className="flex flex-col items-center">
                                    <CheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
                                    <p className="text-sm font-medium text-[#1a1a1a]">{uploadFile.name}</p>
                                    <p className="text-xs text-[#6b6b6b] mt-1">Ready to upload</p>
                                </div>
                            ) : (
                                <>
                                    <FileText className="h-10 w-10 text-[#a0a0a0] mx-auto mb-2" />
                                    <p className="text-sm text-[#6b6b6b] mb-2">Drag & drop CSV here</p>
                                    <p className="text-xs text-[#a0a0a0] mb-3">or</p>
                                    <label className="inline-block">
                                        <span className="text-[#e07850] font-medium text-sm cursor-pointer hover:underline">
                                            Browse files
                                        </span>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => { setIsUploadOpen(false); setUploadFile(null); }}
                                className="px-4 py-2 text-[#6b6b6b] font-medium text-sm hover:text-[#1a1a1a] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUploadCSV}
                                disabled={!uploadFile}
                                className="px-4 py-2 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-medium text-sm hover:from-[#d45a3a] hover:to-[#c04a2a] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                Upload
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Add Member Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-white rounded-3xl p-6 w-full max-w-md mx-4 shadow-xl border border-[#e8e4e0]"
                    >
                        <button
                            onClick={() => setIsAddOpen(false)}
                            className="absolute top-4 right-4 text-[#a0a0a0] hover:text-[#1a1a1a] transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">Add Team Member</h3>
                        <p className="text-sm text-[#6b6b6b] mb-6">
                            Enter the details of the new team member
                        </p>

                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newMember.full_name}
                                    onChange={e => setNewMember({ ...newMember, full_name: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] placeholder-[#a0a0a0]"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={newMember.email}
                                    onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] placeholder-[#a0a0a0]"
                                    placeholder="john@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Position</label>
                                <input
                                    type="text"
                                    value={newMember.position}
                                    onChange={e => setNewMember({ ...newMember, position: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] placeholder-[#a0a0a0]"
                                    placeholder="Senior Developer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Department</label>
                                <input
                                    type="text"
                                    value={newMember.department}
                                    onChange={e => setNewMember({ ...newMember, department: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] placeholder-[#a0a0a0]"
                                    placeholder="Engineering"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddOpen(false)}
                                    className="px-4 py-2 text-[#6b6b6b] font-medium text-sm hover:text-[#1a1a1a] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-medium text-sm hover:from-[#d45a3a] hover:to-[#c04a2a] shadow-md"
                                >
                                    Add Member
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
