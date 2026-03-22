import { useMemo } from 'react'

/* ─────────────────────────────────────────────────────────
   MeasurementResult
   Animated modal that reveals the collapsed wavefunction result.
   Props:
     result  – { measured_state: "01", all_probabilities: {...}, ... } | null
     onClose – callback to dismiss
   Note: visibility is driven purely by whether `result` is truthy.
   The parent (CircuitBuilder) sets result → null via onClose,
   which unmounts this modal cleanly.
───────────────────────────────────────────────────────── */
export default function MeasurementResult({ result, onClose }) {
  // Generate particles deterministically (no randomness = no state needed)
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      angle: (i / 18) * 360,
      dist: 60 + (i * 7) % 60,
      duration: 0.6 + (i * 0.03),
      color: ['#4f8ef7', '#3ecf8e', '#f5a623', '#ef4949', '#9f6ef5'][i % 5],
    }))
  , [])

  if (!result) return null

  const bits  = result.measured_state
  const nQ    = bits.length
  const probs = result.all_probabilities || {}

  return (
    <div className="measure-overlay visible" onClick={onClose}>
      {/* Burst particles */}
      <div className="measure-burst">
        {particles.map(p => (
          <div
            key={p.id}
            className="burst-particle"
            style={{
              '--angle':    `${p.angle}deg`,
              '--dist':     `${p.dist}px`,
              '--duration': `${p.duration}s`,
              '--color':    p.color,
            }}
          />
        ))}
      </div>

      {/* Modal card */}
      <div className="measure-card visible" onClick={e => e.stopPropagation()}>
        <div className="measure-icon">🎯</div>
        <h2 className="measure-title">Wavefunction Collapsed!</h2>

        {/* Big ket notation */}
        <div className="measure-state-display">
          <span className="measure-ket-open">|</span>
          {bits.split('').map((bit, i) => (
            <span
              key={i}
              className={`measure-bit ${bit === '1' ? 'one' : 'zero'}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {bit}
            </span>
          ))}
          <span className="measure-ket-close">⟩</span>
        </div>

        <p className="measure-subtitle">
          Qubit{nQ > 1 ? 's' : ''} measured in classical state{' '}
          <strong>|{bits}⟩</strong>
        </p>

        {/* Probability bar chart */}
        <div className="measure-probs">
          <p className="measure-probs-title">Original superposition probabilities</p>
          {Object.entries(probs)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([state, prob]) => (
              <div key={state} className="measure-prob-row">
                <span className={`prob-state-label ${state === bits ? 'measured' : ''}`}>
                  |{state}⟩{state === bits ? ' ← selected' : ''}
                </span>
                <div className="prob-bar-track">
                  <div
                    className={`prob-bar-fill ${state === bits ? 'measured' : ''}`}
                    style={{ width: `${(prob * 100).toFixed(1)}%` }}
                  />
                </div>
                <span className="prob-value">{(prob * 100).toFixed(1)}%</span>
              </div>
            ))}
        </div>

        <p className="measure-dismiss-hint">
          The quantum state has <em>collapsed</em> — all superposition is gone.
          Click anywhere to close.
        </p>
        <button className="measure-close-btn" onClick={onClose}>OK, Got it!</button>
      </div>
    </div>
  )
}
