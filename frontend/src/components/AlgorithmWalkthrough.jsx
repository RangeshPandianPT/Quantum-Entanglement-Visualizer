import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export default function AlgorithmWalkthrough({ onCircuitResult, disabled }) {
  const [algorithms, setAlgorithms] = useState([])
  const [activeAlgo, setActiveAlgo] = useState(null)
  const [stepIndex, setStepIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/api/algorithms`)
      .then(res => setAlgorithms(res.data.algorithms))
      .catch(err => {
        console.error("Failed to load algorithms", err)
        setError("Failed to load algorithms from backend.")
      })
  }, [])

  // Auto-play effect
  useEffect(() => {
    let timer = null
    if (isPlaying && activeAlgo && !loading) {
      if (stepIndex < activeAlgo.gates.length - 1) {
        timer = setTimeout(() => {
          handleStep(stepIndex + 1)
        }, 2500) // 2.5 seconds per step
      } else {
        setIsPlaying(false) // Reached the end
      }
    }
    return () => clearInterval(timer)
  }, [isPlaying, stepIndex, activeAlgo, loading, handleStep])

  const handleSelectAlgo = (algo) => {
    setActiveAlgo(algo)
    setStepIndex(-1)
    setIsPlaying(false)
    setError(null)
  }

  const handleStep = useCallback(async (idx) => {
    if (!activeAlgo || idx < 0 || idx >= activeAlgo.gates.length) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API_BASE}/api/circuit/step`, {
        num_qubits: activeAlgo.num_qubits,
        gates: activeAlgo.gates,
        step: idx
      })
      setStepIndex(idx)
      
      // Override the name so the visualization panel shows the algorithm step
      res.data.name = `${activeAlgo.name} (Step ${idx + 1})`
      onCircuitResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to execute algorithm step')
      setIsPlaying(false)
    } finally {
      setLoading(false)
    }
  }, [activeAlgo, onCircuitResult])

  const handlePlayPause = () => {
    if (stepIndex >= activeAlgo.gates.length - 1) {
      // If at end, reset and play
      setStepIndex(-1)
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  if (algorithms.length === 0) return null

  return (
    <section className={`algorithm-walkthrough ${disabled ? 'disabled-section' : ''}`}>
      <div className="algo-header">
        <h2>📚 Famous Algorithms Walkthrough</h2>
        <p>Interactive, step-by-step tours of fundamental quantum algorithms!</p>
      </div>

      {error && <div className="circuit-error">⚠ {error}</div>}

      <div className="algo-grid">
        {algorithms.map(algo => (
          <button
            key={algo.id}
            className={`algo-card ${activeAlgo?.id === algo.id ? 'active' : ''}`}
            onClick={() => handleSelectAlgo(algo)}
            disabled={disabled}
          >
            <h3>{algo.name}</h3>
            <span className="algo-qubit-badge">{algo.num_qubits} Qubits</span>
          </button>
        ))}
      </div>

      {activeAlgo && (
        <div className="algo-player panel-box">
          <div className="algo-player-header">
            <h3>{activeAlgo.name}</h3>
            <p className="algo-desc">{activeAlgo.description}</p>
          </div>

          <div className="algo-circuit-viz">
            {Array.from({ length: activeAlgo.num_qubits }).map((_, r) => (
              <div key={r} className="algo-wire-row">
                <span className="qubit-label">q<sub>{r}</sub></span>
                <div className="algo-wire">
                  {activeAlgo.gates.map((g, c) => {
                    const isActive = c === stepIndex
                    const isPassed = c <= stepIndex
                    const interacts = g.targets.includes(r) || g.controls.includes(r)
                    
                    if (!interacts) return <div key={c} className={`algo-slot ${isPassed ? 'passed' : ''}`} />
                    
                    const isControl = g.controls.includes(r)
                    return (
                      <div key={c} className={`algo-slot gate-present ${isActive ? 'active-step' : ''} ${isPassed ? 'passed-step' : ''}`}>
                        <div className={`algo-gate ${g.gate} ${isControl ? 'ctrl' : 'tgt'}`}>
                          {isControl ? '●' : g.gate.toUpperCase()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="algo-explanation">
            <div className="explanation-bubble">
              {stepIndex >= 0 ? (
                <>
                  <span className="step-badge">Step {stepIndex + 1}/{activeAlgo.gates.length}</span>
                  <strong>{activeAlgo.gates[stepIndex].gate.toUpperCase()} Gate:</strong> {activeAlgo.steps[stepIndex]}
                </>
              ) : (
                <>
                  <span className="step-badge">Start</span>
                  Click <strong>Play</strong> or <strong>Next</strong> to start exploring exactly how {activeAlgo.name} manipulates amplitudes and phases!
                </>
              )}
            </div>
          </div>

          <div className="algo-controls">
            <button className="ctrl-btn clear" onClick={() => setStepIndex(-1)} disabled={loading || stepIndex < 0}>
              ⏮ Reset
            </button>
            <button className="ctrl-btn step" onClick={() => handleStep(stepIndex - 1)} disabled={loading || stepIndex <= 0}>
              ◀ Prev
            </button>
            <button className={`ctrl-btn run ${isPlaying ? 'playing' : ''}`} onClick={handlePlayPause} disabled={loading}>
              {isPlaying ? '⏸ Pause' : (stepIndex < 0 ? '▶ Play Tour' : '▶ Resume')}
            </button>
            <button className="ctrl-btn step" onClick={() => handleStep(stepIndex + 1)} disabled={loading || stepIndex >= activeAlgo.gates.length - 1}>
              Next ▶
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
