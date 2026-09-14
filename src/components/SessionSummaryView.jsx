import {
  CheckCircle,
  Award,
  Clock,
  Flame,
  ArrowRight,
  RotateCcw,
  TrendingUp,
  Activity,
  FileText,
} from 'lucide-react';
import { MetricCard } from './MetricCard';

export function SessionSummaryView({ sessionData, onReturnHome, onRepeatExercise }) {
  const {
    armSide = 'right',
    targetReps = 10,
    completedReps = 0,
    maxROM = 0,
    peakAngle = 0,
    minAngle = 0,
    formattedDuration = '00:00',
    repHistory = [],
    completedAt = '',
  } = sessionData || {};

  const isTargetAchieved = completedReps >= targetReps;
  const adherenceRate = Math.min(100, Math.round((completedReps / targetReps) * 100));

  // Compute average peak elevation
  const avgPeak =
    repHistory.length > 0
      ? Math.round(repHistory.reduce((acc, curr) => acc + curr.peakAngle, 0) / repHistory.length)
      : peakAngle;

  return (
    <div className="summary-container">
      {/* Celebration Header */}
      <div className="summary-hero-card">
        <div className="summary-icon-circle">
          <CheckCircle size={48} className="text-teal-600" />
        </div>
        <div className="summary-hero-content">
          <div className="summary-badge">Session Concluded · {completedAt}</div>
          <h1 className="summary-title">Exercise Session Completed</h1>
          <p className="summary-desc">
            Excellent work! Your movement kinematics and shoulder range of motion have been processed and logged to your rehabilitation profile.
          </p>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="summary-metrics-grid">
        <MetricCard
          title="Total Repetitions"
          value={`${completedReps} / ${targetReps}`}
          unit=""
          icon={Award}
          variant={isTargetAchieved ? 'success' : 'primary'}
          subtitle={`${adherenceRate}% of prescribed target achieved`}
        />

        <MetricCard
          title="Maximum Range of Motion"
          value={`${maxROM}°`}
          unit=""
          icon={Flame}
          variant="accent"
          subtitle={`Peak: ${peakAngle}° | Baseline: ${minAngle}°`}
        />

        <MetricCard
          title="Average Peak Elevation"
          value={`${avgPeak}°`}
          unit=""
          icon={TrendingUp}
          variant="primary"
          subtitle="Mean height across all repetitions"
        />

        <MetricCard
          title="Session Duration"
          value={formattedDuration}
          unit=""
          icon={Clock}
          variant="default"
          subtitle={`Tracked on ${armSide === 'right' ? 'Right' : 'Left'} arm`}
        />
      </div>

      {/* Repetition Breakdown Table */}
      <div className="rep-breakdown-card">
        <div className="card-header-row">
          <div className="header-title-group">
            <FileText size={18} className="text-teal-600" />
            <h3 className="card-title">Repetition Kinematics Log</h3>
          </div>
          <span className="rep-count-tag">{repHistory.length} reps analyzed</span>
        </div>

        {repHistory.length > 0 ? (
          <div className="table-responsive">
            <table className="kinematics-table">
              <thead>
                <tr>
                  <th>Repetition</th>
                  <th>Peak Angle</th>
                  <th>Baseline Angle</th>
                  <th>Calculated ROM</th>
                  <th>Duration</th>
                  <th>Clinical Status</th>
                </tr>
              </thead>
              <tbody>
                {repHistory.map((rep) => {
                  const meetsStandard = rep.peakAngle >= 85;
                  return (
                    <tr key={rep.repNumber}>
                      <td>
                        <strong>Rep #{rep.repNumber}</strong>
                      </td>
                      <td>
                        <span className="data-highlight">{rep.peakAngle}°</span>
                      </td>
                      <td>{rep.minAngle}°</td>
                      <td>
                        <span className="rom-badge">{rep.rom}°</span>
                      </td>
                      <td>{rep.durationSec}s</td>
                      <td>
                        <span
                          className={`status-pill ${
                            meetsStandard ? 'pill-success' : 'pill-warning'
                          }`}
                        >
                          {meetsStandard ? 'Full Elevation' : 'Partial Elevation'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-reps-note">
            <Activity size={24} />
            <p>No full repetitions were completed during this session.</p>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="summary-actions">
        <button className="secondary-button-large" onClick={onRepeatExercise}>
          <RotateCcw size={18} />
          <span>Repeat Exercise</span>
        </button>

        <button className="primary-button-large" onClick={onReturnHome}>
          <span>Return to Dashboard</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
