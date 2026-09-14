import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { SKELETON_CONNECTIONS, POSE_LANDMARKS } from '../utils/poseGeometry';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

/**
 * Custom hook to initialize MediaPipe PoseLandmarker, handle webcam stream,
 * perform real-time video detection, and render pose overlays on canvas.
 */
export function usePoseLandmarker({ onFrameLandmarks, activeArm = 'right' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const streamRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadStep, setLoadStep] = useState('Initializing AI model...');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  // Initialize MediaPipe PoseLandmarker
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        setIsLoading(true);
        setLoadStep('Loading vision fileset resolver...');

        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        if (isCancelled) return;

        setLoadStep('Loading pose estimation model...');

        let landmarker;
        try {
          // Attempt GPU delegate first for fast real-time inference
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_PATH,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuErr) {
          console.warn('GPU delegate initialization failed, falling back to CPU:', gpuErr);
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_PATH,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        if (isCancelled) {
          landmarker?.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setIsLoading(false);
        setLoadStep('Model ready');
      } catch (err) {
        console.error('Failed to initialize MediaPipe PoseLandmarker:', err);
        if (!isCancelled) {
          setCameraError(`Failed to load pose model: ${err.message || err}`);
          setIsLoading(false);
        }
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Initialize and start webcam
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let message = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No webcam device detected on your system.';
      } else {
        message = err.message || message;
      }
      setCameraError(message);
      setIsCameraActive(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTracking(false);
  }, []);

  // Draw skeleton and active target joints on the canvas overlay
  const drawSkeleton = useCallback(
    (ctx, landmarks, width, height) => {
      ctx.clearRect(0, 0, width, height);

      if (!landmarks || landmarks.length === 0) return;

      const isRight = activeArm === 'right';
      const activeShoulder = isRight ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;
      const activeElbow = isRight ? POSE_LANDMARKS.RIGHT_ELBOW : POSE_LANDMARKS.LEFT_ELBOW;
      const activeHip = isRight ? POSE_LANDMARKS.RIGHT_HIP : POSE_LANDMARKS.LEFT_HIP;
      const activeWrist = isRight ? POSE_LANDMARKS.RIGHT_WRIST : POSE_LANDMARKS.LEFT_WRIST;

      // 1. Draw Bones / Connections
      SKELETON_CONNECTIONS.forEach(([i, j]) => {
        const pt1 = landmarks[i];
        const pt2 = landmarks[j];

        if (!pt1 || !pt2) return;
        const vis1 = pt1.visibility ?? pt1.presence ?? 1;
        const vis2 = pt2.visibility ?? pt2.presence ?? 1;
        if (vis1 < 0.4 || vis2 < 0.4) return;

        // Is this segment part of the active arm / trunk tracking unit?
        const isActiveSegment =
          (i === activeShoulder && (j === activeElbow || j === activeHip)) ||
          (j === activeShoulder && (i === activeElbow || i === activeHip)) ||
          (i === activeElbow && j === activeWrist) ||
          (j === activeElbow && i === activeWrist);

        ctx.beginPath();
        ctx.moveTo(pt1.x * width, pt1.y * height);
        ctx.lineTo(pt2.x * width, pt2.y * height);

        if (isActiveSegment) {
          ctx.strokeStyle = '#0284c7'; // Vivid cyan/blue for target limb
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)'; // Muted slate for rest of skeleton
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
        }
        ctx.stroke();
      });

      // 2. Draw Landmarks / Joints
      landmarks.forEach((pt, index) => {
        const vis = pt.visibility ?? pt.presence ?? 1;
        if (vis < 0.4) return;

        // Filter: draw upper body & major lower joints
        if (index > 28 && index !== 0) return;

        const x = pt.x * width;
        const y = pt.y * height;

        const isActiveJoint =
          index === activeShoulder ||
          index === activeElbow ||
          index === activeHip ||
          index === activeWrist;

        ctx.beginPath();
        if (isActiveJoint) {
          // Prominent medical target joint styling
          ctx.arc(x, y, 7, 0, 2 * Math.PI);
          ctx.fillStyle = index === activeShoulder ? '#0284c7' : '#0d9488'; // Accent for shoulder vertex
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Outer halo pulse for target shoulder
          if (index === activeShoulder) {
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else {
          // Standard skeleton joint
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#94a3b8';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      });
    },
    [activeArm]
  );

  // Real-time Detection Loop
  useEffect(() => {
    let lastVideoTime = -1;

    const detect = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (
        video &&
        video.readyState >= 2 &&
        landmarker &&
        canvas &&
        !video.paused &&
        !video.ended
      ) {
        // Ensure canvas dimensions match video display dimensions
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const nowInMs = performance.now();

        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const results = landmarker.detectForVideo(video, nowInMs);
            const ctx = canvas.getContext('2d');

            if (results.landmarks && results.landmarks.length > 0) {
              const currentLandmarks = results.landmarks[0];
              setIsTracking(true);
              drawSkeleton(ctx, currentLandmarks, canvas.width, canvas.height);

              if (onFrameLandmarks) {
                onFrameLandmarks(currentLandmarks);
              }
            } else {
              setIsTracking(false);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              if (onFrameLandmarks) {
                onFrameLandmarks(null);
              }
            }
          } catch (detectionErr) {
            console.warn('Inference error on frame:', detectionErr);
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(detect);
    };

    if (isCameraActive && !isLoading) {
      animationFrameIdRef.current = requestAnimationFrame(detect);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isCameraActive, isLoading, drawSkeleton, onFrameLandmarks]);

  return {
    videoRef,
    canvasRef,
    isLoading,
    loadStep,
    isCameraActive,
    cameraError,
    isTracking,
    startCamera,
    stopCamera,
  };
}
