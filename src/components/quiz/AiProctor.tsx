'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import * as tf from '@tensorflow/tfjs'
import * as blazeface from '@tensorflow-models/blazeface'
import { AlertTriangle, Camera, Eye, Shield, XCircle } from 'lucide-react'

interface AiProctorProps {
    onDisqualify: () => void
    isActive: boolean
}

type ProctorStatus = 'loading' | 'active' | 'warning' | 'terminated'

export function AiProctor({ onDisqualify, isActive }: AiProctorProps) {
    const webcamRef = useRef<Webcam>(null)
    const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null)
    const [strikes, setStrikes] = useState(0)
    const [status, setStatus] = useState<ProctorStatus>('loading')
    const [warningMessage, setWarningMessage] = useState<string | null>(null)
    const [isModelLoading, setIsModelLoading] = useState(true)

    // Load the BlazeFace model
    useEffect(() => {
        async function loadModel() {
            try {
                await tf.ready()
                const loadedModel = await blazeface.load()
                setModel(loadedModel)
                setIsModelLoading(false)
                setStatus('active')
            } catch (error) {
                console.error('Error loading BlazeFace model:', error)
                setIsModelLoading(false)
            }
        }
        loadModel()
    }, [])

    // Face detection callback
    const detectFaces = useCallback(async () => {
        if (!model || !webcamRef.current || !isActive) return

        const video = webcamRef.current.video
        if (!video || video.readyState !== 4) return

        try {
            const predictions = await model.estimateFaces(video, false)

            // Check conditions
            if (predictions.length === 0) {
                // No face detected
                handleStrike('No face detected. Please stay in frame.')
            } else if (predictions.length > 1) {
                // Multiple faces detected
                handleStrike('Multiple faces detected. Only the candidate should be visible.')
            } else {
                // Single face detected - all good
                setStatus('active')
                setWarningMessage(null)
            }
        } catch (error) {
            console.error('Face detection error:', error)
        }
    }, [model, isActive])

    // Handle strike logic
    const handleStrike = useCallback((message: string) => {
        setStrikes(prev => {
            const newStrikes = prev + 1

            if (newStrikes >= 3) {
                setStatus('terminated')
                // Don't call onDisqualify here - handled by useEffect below
            } else {
                setStatus('warning')
                setWarningMessage(`${message} Strike ${newStrikes}/3`)

                // Clear warning after 3 seconds
                setTimeout(() => {
                    setWarningMessage(null)
                    setStatus('active')
                }, 3000)
            }

            return newStrikes
        })
    }, [])

    // Handle disqualification after status changes to avoid setState during render
    useEffect(() => {
        if (status === 'terminated') {
            onDisqualify()
        }
    }, [status, onDisqualify])

    // Run detection loop
    useEffect(() => {
        if (!model || !isActive || status === 'terminated') return

        const interval = setInterval(() => {
            detectFaces()
        }, 1000) // Check every 1 second

        return () => clearInterval(interval)
    }, [model, isActive, status, detectFaces])

    // If terminated, don't render
    if (status === 'terminated') {
        return null
    }

    return (
        <>
            {/* Picture-in-Picture Webcam Feed */}
            <div className="fixed bottom-4 right-4 z-50">
                <div className={`
                    relative rounded-xl overflow-hidden shadow-2xl border-4 transition-colors
                    ${status === 'loading' ? 'border-gray-400' : ''}
                    ${status === 'active' ? 'border-green-500' : ''}
                    ${status === 'warning' ? 'border-red-500 animate-pulse' : ''}
                `}>
                    {/* Webcam */}
                    <Webcam
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
                        className="rounded-lg"
                    />

                    {/* Status Overlay */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        {isModelLoading ? (
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
                                {strikes}/3
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Toast */}
            {warningMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                    <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">{warningMessage}</span>
                    </div>
                </div>
            )}
        </>
    )
}
