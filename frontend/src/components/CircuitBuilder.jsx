import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import axios from 'axios'
import MeasurementResult from './MeasurementResult.jsx'

const API_BASE = 'https://quantum-entanglement-visualizer.onrender.com'

/* ── Gate definitions ──────────────────────────────── */
const GATES = [
  { id: 'h',    label: 'H',       type: 'single', color: '#4f8ef7', desc: 'Hadamard — Creates superposition: puts qubit into equal |0⟩ + |1⟩ state' },
  { id: 'x',    label: 'X',       type: 'single', color: '#ef4949', desc: 'Pauli-X — Quantum NOT gate: flips |0⟩ ↔ |1⟩' },
  { id: 'y',    label: 'Y',       type: 'single', color: '#3ecf8e', desc: 'Pauli-Y — Rotates qubit around Y-axis with a phase' },
  { id: 'z',    label: 'Z',       type: 'single', color: '#f5a623', desc: 'Pauli-Z — Adds a phase flip: |1⟩ → −|1⟩' },
  { id: 'cx',   label: 'CNOT',    type: 'two',    color: '#9f6ef5', desc: 'Controlled-NOT — Flips target qubit if control is |1⟩. Creates entanglement!' },
  { id: 'cz',   label: 'CZ',      type: 'two',    color: '#e06ef5', desc: 'Controlled-Z — Adds phase if both qubits are |1⟩' },
  { id: 'swap', label: 'SWAP',    type: 'two',    color: '#6ecff5', desc: 'Swap — Exchanges the states of two qubits' },
  { id: 'ccx',  label: 'Toffoli', type: 'three',  color: '#f56e8e', desc: 'Toffoli (CCX) — Flips target if both controls are |1⟩' },
]

const MAX_SLOTS = 12

const CircuitBuilder = forwardRef(function CircuitBuilder({ onCircuitResult, activePuzzle, onClearPuzzle, onEarnBadge }, ref) {
  const [numQubits, setNumQubits] = useState(2)
  const [circuit, setCircuit]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [stepIndex, setStepIndex] = useState(-1)
  const [stepData, setStepData]   = useState(null)
  const [error, setError]         = useState(null)
  const [dragGate, setDragGate]   = useState(null)
  const [placingGate, setPlacingGate] = useState(null)
  const [measureResult, setMeasureResult] = useState(null)
  const [measuring, setMeasuring] = useState(false)
  const [hintIndex, setHintIndex] = useState(-1)

  useEffect(() => {
    setHintIndex(-1)
    if (activePuzzle && activePuzzle.expected_qubits !== numQubits) {
      setNumQubits(activePuzzle.expected_qubits)
      clearCircuit()
    }
  }, [activePuzzle, numQubits])

  /* ── Expose tour actions via ref ─────────────────── */
  useImperativeHandle(ref, () => ({
    tourAction: (action) => {
      if (action === 'add_h') {
        const col = getNextFreeCol()
        setCircuit(prev => [...prev, {
          gate: 'h', targets: [0], controls: [],
          col, color: '#4f8ef7', label: 'H', type: 'single'
        }])
      } else if (action === 'add_cnot') {
        const col = getNextFreeCol()
        setCircuit(prev => [...prev, {
          gate: 'cx', targets: [1], controls: [0],
          col, color: '#9f6ef5', label: 'CNOT', type: 'two'
        }])
      } else if (action === 'run') {
        runCircuitDirect()
      }
    }
  }))

  const getNextFreeCol = () => {
    const used = new Set(circuit.map(g => g.col))
    for (let c = 0; c < MAX_SLOTS; c++) { if (!used.has(c)) return c }
    return circuit.length
  }

  /* ── Drag handlers ───────────────────────────────── */
  const handleDragStart = (e, gate) => {
    setDragGate(gate)
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', gate.id)
  }

  const handleDrop = useCallback((e, qubit, col) => {
    e.preventDefault()
    e.stopPropagation()
    const gateId = e.dataTransfer.getData('text/plain')
    const gate = GATES.find(g => g.id === gateId)
    if (!gate) return

    if (gate.type === 'single') {
      addSingleGate(gate, qubit, col)
    } else {
      setPlacingGate({ gate, firstQubit: qubit, col, neededClicks: gate.type === 'three' ? 2 : 1, clicks: [] })
    }
    setDragGate(null)
  }, [])

  const addSingleGate = (gate, qubit, col) => {
    setCircuit(prev => [...prev, {
      gate: gate.id, targets: [qubit], controls: [],
      col, color: gate.color, label: gate.label, type: gate.type 
    }])
    setStepIndex(-1)
  }

  const handleSlotClick = (qubit, _col) => {
    if (!placingGate) return
    const { gate, firstQubit, col: gateCol, neededClicks, clicks } = placingGate

    if (qubit === firstQubit) return
    const newClicks = [...clicks, qubit]

    if (newClicks.length >= neededClicks) {
      if (gate.type === 'two') {
        setCircuit(prev => [...prev, {
          gate: gate.id, targets: [newClicks[0]], controls: [firstQubit],
          col: gateCol, color: gate.color, label: gate.label, type: gate.type
        }])
      } else if (gate.type === 'three') {
        setCircuit(prev => [...prev, {
          gate: gate.id, targets: [newClicks[1]], controls: [firstQubit, newClicks[0]],
          col: gateCol, color: gate.color, label: gate.label, type: gate.type
        }])
      }
      setPlacingGate(null)
      setStepIndex(-1)
    } else {
      setPlacingGate({ ...placingGate, clicks: newClicks })
    }
  }

  const removeGate = (idx) => {
    setCircuit(prev => prev.filter((_, i) => i !== idx))
    setStepIndex(-1)
  }

  const clearCircuit = () => {
    setCircuit([])
    setStepIndex(-1)
    setStepData(null)
    setError(null)
  }

  /* ── API calls ───────────────────────────────────── */
  const gatesPayload = (circ = circuit) => circ.map(g => ({
    gate: g.gate, targets: g.targets, controls: g.controls
  }))

  const runCircuit = async () => {
    if (circuit.length === 0) return
    setLoading(true)
    setError(null)
    setStepIndex(-1)

    // Phase 8: Verify puzzle if active
    if (activePuzzle) {
      try {
        const verifyRes = await axios.post(`${API_BASE}/api/puzzles/verify`, {
          num_qubits: numQubits, gates: gatesPayload(), puzzle_id: activePuzzle.id
        });
        if (!verifyRes.data.success) {
          setError(verifyRes.data.message);
          setLoading(false);
          return; // Stop execution on verify fail
        } else {
          onEarnBadge(verifyRes.data.badge);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Puzzle verification failed');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await axios.post(`${API_BASE}/api/circuit/run`, {
        num_qubits: numQubits, gates: gatesPayload()
      })
      onCircuitResult(res.data)
      setStepData(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Circuit execution failed')
    } finally {
      setLoading(false)
    }
  }

  // Direct run for tour (uses current circuit state at call time)
  const runCircuitDirect = async () => {
    setLoading(true)
    setError(null)
    setStepIndex(-1)
    try {
      // Need to build payload from the latest state
      const latestCircuit = []
      setCircuit(prev => { latestCircuit.push(...prev); return prev })
      const payload = latestCircuit.map(g => ({ gate: g.gate, targets: g.targets, controls: g.controls }))
      const nq = numQubits
      const res = await axios.post(`${API_BASE}/api/circuit/run`, {
        num_qubits: nq, gates: payload
      })
      onCircuitResult(res.data)
      setStepData(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Circuit execution failed')
    } finally {
      setLoading(false)
    }
  }

  const stepTo = async (idx) => {
    if (circuit.length === 0 || idx < 0 || idx >= circuit.length) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API_BASE}/api/circuit/step`, {
        num_qubits: numQubits, gates: gatesPayload(), step: idx
      })
      setStepIndex(idx)
      setStepData(res.data)
      onCircuitResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Step execution failed')
    } finally {
      setLoading(false)
    }
  }

  const stepForward = () => stepTo(stepIndex + 1)
  const stepBack    = () => { if (stepIndex > 0) stepTo(stepIndex - 1) }
  const resetStep   = () => { setStepIndex(-1); setStepData(null) }

  /* ── Phase 6: Measure All ─────────────────────────── */
  const measureAll = async () => {
    if (circuit.length === 0) return
    setMeasuring(true)
    setError(null)
    try {
      const res = await axios.post(`${API_BASE}/api/circuit/measure`, {
        num_qubits: numQubits, gates: gatesPayload()
      })
      setMeasureResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Measurement failed')
    } finally {
      setMeasuring(false)
    }
  }

  /* ── Phase 6: Export QASM ────────────────────────── */
  const exportQasm = async () => {
    if (circuit.length === 0) return
    setError(null)
    try {
      const res = await axios.post(`${API_BASE}/api/circuit/qasm`, {
        num_qubits: numQubits, gates: gatesPayload()
      })
      const blob = new Blob([res.data.qasm], { type: 'text/plain' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `circuit_${numQubits}q_${circuit.length}gates.qasm`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.detail || 'QASM export failed')
    }
  }

  /* ── Compute occupied columns ────────────────────── */
  const usedCols = new Set(circuit.map(g => g.col))
  const nextFreeCol = () => {
    for (let c = 0; c < MAX_SLOTS; c++) { if (!usedCols.has(c)) return c }
    return circuit.length
  }

  const handlePaletteClick = (gate) => {
    const col = nextFreeCol()
    if (gate.type === 'single') {
      addSingleGate(gate, 0, col)
    } else {
      setPlacingGate({ gate, firstQubit: 0, col, neededClicks: gate.type === 'three' ? 2 : 1, clicks: [] })
    }
  }

  /* ── Render ──────────────────────────────────────── */
  const cols = Math.max(MAX_SLOTS, circuit.length + 2)

  const grid = Array.from({ length: numQubits }, () => Array(cols).fill(null))
  circuit.forEach((g, idx) => {
    const allQubits = [...g.targets, ...g.controls]
    allQubits.forEach(q => {
      if (q < numQubits) grid[q][g.col] = { ...g, idx }
    })
  })

  return (
    <section className="circuit-builder">
      <div className="circuit-header-row">
        <div>
          <h2>⚡ Interactive Circuit Builder</h2>
          <p className="circuit-subtitle">
            Drag gates onto qubit wires or click to add, then run or step through
          </p>
        </div>
        <div className="qubit-selector">
          <label>Qubits</label>
          <select 
            value={numQubits} 
            onChange={e => { setNumQubits(+e.target.value); clearCircuit() }}
            disabled={!!activePuzzle}
          >
            {[2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {activePuzzle && (
        <div className="puzzle-active-banner">
          <div className="puzzle-banner-header">
            <h3>🎮 Active Puzzle: {activePuzzle.title}</h3>
            <button className="quit-puzzle-btn" onClick={onClearPuzzle}>✕ Quit</button>
          </div>
          <p>{activePuzzle.description}</p>
          <div className="puzzle-stats">
            <span className="gate-count">
              Gates used: {circuit.length} / {activePuzzle.max_gates}
            </span>
          </div>
          <div className="puzzle-hints">
            <button 
              className="hint-trigger-btn" 
              onClick={() => setHintIndex(Math.min(hintIndex + 1, activePuzzle.hints.length - 1))}
              disabled={hintIndex >= activePuzzle.hints.length - 1}
            >
              💡 Need a hint?
            </button>
            {hintIndex >= 0 && (
              <div className="hint-box">
                {activePuzzle.hints.slice(0, hintIndex + 1).map((h, i) => (
                  <p key={i}>{h}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gate Palette */}
      <div className="gate-palette">
        <span className="palette-label">Gate Palette</span>
        {GATES.map(gate => (
          <button
            key={gate.id}
            className="gate-btn"
            style={{ '--gate-color': gate.color }}
            draggable
            onDragStart={e => handleDragStart(e, gate)}
            onClick={() => handlePaletteClick(gate)}
            title={gate.desc}
            disabled={gate.type === 'three' && numQubits < 3}
          >
            <span className="gate-symbol">{gate.label}</span>
            <span className="gate-type-badge">{gate.type === 'single' ? '1Q' : gate.type === 'two' ? '2Q' : '3Q'}</span>
          </button>
        ))}
      </div>

      {placingGate && (
        <div className="placement-hint">
          🎯 Click qubit wire{placingGate.neededClicks - placingGate.clicks.length > 1 ? 's' : ''} to set{' '}
          {placingGate.gate.type === 'two' ? 'target' : `target (${placingGate.clicks.length + 1}/${placingGate.neededClicks})`} for {placingGate.gate.label}
          <button className="cancel-placement" onClick={() => setPlacingGate(null)}>Cancel</button>
        </div>
      )}

      {/* Circuit Canvas */}
      <div className="circuit-canvas">
        {Array.from({ length: numQubits }, (_, row) => (
          <div key={row} className="qubit-row">
            <div className="qubit-label">q<sub>{row}</sub></div>
            <div className="qubit-wire">
              {Array.from({ length: cols }, (_, col) => {
                const placed = grid[row][col]
                const isHighlightedStep = stepIndex >= 0 && placed && placed.col <= stepIndex
                const isDimmedStep = stepIndex >= 0 && placed && placed.col > stepIndex
                return (
                  <div
                    key={col}
                    className={`gate-slot ${dragGate ? 'droppable' : ''} ${placingGate ? 'click-target' : ''} ${isHighlightedStep ? 'step-active' : ''} ${isDimmedStep ? 'step-dimmed' : ''}`}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                    onDrop={e => handleDrop(e, row, col)}
                    onClick={() => handleSlotClick(row, col)}
                  >
                    {placed && (
                      <div
                        className={`gate-placed ${placed.type}`}
                        style={{ '--gate-color': placed.color }}
                        title={`${placed.label} — right-click to remove`}
                        onContextMenu={e => { e.preventDefault(); removeGate(placed.idx) }}
                      >
                        <span>{placed.label}</span>
                        {placed.controls.includes(row) && <span className="ctrl-dot">●</span>}
                        {placed.targets.includes(row) && placed.type !== 'single' && <span className="tgt-marker">⊕</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {circuit.map((g, idx) => {
          if (g.type === 'single') return null
          const allQubits = [...g.controls, ...g.targets].sort((a, b) => a - b)
          const minQ = allQubits[0]
          const maxQ = allQubits[allQubits.length - 1]
          if (minQ === maxQ) return null
          return (
            <div
              key={`conn-${idx}`}
              className="gate-connection"
              style={{
                '--col': g.col,
                '--min-row': minQ,
                '--max-row': maxQ,
                '--gate-color': g.color,
              }}
            />
          )
        })}
      </div>

      {/* Controls */}
      <div className="circuit-controls">
        <div className="controls-left">
          <button className="ctrl-btn run" onClick={runCircuit} disabled={loading || circuit.length === 0}>
            {loading ? '⏳ Running…' : '▶ Run Circuit'}
          </button>
          <button
            className="ctrl-btn measure"
            onClick={measureAll}
            disabled={measuring || circuit.length === 0}
            title="Simulate quantum measurement — collapse the wavefunction!"
          >
            {measuring ? '⏳ Measuring…' : '⚛ Measure All'}
          </button>
          <button
            className="ctrl-btn qasm"
            onClick={exportQasm}
            disabled={circuit.length === 0}
            title="Download circuit as OpenQASM 2.0 source code"
          >
            ⬇ Export QASM
          </button>
          <button className="ctrl-btn clear" onClick={clearCircuit} disabled={circuit.length === 0}>
            ✕ Clear
          </button>
        </div>

        <div className="controls-right">
          <span className="step-label">Step-through</span>
          <button className="ctrl-btn step" onClick={resetStep} disabled={stepIndex < 0} title="Reset stepping">
            ⏮
          </button>
          <button className="ctrl-btn step" onClick={stepBack} disabled={stepIndex <= 0} title="Step back">
            ◀
          </button>
          <span className="step-indicator">
            {stepIndex >= 0 ? `${stepIndex + 1} / ${circuit.length}` : '— / —'}
          </span>
          <button className="ctrl-btn step" onClick={stepForward} disabled={stepIndex >= circuit.length - 1} title="Step forward">
            ▶
          </button>
        </div>
      </div>

      {/* Live entropy */}
      {stepData && (
        <div className="entropy-live">
          <span className="entropy-live-label">Entanglement Entropy</span>
          <span className="entropy-live-value" key={stepData.entanglement_entropy}>
            {stepData.entanglement_entropy.toFixed(4)} S
          </span>
          {stepIndex >= 0 && (
            <span className="step-gate-label">
              after gate {stepIndex + 1}: <strong>{circuit[stepIndex]?.label}</strong>
            </span>
          )}
        </div>
      )}

      {error && <div className="circuit-error">⚠ {error}</div>}

      {/* Phase 6: Measurement Result Modal */}
      <MeasurementResult result={measureResult} onClose={() => setMeasureResult(null)} />
    </section>
  )
})

export default CircuitBuilder
