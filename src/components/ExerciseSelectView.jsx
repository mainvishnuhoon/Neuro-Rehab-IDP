import { useState } from 'react';
import { ArrowLeft, Play, Camera, Check, Info, ShieldAlert } from 'lucide-react';

export function ExerciseSelectView({ onStartSession, onBack }) {
  const [selectedArm, setSelectedArm] = useState('right');
  const [targetReps, setTargetReps] = useState(10);

  return (
    <div className="exercise-select-container">
      {/* Back button */}
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={18} />
        <span>Back to Dashboard</span>
      </button>

      <div className="select-grid">
        {/* Main Exercise Card */}
        <div className="exercise-briefing-card">
          <div className="briefing-tag">Prescribed Protocol</div>
          <h1 className="briefing-title">Shoulder Flexion & Elevation</h1>
          <p className="briefing-desc">
            Shoulder flexion measures your ability to lift your arm upwards in front of your body. Tracking this angle is crucial for evaluating motor control, active range of motion (ROM), and joint recovery progress.
          </p>

          <div className="instructions-section">
            <h3 className="section-subtitle">
              <Info size={18} className="text-teal-600" />
              How to perform this exercise correctly
            </h3>
            <ol className="instruction-steps">
              <li>
                <strong>Starting Position:</strong> Sit upright or stand in a comfortable position facing the webcam. Rest your arm down naturally beside your hip.
              </li>
              <li>
                <strong>Smooth Elevation:</strong> Slowly raise your arm forward and upward toward horizontal or higher (target: 85°–120°), keeping your elbow straight.
              </li>
              <li>
                <strong>Controlled Return:</strong> Lower your arm smoothly back to your side to complete each repetition.
              </li>
            </ol>
          </div>

          <div className="config-row">
            {/* Arm Selector */}
            <div className="config-group">
              <label className="config-label">Active Arm Side</label>
              <div className="toggle-button-group">
                <button
                  className={`toggle-btn ${selectedArm === 'right' ? 'active' : ''}`}
                  onClick={() => setSelectedArm('right')}
                >
                  Right Arm
                </button>
                <button
                  className={`toggle-btn ${selectedArm === 'left' ? 'active' : ''}`}
                  onClick={() => setSelectedArm('left')}
                >
                  Left Arm
                </button>
              </div>
            </div>

            {/* Target Repetitions */}
            <div className="config-group">
              <label className="config-label">Target Repetitions</label>
              <div className="rep-selector">
                {[5, 10, 15].map((count) => (
                  <button
                    key={count}
                    className={`rep-pill ${targetReps === count ? 'active' : ''}`}
                    onClick={() => setTargetReps(count)}
                  >
                    {count} reps
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Pre-flight Checklist & Start CTA */}
        <div className="preflight-sidebar">
          <div className="preflight-card">
            <h3 className="preflight-title">
              <Camera size={20} className="text-teal-600" />
              Webcam AI Setup
            </h3>

            <ul className="checklist">
              <li className="checklist-item">
                <Check size={16} className="checklist-icon" />
                <span>Situate yourself ~1.5 to 2 meters from camera</span>
              </li>
              <li className="checklist-item">
                <Check size={16} className="checklist-icon" />
                <span>Ensure good lighting so your upper body is clear</span>
              </li>
              <li className="checklist-item">
                <Check size={16} className="checklist-icon" />
                <span>Keep your shoulder, elbow, and hip in frame</span>
              </li>
              <li className="checklist-item">
                <Check size={16} className="checklist-icon" />
                <span>Real-time MediaPipe pose skeleton active</span>
              </li>
            </ul>

            <div className="safety-note">
              <ShieldAlert size={16} />
              <span>Stop immediately if you experience sharp joint pain or discomfort.</span>
            </div>

            <button
              className="primary-button-large full-width"
              onClick={() => onStartSession({ armSide: selectedArm, targetReps })}
            >
              <Play size={20} fill="currentColor" />
              <span>Start Session Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
