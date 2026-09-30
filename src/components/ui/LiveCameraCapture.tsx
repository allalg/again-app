import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, RefreshCw, X, Check, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface LiveCameraCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export function LiveCameraCapture({ isOpen, onClose, onCapture }: LiveCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [hasError, setHasError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [flash, setFlash] = useState(false)

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Start camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopStream()
    setIsStarting(true)
    setHasError(null)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live camera is not supported on this browser. Use direct camera upload below.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err)
      // If environment camera failed, try user camera
      if (facing === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
          streamRef.current = fallbackStream
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream
            await videoRef.current.play()
          }
          setIsStarting(false)
          return
        } catch {
          // Fallback failed
        }
      }

      setHasError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err.message || 'Unable to access camera.'
      )
    } finally {
      setIsStarting(false)
    }
  }, [stopStream])

  // Lifecycle when open/closed
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null)
      setCapturedBlob(null)
      startCamera(facingMode)
    } else {
      stopStream()
    }
    return () => {
      stopStream()
    }
  }, [isOpen, facingMode, startCamera, stopStream])

  // Flip between front and rear cameras
  const toggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextFacing)
  }

  // Snap the photo from live stream onto canvas in memory
  const takeSnapshot = () => {
    if (!videoRef.current) return

    // Trigger haptic if supported
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40)
      }
    } catch {}

    // Shutter flash animation
    setFlash(true)
    setTimeout(() => setFlash(false), 150)

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // If front camera, flip horizontally for natural selfie reflection
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setCapturedBlob(blob)
        const previewUrl = URL.createObjectURL(blob)
        setCapturedPreview(previewUrl)
        stopStream()
      },
      'image/jpeg',
      0.9
    )
  }

  // Retake photo
  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview)
    }
    setCapturedPreview(null)
    setCapturedBlob(null)
    startCamera(facingMode)
  }

  // Confirm photo and pass File back
  const handleConfirm = () => {
    if (!capturedBlob) return
    const filename = `live_proof_${Date.now()}.jpg`
    const file = new File([capturedBlob], filename, { type: 'image/jpeg' })
    onCapture(file)
    onClose()
  }

  // Native camera fallback (direct capture tag)
  const handleNativeCameraFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCapture(file)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6">
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-card border border-border flex flex-col max-h-[92vh] shadow-2xl">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-background/80 border-b border-border/80 z-20">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <span className="font-serif text-sm font-semibold tracking-wide text-foreground">
              {capturedPreview ? 'Review Proof Photo' : 'Live Proof Camera'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Viewport */}
        <div className="relative flex-1 bg-black min-h-[360px] sm:min-h-[440px] flex items-center justify-center overflow-hidden">
          
          {/* Shutter Flash Animation */}
          {flash && (
            <div className="absolute inset-0 bg-white z-30 pointer-events-none transition-opacity duration-150" />
          )}

          {/* Captured Preview */}
          {capturedPreview ? (
            <img
              src={capturedPreview}
              alt="Proof Snapshot"
              className="w-full h-full object-contain max-h-[65vh]"
            />
          ) : (
            <>
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[65vh] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Viewfinder Overlay Frame */}
              <div className="absolute inset-4 sm:inset-8 border border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between text-[10px] font-mono text-white/70 uppercase tracking-widest">
                  <span>A GAIN · LIVE PROOF</span>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-center text-[10px] font-mono text-white/60 tracking-wider">
                  ✦ DIRECT IN-MEMORY CAPTURE · NOT SAVED TO GALLERY ✦
                </div>
              </div>

              {/* Camera Switch Button */}
              <button
                type="button"
                onClick={toggleCamera}
                disabled={isStarting}
                className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 transition-colors shadow-lg active:scale-95"
                title="Switch Camera (Front/Rear)"
              >
                <RefreshCw className={`h-4 w-4 ${isStarting ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}

          {/* Permission / Hardware Error Overlay */}
          {hasError && !capturedPreview && (
            <div className="absolute inset-0 bg-card/95 p-6 flex flex-col items-center justify-center text-center space-y-4 z-20">
              <AlertCircle className="h-10 w-10 text-cinnabar-500" />
              <div className="space-y-1">
                <p className="font-serif text-base font-semibold text-foreground">Camera Access Required</p>
                <p className="text-xs text-muted-foreground max-w-xs">{hasError}</p>
              </div>

              {/* Native direct camera input fallback */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleNativeCameraFallback}
                />
                <Button type="button" variant="cinnabar" size="sm" asChild>
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    Launch Device Camera Directly
                  </span>
                </Button>
              </label>
            </div>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-background border-t border-border flex items-center justify-around z-20">
          {capturedPreview ? (
            <div className="w-full flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-cinzel text-xs uppercase tracking-wider"
                onClick={handleRetake}
              >
                Retake
              </Button>
              <Button
                type="button"
                variant="cinnabar"
                className="flex-1 font-cinzel text-xs uppercase tracking-wider gap-1.5"
                onClick={handleConfirm}
              >
                <Check className="h-4 w-4" />
                Use This Photo
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between px-4">
              {/* Native Camera Fallback button */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleNativeCameraFallback}
                />
                <span className="text-[11px] font-mono text-muted-foreground hover:text-foreground">
                  Native Camera ↗
                </span>
              </label>

              {/* Big Circular Shutter Button */}
              <button
                type="button"
                onClick={takeSnapshot}
                disabled={isStarting || !!hasError}
                className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-white/80 bg-cinnabar-500 text-white shadow-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="w-12 h-12 rounded-full border-2 border-white/40 bg-cinnabar-600" />
              </button>

              <div className="w-16 text-right">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {facingMode === 'environment' ? 'Rear' : 'Front'}
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
