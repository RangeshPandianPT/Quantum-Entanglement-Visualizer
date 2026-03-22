import React from 'react';

export default function ChallengesModal({
  isOpen,
  onClose,
  puzzles,
  dailyChallenge,
  earnedBadges,
  onSelectPuzzle
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content challenges-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>🎮 Quantum Challenges</h2>
          <p>Solve puzzles and earn achievement badges!</p>
        </div>

        <div className="modal-body">
          {/* Daily Challenge Banner */}
          {dailyChallenge && (
            <div className="daily-challenge-banner">
              <div className="banner-icon">⭐</div>
              <div className="banner-text">
                <h3>Daily Challenge: {dailyChallenge.title}</h3>
                <p>{dailyChallenge.description}</p>
                <div className="constraint-badge">Max {dailyChallenge.max_gates} gates</div>
              </div>
              <button 
                className="challenge-play-btn"
                onClick={() => onSelectPuzzle(dailyChallenge)}
              >
                Play Now
              </button>
            </div>
          )}

          {/* Badges Section */}
          <div className="badges-section">
            <h3>Your Achievements ({earnedBadges.length}/{puzzles.length})</h3>
            <div className="badges-grid">
              {puzzles.map(p => {
                const isEarned = earnedBadges.includes(p.badge);
                return (
                  <div key={p.id} className={`badge-card ${isEarned ? 'earned' : 'locked'}`}>
                    <div className="badge-icon">{isEarned ? '🏆' : '🔒'}</div>
                    <div className="badge-name">{p.badge}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Puzzle List */}
          <div className="puzzle-list-section">
            <h3>All Puzzles</h3>
            <div className="puzzles-grid">
              {puzzles.map(p => (
                <div key={p.id} className="puzzle-item">
                  <div className="puzzle-info">
                    <h4>{p.title}</h4>
                    <span className="qubit-badge">{p.expected_qubits} qubits</span>
                    <span className="gate-badge">Max {p.max_gates} gates</span>
                  </div>
                  <button 
                    className="select-puzzle-btn"
                    onClick={() => onSelectPuzzle(p)}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
