'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Play, Clock, Star, BookOpen, TrendingUp, Target,
    Sparkles, ChevronRight, Code, Palette, Users, Award, Check
} from 'lucide-react'
import { useHems, Course } from '@/context/HemsContext'

// Skills Data
const SKILLS = [
    { name: 'React', level: 80, status: 'Advanced' },
    { name: 'TypeScript', level: 65, status: 'Intermediate' },
    { name: 'Design Systems', level: 45, status: 'Growing' },
    { name: 'Node.js', level: 55, status: 'Intermediate' },
    { name: 'Leadership', level: 20, status: 'Beginner' },
]

type TabType = 'my-learning' | 'catalog'

export default function LearningPage() {
    const { courses, enrolledCourses, availableCourses, enrollCourse } = useHems()
    const [activeTab, setActiveTab] = useState<TabType>('my-learning')
    const [isGenerating, setIsGenerating] = useState(false)
    const [learningPath, setLearningPath] = useState<string[] | null>(null)

    const currentCourse = enrolledCourses.find((c: Course) => c.progress > 0) || enrolledCourses[0]
    const userName = 'Alex'

    function getThumbnailIcon(type: string) {
        switch (type) {
            case 'code': return <Code size={40} className="text-blue-400" />
            case 'design': return <Palette size={40} className="text-purple-400" />
            case 'leadership': return <Users size={40} className="text-emerald-400" />
            default: return <BookOpen size={40} className="text-gray-400" />
        }
    }

    function getCategoryColor(category: string) {
        switch (category) {
            case 'Engineering': return 'bg-blue-100 text-blue-700'
            case 'Design': return 'bg-purple-100 text-purple-700'
            case 'Soft Skills': return 'bg-emerald-100 text-emerald-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    function handleEnrollCourse(id: number) {
        enrollCourse(id)
        // Switch to My Learning tab after enrolling
        setActiveTab('my-learning')
    }

    function handleGenerateLearningPath() {
        setIsGenerating(true)
        setTimeout(() => {
            setIsGenerating(false)
            setLearningPath([
                '1. Complete "Leadership for Tech Managers" (Priority: High)',
                '2. Take "Design Systems Masterclass" to improve collaboration',
                '3. Finish "TypeScript Deep Dive" for advanced proficiency',
                '4. Practice soft skills with "Effective Communication"',
            ])
        }, 2000)
    }

    return (
        <div className="space-y-8">
            {/* Hero Section - Continue Watching (only show if enrolled courses exist) */}
            {currentCourse && (
                <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-8 text-white relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />

                    <div className="relative flex flex-col md:flex-row items-center gap-8">
                        {/* Left - Info */}
                        <div className="flex-1">
                            <p className="text-white/80 text-sm mb-2">Continue Learning</p>
                            <h1 className="text-2xl md:text-3xl font-bold mb-2">
                                Welcome back, {userName}!
                            </h1>
                            <p className="text-white/90 mb-4">
                                You're {currentCourse.progress}% through "{currentCourse.title}"
                            </p>

                            {/* Progress Bar */}
                            <div className="w-full max-w-md mb-4">
                                <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${currentCourse.progress}%` }}
                                        transition={{ duration: 0.8 }}
                                        className="h-full bg-white rounded-full"
                                    />
                                </div>
                                <p className="text-xs text-white/70 mt-1">{currentCourse.progress}% Complete</p>
                            </div>

                            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-colors">
                                <Play size={18} fill="currentColor" />
                                Resume Course
                            </button>
                        </div>

                        {/* Right - Thumbnail */}
                        <div className="relative">
                            <div className="w-48 h-32 md:w-64 md:h-40 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-2xl">
                                {getThumbnailIcon(currentCourse.thumbnail)}
                            </div>
                            <button className="absolute inset-0 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                                    <Play size={24} className="text-orange-500 ml-1" fill="currentColor" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('my-learning')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === 'my-learning'
                        ? 'text-orange-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    My Learning ({enrolledCourses.length})
                    {activeTab === 'my-learning' && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === 'catalog'
                        ? 'text-orange-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Course Catalog ({availableCourses.length})
                    {activeTab === 'catalog' && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                        />
                    )}
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Course Grid - 3 Columns */}
                <div className="lg:col-span-3 space-y-6">
                    <AnimatePresence mode="wait">
                        {activeTab === 'my-learning' ? (
                            <motion.div
                                key="my-learning"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {enrolledCourses.length > 0 ? (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <TrendingUp size={18} className="text-orange-500" />
                                                In Progress
                                            </h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {enrolledCourses.map((course: Course) => (
                                                <motion.div
                                                    key={course.id}
                                                    whileHover={{ y: -4 }}
                                                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                        {getThumbnailIcon(course.thumbnail)}

                                                        {/* Duration Badge */}
                                                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded font-medium flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {course.duration}
                                                        </div>

                                                        {/* Progress Overlay */}
                                                        {course.progress > 0 && (
                                                            <div className="absolute top-2 left-2 px-2 py-1 bg-orange-500 text-white text-xs rounded font-medium">
                                                                {course.progress}% done
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="p-4">
                                                        <div className="flex items-center gap-1 mb-2">
                                                            <Star size={12} className="text-yellow-500" fill="currentColor" />
                                                            <span className="text-xs text-gray-600">{course.rating}</span>
                                                        </div>

                                                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{course.title}</h3>
                                                        <p className="text-sm text-gray-500 mb-3">By {course.author}</p>

                                                        {/* Progress Bar */}
                                                        <div className="mb-3">
                                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${course.progress}%` }}
                                                                    transition={{ duration: 0.5 }}
                                                                    className="h-full bg-orange-500 rounded-full"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Action */}
                                                        <button className="text-sm text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                            Continue <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses enrolled yet</h3>
                                        <p className="text-gray-500 mb-4">Browse the catalog and enroll in courses to start learning</p>
                                        <button
                                            onClick={() => setActiveTab('catalog')}
                                            className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                                        >
                                            Browse Catalog
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="catalog"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <Sparkles size={18} className="text-orange-500" />
                                        Available Courses
                                    </h2>
                                </div>

                                {availableCourses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {availableCourses.map((course: Course) => (
                                            <motion.div
                                                key={course.id}
                                                whileHover={{ y: -4 }}
                                                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group"
                                            >
                                                {/* Thumbnail */}
                                                <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                    {getThumbnailIcon(course.thumbnail)}

                                                    {/* Duration Badge */}
                                                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded font-medium flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {course.duration}
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <div className="p-4">
                                                    <div className="flex items-center gap-1 mb-2">
                                                        <Star size={12} className="text-yellow-500" fill="currentColor" />
                                                        <span className="text-xs text-gray-600">{course.rating}</span>
                                                    </div>

                                                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{course.title}</h3>
                                                    <p className="text-sm text-gray-500 mb-3">By {course.author}</p>

                                                    {/* Tags */}
                                                    <div className="flex flex-wrap gap-1 mb-4">
                                                        {course.tags.map((tag: string) => (
                                                            <span key={tag} className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(course.category)}`}>
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* Enroll Button */}
                                                    <button
                                                        onClick={() => handleEnrollCourse(course.id)}
                                                        className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Check size={16} />
                                                        Enroll Now
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <Check size={48} className="mx-auto text-emerald-400 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">All courses enrolled!</h3>
                                        <p className="text-gray-500">You've enrolled in all available courses. Keep learning!</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Skill Matrix Sidebar */}
                <div className="space-y-4">
                    {/* Skills Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Target size={18} className="text-orange-500" />
                            Skill Matrix
                        </h3>

                        <div className="space-y-4">
                            {SKILLS.map(skill => (
                                <div key={skill.name}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium text-gray-700">{skill.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${skill.level >= 70 ? 'bg-green-100 text-green-700' :
                                            skill.level >= 40 ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {skill.status}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${skill.level}%` }}
                                            transition={{ duration: 0.8, delay: 0.1 }}
                                            className={`h-full rounded-full ${skill.level >= 70 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                                                skill.level >= 40 ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                                                    'bg-gradient-to-r from-gray-300 to-gray-400'
                                                }`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Learning Path Generator */}
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Sparkles size={16} className="text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900">AI Learning Path</h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Generate a personalized learning path based on your skill gaps.
                        </p>

                        <button
                            onClick={handleGenerateLearningPath}
                            disabled={isGenerating}
                            className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <Sparkles size={16} />
                                    </motion.div>
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generate Learning Path
                                </>
                            )}
                        </button>

                        {/* Generated Path */}
                        {learningPath && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 bg-white rounded-lg border border-purple-100"
                            >
                                <p className="text-xs font-medium text-purple-700 mb-2">Your Personalized Path:</p>
                                <ul className="space-y-2">
                                    {learningPath.map((step, idx) => (
                                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                                {idx + 1}
                                            </span>
                                            {step.slice(3)}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </div>

                    {/* Achievements */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Award size={18} className="text-yellow-500" />
                            Recent Achievements
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                    🎯
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">First Course Completed</p>
                                    <p className="text-xs text-gray-500">2 days ago</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    🔥
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">7-Day Streak</p>
                                    <p className="text-xs text-gray-500">Keep it up!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
