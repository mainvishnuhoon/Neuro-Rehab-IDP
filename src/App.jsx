import { useState } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ExerciseSelectView } from './components/ExerciseSelectView';
import { LiveExerciseView } from './components/LiveExerciseView';
import { SessionSummaryView } from './components/SessionSummaryView';
import './App.css';

function App() {
  // Navigation State: 'dashboard' | 'select' | 'live' | 'summary'
  const [currentView, setCurrentView] = useState('dashboard');

  // Exercise configuration for current session
  const [sessionConfig, setSessionConfig] = useState({
    armSide: 'right',
    targetReps: 10,
  });

  // Recorded summary of the most recently finished session
  const [lastSessionData, setLastSessionData] = useState(null);

  // Navigation handlers
  const handleGoToSelect = () => {
    setCurrentView('select');
  };

  const handleStartLiveSession = (config) => {
    if (config) {
      setSessionConfig(config);
    }
    setCurrentView('live');
  };

  const handleEndLiveSession = (summary) => {
    setLastSessionData(summary);
    setCurrentView('summary');
  };

  const handleReturnToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleRepeatExercise = () => {
    setCurrentView('live');
  };

  return (
    <div className="neurorehab-app">
      <Header
        currentView={currentView}
        onNavigateHome={handleReturnToDashboard}
      />

      <main className="app-main-content">
        {currentView === 'dashboard' && (
          <DashboardView
            onStartExercise={handleGoToSelect}
            lastSession={lastSessionData}
          />
        )}

        {currentView === 'select' && (
          <ExerciseSelectView
            onStartSession={handleStartLiveSession}
            onBack={handleReturnToDashboard}
          />
        )}

        {currentView === 'live' && (
          <LiveExerciseView
            sessionConfig={sessionConfig}
            onEndSession={handleEndLiveSession}
            onCancel={handleReturnToDashboard}
          />
        )}

        {currentView === 'summary' && (
          <SessionSummaryView
            sessionData={lastSessionData}
            onReturnHome={handleReturnToDashboard}
            onRepeatExercise={handleRepeatExercise}
          />
        )}
      </main>
    </div>
  );
}

export default App;
