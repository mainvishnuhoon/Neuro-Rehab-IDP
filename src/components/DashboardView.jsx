import { Play, Calendar, Target, Award, Clock, ArrowRight, Activity, CheckCircle2 } from 'lucide-react';
import { MetricCard } from './MetricCard';

export function DashboardView({ onStartExercise, lastSession }) {
  return (
    <div className="dashboard-container">
      {/* Patient Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-tag">Post-Stroke Rehabilitation Protocol · Phase 2</div>
          <h1 className="welcome-title">Welcome back, Alex</h1>
          <p className="welcome-desc">
            Your prescribed recovery plan focuses on restoring active range of motion in the right shoulder joint.
          </p>
        </div>
        <button className="primary-button-large" onClick={onStartExercise}>
          <Play size={20} fill="currentColor" />
          <span>Start Today's Exercise</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Overview Metric Row */}
      <div className="metrics-grid">
        <MetricCard
          title="Today's Target"
          value="10"
          unit="reps"
          icon={Target}
          variant="primary"
          subtitle="Shoulder Flexion protocol"
        />
        <MetricCard
          title="Last Recorded ROM"
          value={lastSession ? `${lastSession.maxROM}°` : '92°'}
          unit=""
          icon={Activity}
          variant="accent"
          subtitle={lastSession ? 'Achieved in recent session' : 'Baseline measured 2 days ago'}
        />
        <MetricCard
          title="Weekly Adherence"
          value="4 / 5"
          unit="days"
          icon={Calendar}
          variant="success"
          subtitle="80% prescribed compliance"
        />
        <MetricCard
          title="Rehab Milestone"
          value="Level 2"
          unit=""
          icon={Award}
          variant="default"
          subtitle="Active-assisted elevation"
        />
      </div>

      {/* Today's Prescribed Routine Card */}
      <div className="routine-card">
        <div className="routine-header">
          <div className="routine-badge">Assigned Session</div>
          <span className="routine-time">
            <Clock size={16} /> ~5-8 minutes
          </span>
        </div>

        <div className="routine-content">
          <div className="routine-info">
            <h2 className="routine-title">Active Shoulder Flexion (Elevation)</h2>
            <p className="routine-instruction">
              Focus on raising the arm in the sagittal/frontal plane smoothly. Real-time MediaPipe computer vision will track joint angles, measure Range of Motion (ROM), and log repetitions automatically.
            </p>

            <div className="routine-specs">
              <div className="spec-item">
                <span className="spec-label">Target Joint:</span>
                <span className="spec-value">Glenohumeral / Shoulder</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Target Elevation:</span>
                <span className="spec-value">90° - 120°</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Prescription:</span>
                <span className="spec-value">1 Set × 10 Repetitions</span>
              </div>
            </div>
          </div>

          <div className="routine-action-panel">
            <div className="routine-ready-box">
              <CheckCircle2 size={24} className="text-teal-600" />
              <div>
                <strong>Webcam AI Ready</strong>
                <p>No wearable sensors needed</p>
              </div>
            </div>
            <button className="cta-button" onClick={onStartExercise}>
              <Play size={18} fill="currentColor" />
              Begin Routine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
