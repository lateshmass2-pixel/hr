'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import * as tf from '@tensorflow/tfjs'
import * as blazeface from '@tensorflow-models/blazeface'
import { AlertTriangle, Camera, CameraOff, Eye, Shield, Loader2, RefreshCw } from 'lucide-react'

interface AiProctorProps {
    onDisqualify: () => void
    isActive: boolean
}

type ProctorStatus = 'loading' | 'active' | 'warning' | 'terminated' | 'blocked'

const MAX_STRIKES = 3
const DETECT_INTERVAL_MS = 1000
const INIT_TIMEOUT_MS = 20000       // must have camera + model ready within this window
const LEAVE_COOLDOWN_MS = 2000      // debounce blur/visibilitychange double-fires
const CAMERA_LOST_TOLERANCE = 5     // consecutive not-ready checks (~5s) before blocking

// Self-hosted BlazeFace model (in /public/models/blazeface). Overridable via env.
// Self-hosting removes the runtime dependency on tfhub.dev -> Kaggle at exam time.
const BLAZEFACE_MODEL_URL =
    process.env.NEXT_PUBLIC_BLAZEFACE_MODEL_URL || '/models/blazeface/model.json'

/**
 * Loads BlazeFace from the self-hosted model first, falling back to the
 * package's default CDN (tfhub.dev -> Kaggle) only if the local copy is
 * missing/unreachable. Callers must have awaited tf.ready() beforehand.
 */
async function loadBlazeface(): Promise<blazeface.BlazeFaceModel> {
    try {
        return await blazeface.load({ modelUrl: BLAZEFACE_MODEL_URL })
    } catch (localError) {
        console.warn('⚠️ Self-hosted BlazeFace model unavailable, falling back to CDN:', localError)
        return await blazeface.load()
    }
}

export function AiProctor({ onDisqualify, isActive }: AiProctorProps) {
    const webcamRef = useRef<Webcam>(null)
    const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null)
    const [strikes, setStrikes] = useState(0)
    const [status, setStatus] = useState<ProctorStatus>('loading')
    const [warningMessage, setWarningMessage] = useState<string | null>(null)
    const [blockReason, setBlockReason] = useState<string | null>(null)
    const [attempt, setAttempt] = useState(0)   // webcam remount key, used for retry

    // Refs mirror state so event handlers/loops read fresh values without re-binding.
    const statusRef = useRef(status)
    const isActiveRef = useRef(isActive)
    const modelRef = useRef<blazeface.BlazeFaceModel | null>(null)
    const cameraReadyRef = useRef(false)
    const lastLeaveRef = useRef(0)
    const notReadyCountRef = useRef(0)

    useEffect(() => { statusRef.current = status }, [status])
    useEffect(() => { isActiveRef.current = isActive }, [isActive])

    // Go live only once BOTH the model and the camera are ready. Called from
    // the model loader and the camera's onUserMedia callback (never
    // synchronously inside an effect).
    const maybeActivate = useCallback(() => {
        if (modelRef.current && cameraReadyRef.current && statusRef.current === 'loading') {
            setStatus('active')
        }
    }, [])

    // ----------------------------------------------------------------------
    // Load the BlazeFace model. Retryable via `attempt`. Fail closed -> 'blocked'.
    // setState runs only after `await`, so this is a valid async-resource effect.
    // ----------------------------------------------------------------------
    useEffect(() => {
        let cancelled = false

        ;(async () => {
            if (modelRef.current) {
                maybeActivate()
                return
            }
            try {
                await tf.ready()
                const loaded = await loadBlazeface()
                if (cancelled) return
                modelRef.current = loaded
                setModel(loaded)
                maybeActivate()
            } catch (error) {
                if (cancelled) return
                console.error('Error loading BlazeFace model:', error)
                setBlockReason('Could not start the proctoring engine. Check your connection and click retry.')
                setStatus('blocked')
            }
        })()

        return () => { cancelled = true }
    }, [attempt, maybeActivate])

    // Initialization timeout: if we never became active, block (fail closed).
    useEffect(() => {
        if (!isActive) return
        const timer = setTimeout(() => {
            if (statusRef.current === 'loading') {
                setBlockReason('Camera not detected. Please allow camera access to continue.')
                setStatus('blocked')
            }
        }, INIT_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [isActive, attempt])

    // ----------------------------------------------------------------------
    // Strike logic — shared by face + tab-switch violations (single budget).
    // ----------------------------------------------------------------------
    const handleStrike = useCallback((message: string) => {
        setStrikes(prev => {
            const next = prev + 1
            if (next >= MAX_STRIKES) {
                setStatus('terminated')
            } else {
                setStatus('warning')
                setWarningMessage(`${message} Strike ${next}/${MAX_STRIKES}`)
                setTimeout(() => {
                    setWarningMessage(null)
                    setStatus(s => (s === 'warning' ? 'active' : s))
                }, 3000)
            }
            return next
        })
    }, [])

    // ----------------------------------------------------------------------
    // Tab-switch / window-blur detection.
    // Only counts while proctoring is live, and debounced so one switch
    // (which fires both blur AND visibilitychange) is a single strike.
    // ----------------------------------------------------------------------
    useEffect(() => {
        const isLive = () =>
            isActiveRef.current && (statusRef.current === 'active' || statusRef.current === 'warning')

        const registerLeave = (message: string) => {
            if (!isLive()) return
            const now = Date.now()
            if (now - lastLeaveRef.current < LEAVE_COOLDOWN_MS) return
            lastLeaveRef.current = now
            handleStrike(message)
        }

        const onVisibility = () => {
            if (document.hidden) registerLeave('You left the assessment tab.')
        }
        const onBlur = () => registerLeave('You switched away from the assessment window.')

        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('blur', onBlur)
        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('blur', onBlur)
        }
    }, [handleStrike])

    // Notify parent once terminated (avoids setState-during-render).
    useEffect(() => {
        if (status === 'terminated') onDisqualify()
    }, [status, onDisqualify])

    // ----------------------------------------------------------------------
    // Face detection loop.
    // ----------------------------------------------------------------------
    const detectFaces = useCallback(async () => {
        if (!model || !isActiveRef.current) return

        // Don't run (and don't penalize) while the tab is hidden — the
        // visibility handler already recorded that as a leave.
        if (typeof document !== 'undefined' && document.hidden) return

        const video = webcamRef.current?.video
        if (!video) return

        // Camera lost mid-test: was live, feed no longer ready -> block after tolerance.
        if (video.readyState !== 4) {
            if (cameraReadyRef.current) {
                notReadyCountRef.current += 1
                if (notReadyCountRef.current >= CAMERA_LOST_TOLERANCE) {
                    setBlockReason('Camera feed lost. Please re-enable your camera to continue.')
                    setStatus('blocked')
                }
            }
            return
        }
        notReadyCountRef.current = 0

        try {
            const predictions = await model.estimateFaces(video, false)
            if (predictions.length === 0) {
                handleStrike('No face detected. Please stay in frame.')
            } else if (predictions.length > 1) {
                handleStrike('Multiple faces detected. Only the candidate should be visible.')
            } else {
                setStatus(s => (s === 'warning' ? s : 'active'))
                setWarningMessage(prev => (statusRef.current === 'warning' ? prev : null))
            }
        } catch (error) {
            console.error('Face detection error:', error)
        }
    }, [model, handleStrike])

    useEffect(() => {
        if (!model || !isActive || status === 'terminated' || status === 'blocked') return
        const interval = setInterval(detectFaces, DETECT_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [model, isActive, status, detectFaces])

    // ----------------------------------------------------------------------
    // Retry after a block (re-request camera + reload engine if it failed).
    // ----------------------------------------------------------------------
    const handleRetry = useCallback(() => {
        setBlockReason(null)
        cameraReadyRef.current = false
        notReadyCountRef.current = 0
        setStatus('loading')
        // Bumping `attempt` remounts <Webcam> (re-triggering the permission
        // prompt) and re-runs the loader effect (reloads the engine if needed).
        setAttempt(a => a + 1)
    }, [])

    if (status === 'terminated' || !isActive) return null

    const isBlocked = status === 'blocked'

    return (
        <>
            {/* Picture-in-Picture Webcam Feed (kept mounted so media callbacks fire) */}
            <div className={`fixed bottom-4 right-4 z-50 ${isBlocked ? 'opacity-0 pointer-events-none' : ''}`}>
                <div className={`
                    relative rounded-xl overflow-hidden shadow-2xl border-4 transition-colors
                    ${status === 'loading' ? 'border-gray-400' : ''}
                    ${status === 'active' ? 'border-green-500' : ''}
                    ${status === 'warning' ? 'border-red-500 animate-pulse' : ''}
                `}>
                    <Webcam
                        key={attempt}
                        ref={webcamRef}
                        audio={false}
                        width={200}
                        height={150}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                            width: 200,
                            height: 150,
                            facingMode: 'user'
                        }}
                        onUserMedia={() => {
                            cameraReadyRef.current = true
                            maybeActivate()
                        }}
                        onUserMediaError={() => {
                            setBlockReason('Camera access is required for this assessment. Please allow camera permissions and click retry.')
                            setStatus('blocked')
                        }}
                        className="rounded-lg"
                    />

                    {/* Status Overlay */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        {status === 'loading' ? (
                            <div className="px-2 py-1 bg-gray-900/80 rounded-full flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                <span className="text-[10px] text-white font-medium">Loading AI...</span>
                            </div>
                        ) : (
                            <div className={`px-2 py-1 rounded-full flex items-center gap-1.5 ${status === 'active' ? 'bg-green-600/90' : 'bg-red-600/90'
                                }`}>
                                {status === 'active' ? (
                                    <Eye className="w-3 h-3 text-white" />
                                ) : (
                                    <AlertTriangle className="w-3 h-3 text-white" />
                                )}
                                <span className="text-[10px] text-white font-medium">
                                    {status === 'active' ? 'Proctoring' : 'Warning'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Strike Counter */}
                    <div className="absolute bottom-2 right-2">
                        <div className="px-2 py-1 bg-gray-900/80 rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3 text-white" />
                            <span className={`text-[10px] font-bold ${strikes === 0 ? 'text-green-400' :
                                strikes === 1 ? 'text-yellow-400' :
                                    'text-red-400'
                                }`}>
                                {strikes}/{MAX_STRIKES}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Toast */}
            {warningMessage && !isBlocked && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                    <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">{warningMessage}</span>
                    </div>
                </div>
            )}

            {/* Setup gate — blocks the quiz until camera + engine are ready */}
            {status === 'loading' && (
                <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="max-w-sm w-full text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                            <Camera className="w-8 h-8 text-emerald-800" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Setting up secure proctoring</h3>
                        <p className="text-sm text-gray-500">
                            Please allow camera access when prompted. The assessment unlocks once the proctor is active.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-emerald-800">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">Initializing...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Hard block — camera denied / engine failed / feed lost */}
            {isBlocked && (
                <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="max-w-sm w-full text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                            <CameraOff className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Proctoring unavailable</h3>
                        <p className="text-sm text-gray-600">
                            {blockReason ?? 'The camera is required to continue this assessment.'}
                        </p>
                        <button
                            onClick={handleRetry}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm"
                        >
                            <RefreshCw className="w-4 h-4" /> Retry camera
                        </button>
                        <p className="text-xs text-gray-400">
                            You cannot proceed with the assessment until proctoring is active.
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
