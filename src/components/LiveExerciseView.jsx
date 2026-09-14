import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Square,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Target,
  Clock,
  Flame,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { usePoseLandmarker } from '../hooks/usePoseLandmarker';
import { calculateShoulderFlexion, AngleSmoother } from '../utils/poseGeometry';
import { ExerciseTracker, MOVEMENT_PHASE } from '../utils/exerciseTracker';
import { MetricCard } from './MetricCard';

export function LiveExerciseView({
  sessionConfig = { armSide: 'right', targetReps: 10 },
  onEndSession,
  onCancel,
}) {
  const { armSide = 'right', targetReps = 10 } = sessionConfig;

  // Exercise tracker & angle smoother instances (persisted across renders)
  const trackerRef = useRef(null);
  const smootherRef = useRef(null);

  // UI state for reactive rendering
  const [metrics, setMetrics] = useState({
    reps: 0,
    targetReps: targetReps,
    currentAngle: 0,
    sessionMaxAngle: 0,
    sessionMinAngle: 0,
    sessionROM: 0,
    phase: MOVEMENT_PHASE.REST,
    feedback: 'Initializing webcam & pose estimation engine...',
    feedbackType: 'info',
    repHistory: [],
    isTargetReached: false,
    progressPercent: 0,
  });

  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Initialize tracker & smoother
  useEffect(() => {
    trackerRef.current = new ExerciseTracker({
      armSide,
      targetReps,
      upThreshold: 85, // elevation threshold
      downThreshold: 38, // resting threshold
    });
    smootherRef.current = new AngleSmoother(0.35);

    return () => {
      trackerRef.current = null;
      smootherRef.current = null;
    };
  }, [armSide, targetReps]);

  // Session elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format MM:SS
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play subtle feedback beep on rep completion
  const playRepBeep = useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }, [isSoundEnabled]);

  // Callback triggered per video frame with detected landmarks
  const handleFrameLandmarks = useCallback(
    (landmarks) => {
      if (!trackerRef.current || !smootherRef.current) return;

      if (!landmarks) {
        const snapshot = trackerRef.current.processFrame(0, false);
        setMetrics((prev) => ({ ...prev, ...snapshot }));
        return;
      }

      const flexion = calculateShoulderFlexion(landmarks, armSide);
      const smoothedAngle = smootherRef.current.update(flexion.angle);
      const prevReps = trackerRef.current.reps;
      const snapshot = trackerRef.current.processFrame(smoothedAngle, flexion.isVisible);

      // Trigger audio cue when a rep is successfully completed
      if (snapshot.reps > prevReps) {
        playRepBeep();
      }

      setMetrics((prev) => ({
        ...prev,
        ...snapshot,
      }));
    },
    [armSide, playRepBeep]
  );

  // Hook into MediaPipe pose landmarker and webcam
  const {
    videoRef,
    canvasRef,
    isLoading,
    loadStep,
    isCameraActive,
    cameraError,
    isTracking,
    startCamera,
    stopCamera,
  } = usePoseLandmarker({
    onFrameLandmarks: handleFrameLandmarks,
    activeArm: armSide,
  });

  // Start camera when ready
  useEffect(() => {
    if (!isLoading && !cameraError && !isCameraActive) {
      startCamera();
    }
  }, [isLoading, cameraError, isCameraActive, startCamera]);

  // Handle session termination and summary bundle creation
  const handleFinish = () => {
    stopCamera();
    const finalSnapshot = trackerRef.current ? trackerRef.current.getSnapshot() : metrics;
    onEndSession({
      armSide,
      targetReps,
      completedReps: finalSnapshot.reps,
      maxROM: finalSnapshot.sessionROM,
      peakAngle: finalSnapshot.sessionMaxAngle,
      minAngle: finalSnapshot.sessionMinAngle,
      durationSeconds: sessionSeconds,
      formattedDuration: formatTime(sessionSeconds),
      repHistory: finalSnapshot.repHistory,
      completedAt: new Date().toLocaleTimeString(),
    });
  };

  const handleReset = () => {
    if (trackerRef.current) {
      trackerRef.current.reset();
      smootherRef.current?.reset();
      setMetrics((prev) => ({
        ...prev,
        ...trackerRef.current.getSnapshot(),
      }));
    }
    setSessionSeconds(0);
  };

  const handleCancelSession = () => {
    stopCamera();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="live-exercise-container">
      {/* Top Session Status Bar */}
      <div className="session-status-bar">
        <div className="session-status-left">
          <div className="active-exercise-pill">
            <Activity size={18} className="pulse-icon" />
            <span>Active: Shoulder Flexion ({armSide === 'right' ? 'Right Arm' : 'Left Arm'})</span>
          </div>

          <div className={`tracking-status-pill ${isTracking ? 'tracking-on' : 'tracking-off'}`}>
            <span className="dot"></span>
            <span>{isTracking ? 'MediaPipe Pose Active' : 'Align Upper Body in Frame'}</span>
          </div>
        </div>

        <div className="session-status-right">
          <div className="timer-badge">
            <Clock size={16} />
            <span>{formatTime(sessionSeconds)}</span>
          </div>

          <button
            className="sound-toggle"
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            title={isSoundEnabled ? 'Mute audio cues' : 'Enable audio cues'}
          >
            {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button className="secondary-button" onClick={handleCancelSession} title="Exit session without saving">
            <X size={16} />
            <span>Cancel</span>
          </button>

          <button className="danger-button-sm" onClick={handleFinish}>
            <Square size={16} />
            <span>End Session</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Video + AI Overlay / Real-time Clinical Gauges */}
      <div className="live-grid">
        {/* Left Side: Video Viewport */}
        <div className="video-viewport-card">
          <div className="video-wrapper">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="webcam-video"
            />
            <canvas ref={canvasRef} className="pose-canvas" />

            {/* Overlaid Target Arm Badge */}
            <div className="overlay-arm-badge">
              Tracking: <strong>{armSide.toUpperCase()} GLENOHUMERAL JOINT</strong>
            </div>

            {/* Live Movement Phase Badge */}
            <div className={`overlay-phase-badge phase--${metrics.phase.toLowerCase()}`}>
              Phase: {metrics.phase}
            </div>

            {/* Camera loading/error overlay states */}
            {isLoading && (
              <div className="video-overlay-state">
                <div className="spinner"></div>
                <h3>Starting Computer Vision</h3>
                <p>{loadStep}</p>
              </div>
            )}

            {cameraError && (
              <div className="video-overlay-state error-state">
                <AlertTriangle size={40} className="text-red-500" />
                <h3>Camera Access Required</h3>
                <p>{cameraError}</p>
                <button className="primary-button-sm" onClick={startCamera}>
                  Retry Camera
                </button>
              </div>
            )}

            {!isLoading && !cameraError && !isTracking && isCameraActive && (
              <div className="body-guide-banner">
                <div className="guide-content">
                  <Activity size={18} />
                  <span>Please step back until your upper body (head to hips) is visible.</span>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Guidance / Feedback Banner */}
          <div className={`feedback-banner feedback--${metrics.feedbackType}`}>
            <div className="feedback-content">
              {metrics.feedbackType === 'success' ? (
                <CheckCircle2 size={20} className="feedback-icon text-emerald-600" />
              ) : (
                <Activity size={20} className="feedback-icon text-cyan-600" />
              )}
              <span className="feedback-text">{metrics.feedback}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Biomechanical Metrics & Rep Counter */}
        <div className="live-metrics-panel">
          {/* Main Angle Gauge Card */}
          <div className="angle-gauge-card">
            <div className="gauge-header">
              <span className="gauge-label">Live Joint Elevation</span>
              <span className="target-pill">Target: &gt; 85°</span>
            </div>

            <div className="gauge-display">
              <div className="gauge-number">
                <span className="big-angle">{metrics.currentAngle}</span>
                <span className="degree-sym">°</span>
              </div>
              <div className="angle-subtext">Trunk-to-Humerus Angle</div>
            </div>

            {/* Visual Angle Progress Bar */}
            <div className="angle-bar-wrapper">
              <div className="angle-bar-track">
                <div
                  className="angle-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, (metrics.currentAngle / 150) * 100))}%`,
                    backgroundColor:
                      metrics.currentAngle >= 85 ? '#0d9488' : '#0284c7',
                  }}
                ></div>
                {/* 85° target marker */}
                <div className="target-marker" style={{ left: `${(85 / 150) * 100}%` }}>
                  <span className="marker-label">85° Target</span>
                </div>
              </div>
              <div className="bar-scales">
                <span>0° (Rest)</span>
                <span>90° (Horizontal)</span>
                <span>150° (Overhead)</span>
              </div>
            </div>
          </div>

          {/* Secondary Metric Cards: Reps & Range of Motion */}
          <div className="side-metrics-grid">
            <MetricCard
              title="Repetitions"
              value={`${metrics.reps} / ${metrics.targetReps}`}
              unit=""
              icon={Target}
              variant="primary"
              subtitle={
                metrics.isTargetReached
                  ? 'Target reached! Feel free to finish.'
                  : `${metrics.targetReps - metrics.reps} reps remaining`
              }
            />

            <MetricCard
              title="Session ROM"
              value={`${metrics.sessionROM}°`}
              unit=""
              icon={Flame}
              variant="accent"
              subtitle={`Min: ${metrics.sessionMinAngle}° | Peak: ${metrics.sessionMaxAngle}°`}
            />
          </div>

          {/* Target Progress Bar */}
          <div className="target-progress-card">
            <div className="progress-label-row">
              <span>Goal Progress</span>
              <strong>{metrics.progressPercent}%</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${metrics.progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="live-actions">
            <button className="secondary-button" onClick={handleReset}>
              <RotateCcw size={16} />
              <span>Reset Reps</span>
            </button>
            <button className="primary-button-large full-width" onClick={handleFinish}>
              <span>Complete & View Summary</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
