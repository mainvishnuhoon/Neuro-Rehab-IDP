/**
 * Exercise State Machine & Session Metrics Tracker
 * Specifically designed for clinical rehabilitation evaluation (Shoulder Flexion).
 */

export const MOVEMENT_PHASE = {
  REST: 'REST',           // Arm down at starting position
  RAISING: 'RAISING',     // Arm moving upward
  PEAK: 'PEAK',           // Arm reached target height / peak angle
  LOWERING: 'LOWERING',   // Arm returning to resting position
};

export class ExerciseTracker {
  constructor(options = {}) {
    this.targetReps = options.targetReps || 10;
    this.armSide = options.armSide || 'right';

    // Biomechanical thresholds (in degrees)
    this.DOWN_THRESHOLD = options.downThreshold || 38; // Arm at rest near torso
    this.UP_THRESHOLD = options.upThreshold || 85;     // Threshold to count as valid upward elevation

    // State machine
    this.phase = MOVEMENT_PHASE.REST;
    this.hasCrossedPeak = false;
    this.currentRepPeak = 0;
    this.currentRepMin = 180;

    // Session metrics
    this.reps = 0;
    this.currentAngle = 0;
    this.sessionMaxAngle = 0;
    this.sessionMinAngle = 180;
    this.repHistory = [];
    this.feedback = 'Position yourself in frame and raise your arm slowly.';
    this.feedbackType = 'neutral'; // 'neutral' | 'success' | 'warning' | 'info'

    this.startTime = Date.now();
    this.repStartTime = Date.now();
  }

  /**
   * Processes a new frame angle and updates the state machine & metrics.
   * @param {number} angle - Smoothed shoulder angle in degrees
   * @param {boolean} isVisible - Landmark tracking confidence/visibility
   * @returns {Object} Current snapshot of tracker metrics
   */
  processFrame(angle, isVisible) {
    if (!isVisible) {
      this.feedback = 'Keep your arm and torso visible in the camera view.';
      this.feedbackType = 'warning';
      return this.getSnapshot();
    }

    this.currentAngle = angle;

    // Track overall session min & max
    if (angle > this.sessionMaxAngle) {
      this.sessionMaxAngle = angle;
    }
    if (angle < this.sessionMinAngle) {
      this.sessionMinAngle = angle;
    }

    if (this.reps >= this.targetReps) {
      this.phase = MOVEMENT_PHASE.REST;
      this.hasCrossedPeak = false;
      this.feedback = `Target reached (${this.targetReps}/${this.targetReps})! Session complete.`;
      this.feedbackType = 'success';
      return this.getSnapshot();
    }

    // State Machine Transitions
    switch (this.phase) {
      case MOVEMENT_PHASE.REST:
        if (angle > this.DOWN_THRESHOLD + 5) {
          this.phase = MOVEMENT_PHASE.RAISING;
          this.hasCrossedPeak = false;
          this.currentRepPeak = angle;
          this.currentRepMin = angle;
          this.repStartTime = Date.now();
          this.feedback = 'Lifting... Keep going upwards smoothly.';
          this.feedbackType = 'info';
        } else {
          this.feedback = 'Ready. Lift your arm forward and upward.';
          this.feedbackType = 'neutral';
        }
        break;

      case MOVEMENT_PHASE.RAISING:
        if (angle > this.currentRepPeak) {
          this.currentRepPeak = angle;
        }

        if (angle >= this.UP_THRESHOLD) {
          this.phase = MOVEMENT_PHASE.PEAK;
          this.hasCrossedPeak = true;
          this.feedback = `Great height (${angle}°)! Now lower arm with control.`;
          this.feedbackType = 'success';
        } else if (angle < this.DOWN_THRESHOLD) {
          // Incomplete rep: lowered back before reaching target
          this.phase = MOVEMENT_PHASE.REST;
          this.feedback = 'Try to lift higher towards shoulder/eye level.';
          this.feedbackType = 'warning';
        }
        break;

      case MOVEMENT_PHASE.PEAK:
        if (angle > this.currentRepPeak) {
          this.currentRepPeak = angle;
        }

        // Detect descent
        if (angle < this.currentRepPeak - 8) {
          this.phase = MOVEMENT_PHASE.LOWERING;
          this.feedback = 'Lowering... Return slowly to resting position.';
          this.feedbackType = 'info';
        }
        break;

      case MOVEMENT_PHASE.LOWERING:
        if (angle < this.currentRepMin) {
          this.currentRepMin = angle;
        }

        // Successfully returned to rest after reaching peak
        if (angle <= this.DOWN_THRESHOLD) {
          if (this.hasCrossedPeak && this.reps < this.targetReps) {
            this.reps += 1;
            const repDuration = ((Date.now() - this.repStartTime) / 1000).toFixed(1);
            this.repHistory.push({
              repNumber: this.reps,
              peakAngle: this.currentRepPeak,
              minAngle: this.currentRepMin,
              rom: Math.max(0, this.currentRepPeak - this.currentRepMin),
              durationSec: repDuration,
            });

            if (this.reps >= this.targetReps) {
              this.feedback = `Target reached (${this.reps}/${this.targetReps})! Session complete.`;
              this.feedbackType = 'success';
            } else {
              this.feedback = `Rep ${this.reps} completed! (${this.currentRepPeak}° peak ROM)`;
              this.feedbackType = 'success';
            }
          }

          this.phase = MOVEMENT_PHASE.REST;
          this.hasCrossedPeak = false;
        }
        break;

      default:
        this.phase = MOVEMENT_PHASE.REST;
    }

    return this.getSnapshot();
  }

  /**
   * Returns current session stats
   */
  getSnapshot() {
    const rawROM = this.sessionMaxAngle - (this.sessionMinAngle === 180 ? 0 : this.sessionMinAngle);
    const sessionROM = Math.max(0, rawROM);

    return {
      reps: this.reps,
      targetReps: this.targetReps,
      currentAngle: this.currentAngle,
      sessionMaxAngle: this.sessionMaxAngle,
      sessionMinAngle: this.sessionMinAngle === 180 ? 0 : this.sessionMinAngle,
      sessionROM: sessionROM,
      phase: this.phase,
      feedback: this.feedback,
      feedbackType: this.feedbackType,
      repHistory: [...this.repHistory],
      isTargetReached: this.reps >= this.targetReps,
      progressPercent: Math.min(100, Math.round((this.reps / this.targetReps) * 100)),
    };
  }

  reset() {
    this.phase = MOVEMENT_PHASE.REST;
    this.hasCrossedPeak = false;
    this.currentRepPeak = 0;
    this.currentRepMin = 180;
    this.reps = 0;
    this.sessionMaxAngle = 0;
    this.sessionMinAngle = 180;
    this.repHistory = [];
    this.feedback = 'Ready. Lift your arm slowly.';
    this.feedbackType = 'neutral';
    this.startTime = Date.now();
  }
}
