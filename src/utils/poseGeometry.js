/**
 * Pose Landmark Indices (MediaPipe Pose Landmark Model)
 */
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

/**
 * Calculates the angle (in degrees) at vertex point B formed by vectors BA and BC.
 *
 * @param {Object} a - Point A {x, y, z?}
 * @param {Object} b - Vertex point B {x, y, z?}
 * @param {Object} c - Point C {x, y, z?}
 * @returns {number} Angle in degrees [0, 180]
 */
export function calculateAngle(a, b, c) {
  if (!a || !b || !c) return 0;

  // Vector BA
  const v1 = {
    x: a.x - b.x,
    y: a.y - b.y,
  };

  // Vector BC
  const v2 = {
    x: c.x - b.x,
    y: c.y - b.y,
  };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  let cosine = dot / (mag1 * mag2);
  // Clamp between -1 and 1 to handle floating point errors
  cosine = Math.max(-1, Math.min(1, cosine));

  const radians = Math.acos(cosine);
  return Math.round((radians * 180) / Math.PI);
}

/**
 * Computes the shoulder flexion angle for the given side (right or left).
 * Trunk reference: Hip -> Shoulder. Arm segment: Shoulder -> Elbow.
 *
 * @param {Array} landmarks - 33 normalized landmarks from MediaPipe
 * @param {'right' | 'left'} armSide - Target arm to track
 * @returns {{ angle: number, isVisible: boolean, confidence: number, points: Object }}
 */
export function calculateShoulderFlexion(landmarks, armSide = 'right') {
  if (!landmarks || landmarks.length < 25) {
    return { angle: 0, isVisible: false, confidence: 0, points: null };
  }

  const isRight = armSide === 'right';
  const hipIndex = isRight ? POSE_LANDMARKS.RIGHT_HIP : POSE_LANDMARKS.LEFT_HIP;
  const shoulderIndex = isRight ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;
  const elbowIndex = isRight ? POSE_LANDMARKS.RIGHT_ELBOW : POSE_LANDMARKS.LEFT_ELBOW;
  const wristIndex = isRight ? POSE_LANDMARKS.RIGHT_WRIST : POSE_LANDMARKS.LEFT_WRIST;

  const hip = landmarks[hipIndex];
  const shoulder = landmarks[shoulderIndex];
  const elbow = landmarks[elbowIndex];
  const wrist = landmarks[wristIndex];

  if (!hip || !shoulder || !elbow) {
    return { angle: 0, isVisible: false, confidence: 0, points: null };
  }

  // Check visibility/presence score (default to 1 if not provided by model)
  const hipVis = hip.visibility ?? hip.presence ?? 1;
  const shoulderVis = shoulder.visibility ?? shoulder.presence ?? 1;
  const elbowVis = elbow.visibility ?? elbow.presence ?? 1;

  const avgConfidence = (hipVis + shoulderVis + elbowVis) / 3;
  const isVisible = avgConfidence > 0.4;

  const rawAngle = calculateAngle(hip, shoulder, elbow);

  return {
    angle: rawAngle,
    isVisible,
    confidence: Math.round(avgConfidence * 100),
    points: {
      hip,
      shoulder,
      elbow,
      wrist,
    },
  };
}

/**
 * Exponential Moving Average filter to smooth landmark jitter while maintaining responsiveness
 */
export class AngleSmoother {
  constructor(alpha = 0.35) {
    this.alpha = alpha; // smoothing factor (0 = infinitely smooth, 1 = raw value)
    this.smoothedValue = null;
  }

  update(newValue) {
    if (this.smoothedValue === null) {
      this.smoothedValue = newValue;
      return Math.round(newValue);
    }
    this.smoothedValue = this.alpha * newValue + (1 - this.alpha) * this.smoothedValue;
    return Math.round(this.smoothedValue);
  }

  reset() {
    this.smoothedValue = null;
  }
}

/**
 * Pose connections for rendering the upper body & tracking skeleton
 */
export const SKELETON_CONNECTIONS = [
  // Shoulders & Chest
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  // Left Arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  // Right Arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  // Legs (upper)
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
];
