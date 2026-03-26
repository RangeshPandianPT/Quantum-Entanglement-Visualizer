import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'
import BlochSphere from './components/BlochSphere.jsx'
import AmplitudeChart from './components/AmplitudeChart.jsx'
import DensityMatrix from './components/DensityMatrix.jsx'
import EntanglementGraph from './components/EntanglementGraph.jsx'
import QSphere from './components/QSphere.jsx'
import CircuitBuilder from './components/CircuitBuilder.jsx'
import GuidedTour from './components/GuidedTour.jsx'
import EntanglementMeter from './components/EntanglementMeter.jsx'
import StateNotation from './components/StateNotation.jsx'
import VizTooltip from './components/VizTooltip.jsx'
import ChallengesModal from './components/ChallengesModal.jsx'
import BadgeToast from './components/BadgeToast.jsx'
import AlgorithmWalkthrough from './components/AlgorithmWalkthrough.jsx'
import AIAssistant from './components/AIAssistant.jsx'

const TABS = [
  { id: 'bloch',         label: '⊕ Bloch Spheres' },
  { id: 'amplitudes',   label: '▦ Amplitudes'     },
  { id: 'density',      label: '⬛ Density Matrix'  },
  { id: 'entanglement', label: '⬡ Entanglement'   },
  { id: 'qsphere',      label: '◉ Q-Sphere'       },
]

/* ── Preset Demo Circuits ──────────────────────────── */
const PRESET_DEMOS = [
  {
    id: 'bell',
    label: '⚛ Create Bell Pair',
    desc: '|Φ⁺⟩ = (|00⟩+|11⟩)/√2',
    numQubits: 2,
    gates: [
      { gate: 'h', targets: [0], controls: [] },
      { gate: 'cx', targets: [1], controls: [0] },
    ],
  },
  {
    id: 'ghz',
    label: '⬡ Create GHZ State',
    desc: '(|000⟩+|111⟩)/√2',
    numQubits: 3,
    gates: [
      { gate: 'h', targets: [0], controls: [] },
      { gate: 'cx', targets: [1], controls: [0] },
      { gate: 'cx', targets: [2], controls: [0] },
    ],
  },
  {
    id: 'w',
    label: '🌀 Create W State',
    desc: '(|001⟩+|010⟩+|100⟩)/√3',
    numQubits: 3,
    gates: [
      // Approximate W state via circuit: Ry rotations + CNOTs
      // We'll use the backend's preset endpoint instead for accuracy
    ],
    usePreset: 'w', // Flag to use /api/state/w endpoint instead
  },
]

function StateCard({ state, selected, onClick }) {
  return (
    <button className={`state-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="state-icon">{state.qubits === 2 ? '⚛' : '⬡'}</div>
      <div className="state-info">
        <h3>{state.name}</h3>
        <p className="formula">{state.formula}</p>
        <span className="qubit-badge">{state.qubits} qubits</span>
      </div>
    </button>
  )
}

export default function App() {
  const [states, setStates]           = useState([])
  const [selected, setSelected]       = useState(null)
  const [detail, setDetail]           = useState(null)
  const [blochData, setBlochData]     = useState(null)
  const [graphData, setGraphData]     = useState(null)
  const [apiStatus, setApiStatus]     = useState('checking')
  const [loadingDetail, setLoadingDetail]   = useState(false)
  const [loadingBloch, setLoadingBloch]     = useState(false)
  const [loadingGraph, setLoadingGraph]     = useState(false)
  const [activeTab, setActiveTab]     = useState('bloch')
  const [showTooltip, setShowTooltip] = useState(true)

  // Gamification state
  const [puzzles, setPuzzles] = useState([])
  const [dailyChallenge, setDailyChallenge] = useState(null)
  const [isChallengesOpen, setIsChallengesOpen] = useState(false)
  const [activePuzzle, setActivePuzzle] = useState(null)
  const [earnedBadges, setEarnedBadges] = useState(() => {
    const saved = localStorage.getItem('quantum_badges')
    return saved ? JSON.parse(saved) : []
  })
  const [toastBadge, setToastBadge] = useState(null)

  const handleEarnBadge = (badgeName) => {
    if (!earnedBadges.includes(badgeName)) {
      const updated = [...earnedBadges, badgeName]
      setEarnedBadges(updated)
      localStorage.setItem('quantum_badges', JSON.stringify(updated))
    }
    setToastBadge(badgeName)
  }

  // Circuit builder state
  const [circuitResult, setCircuitResult] = useState(null)
  const [vizSource, setVizSource]    = useState('preset') // 'preset' | 'circuit'

  // Ref to CircuitBuilder for guided tour actions
  const circuitRef = useRef(null)

  // Initial load
  useEffect(() => {
    axios.get(`${API_BASE}/api/health`)
      .then(() => {
        setApiStatus('online')
        // Fetch puzzles
        axios.get(`${API_BASE}/api/puzzles`)
          .then(res => {
            setPuzzles(res.data.puzzles)
            setDailyChallenge(res.data.daily_challenge)
          })
          .catch(err => console.error("Error fetching puzzles:", err))

        return axios.get(`${API_BASE}/api/quantum-states`)
      })
      .then(res => setStates(res.data.states))
      .catch(() => setApiStatus('offline'))
  }, [])

  // Load state detail + bloch + graph when a state is selected
  useEffect(() => {
    if (!selected) return

    setVizSource('preset')
    setCircuitResult(null)
    setLoadingDetail(true)
    setLoadingBloch(true)
    setLoadingGraph(true)
    setDetail(null)
    setBlochData(null)
    setGraphData(null)

    axios.get(`${API_BASE}/api/state/${selected}`)
      .then(res => setDetail(res.data))
      .finally(() => setLoadingDetail(false))

    axios.get(`${API_BASE}/api/state/${selected}/bloch`)
      .then(res => setBlochData(res.data))
      .finally(() => setLoadingBloch(false))

    axios.get(`${API_BASE}/api/state/${selected}/entanglement-graph`)
      .then(res => setGraphData(res.data))
      .finally(() => setLoadingGraph(false))
  }, [selected])

  // Handle circuit result
  const handleCircuitResult = (data) => {
    setVizSource('circuit')
    setSelected(null)
    setCircuitResult(data)
    setDetail({
      name: data.name,
      qubits: data.qubits,
      statevector: data.statevector,
      basis_labels: data.basis_labels,
      probabilities: data.probabilities,
      density_matrix: data.density_matrix,
      entanglement_entropy: data.entanglement_entropy,
    })
    setBlochData({
      state_id: 'circuit',
      name: data.name,
      qubits: data.qubits,
      bloch_vectors: data.bloch_vectors,
    })
    setGraphData({
      state_id: 'circuit',
      name: data.name,
      qubits: data.qubits,
      nodes: data.entanglement_graph.nodes,
      edges: data.entanglement_graph.edges,
    })
    setLoadingDetail(false)
    setLoadingBloch(false)
    setLoadingGraph(false)
  }

  // Handle preset demo button clicks
  const handlePresetDemo = async (preset) => {
    if (preset.usePreset) {
      // Use the predefined backend state endpoint
      setSelected(preset.usePreset)
      return
    }
    // Run circuit via API
    try {
      const res = await axios.post(`${API_BASE}/api/circuit/run`, {
        num_qubits: preset.numQubits, gates: preset.gates,
      })
      handleCircuitResult(res.data)
    } catch (err) {
      console.error('Preset demo failed:', err)
    }
  }

  // Handle guided tour actions
  const handleTourAction = (action) => {
    if (circuitRef.current) {
      circuitRef.current.tourAction(action)
    }
  }

  // Derived flags
  const showViz = vizSource === 'circuit' ? !!circuitResult : !!selected
  const vizDetail   = detail
  const vizBloch    = blochData
  const vizGraph    = graphData
  const isLoading   = loadingDetail || loadingBloch || loadingGraph

  return (
    <div className="app">
      {/* ── Header ─────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo-area">
            <div className="logo-icon">⚛</div>
            <div>
              <h1>Quantum Entanglement Visualizer</h1>
              <p>Interactive exploration of multi-qubit entangled states</p>
            </div>
          </div>
          <div className="header-right">
            <button className="challenges-nav-btn" onClick={() => setIsChallengesOpen(true)}>
              🎮 Challenges
            </button>
            <GuidedTour onAction={handleTourAction} />
            <div className={`api-badge ${apiStatus}`}>
              <span className="dot" />
              {apiStatus === 'checking' ? 'Connecting…'
                : apiStatus === 'online' ? 'API Online' : 'API Offline'}
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {/* ── Preset Demo Buttons ──────────────── */}
        <section className="preset-demos">
          <div className="demos-header">
            <h2>🚀 Quick Start — Try a Preset</h2>
            <p className="demos-subtitle">
              Instantly generate a famous entangled state and see all visualizations update
            </p>
          </div>
          <div className="demos-grid">
            {PRESET_DEMOS.map(preset => (
              <button
                key={preset.id}
                className="demo-btn"
                onClick={() => handlePresetDemo(preset)}
                disabled={apiStatus !== 'online'}
              >
                <span className="demo-label">{preset.label}</span>
                <span className="demo-desc">{preset.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Circuit Builder ──────────────────── */}
        <CircuitBuilder 
          ref={circuitRef} 
          onCircuitResult={handleCircuitResult}
          activePuzzle={activePuzzle}
          onClearPuzzle={() => setActivePuzzle(null)}
          onEarnBadge={handleEarnBadge}
        />

        {/* ── Algorithm Walkthrough ────────────── */}
        <AlgorithmWalkthrough
          onCircuitResult={handleCircuitResult}
          disabled={!!activePuzzle}
        />

        {/* ── Divider ─────────────────────────── */}
        <div className="section-divider">
          <span>or select a preset state</span>
        </div>

        {/* ── Intro ──────────────────────────── */}
        <section className="intro">
          <div className="scope-pills">
            <span className="pill">Bell States (All 4)</span>
            <span className="pill">GHZ States (3-qubit)</span>
            <span className="pill">W States (3-qubit)</span>
          </div>
          <p className="intro-text">
            Select a quantum state below to explore it across five interactive visualizations —
            Bloch spheres, amplitude charts, density matrix heatmaps, entanglement graphs, and the Q-sphere —
            all computed in real-time via Qiskit.
          </p>
        </section>

        {/* ── State selector ─────────────────── */}
        <section className="state-selector">
          <h2>Choose a Quantum State</h2>
          {apiStatus === 'offline' && (
            <div className="warning-box">
              ⚠ Backend is offline. Run <code>uvicorn main:app --reload</code> in <code>/backend</code>.
            </div>
          )}
          <div className="cards-grid">
            {states.map(s => (
              <StateCard
                key={s.id} state={s}
                selected={selected === s.id}
                onClick={() => setSelected(s.id)}
              />
            ))}
          </div>
        </section>

        {/* ── Visualization panel ─────────────── */}
        {showViz && (
          <section className="detail-panel">
            {/* State header + entanglement meter */}
            {vizDetail && !isLoading && (
              <>
                <div className="state-header-row">
                  <div>
                    <h2>{vizDetail.name}</h2>
                    <p className="detail-subtitle">
                      {vizDetail.qubits}-qubit state · {vizDetail.basis_labels.length} basis vectors
                      {vizSource === 'circuit' && <span className="source-badge">Circuit</span>}
                    </p>
                  </div>
                  <div
                    className="entropy-badge"
                    title="Von Neumann Entropy — measures degree of entanglement"
                  >
                    <span className="entropy-label">Entanglement Entropy</span>
                    <span className="entropy-value">
                      {vizDetail.entanglement_entropy.toFixed(3)} S
                    </span>
                  </div>
                </div>

                {/* State Notation */}
                <StateNotation detail={vizDetail} />

                {/* Entanglement Meter */}
                <EntanglementMeter entropy={vizDetail.entanglement_entropy} />
              </>
            )}
            {isLoading && <div className="loading-spinner">Computing quantum state…</div>}

            {/* Tab bar */}
            <div className="viz-tabs" role="tablist">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`viz-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
              <button
                className={`viz-tab tooltip-toggle ${showTooltip ? 'active' : ''}`}
                onClick={() => setShowTooltip(!showTooltip)}
                title="Toggle visualization explanations"
              >
                {showTooltip ? '💡 Hide Info' : '💡 Show Info'}
              </button>
            </div>

            {/* Tooltip explanation */}
            {showTooltip && <VizTooltip tabId={activeTab} />}

            {/* Tab panels */}
            <div className="viz-panel">
              {activeTab === 'bloch' && (
                <BlochSphere blochData={vizBloch} loading={loadingBloch} />
              )}
              {activeTab === 'amplitudes' && (
                vizDetail
                  ? <AmplitudeChart detail={vizDetail} />
                  : <div className="viz-loading">Loading amplitude data…</div>
              )}
              {activeTab === 'density' && (
                vizDetail
                  ? <DensityMatrix detail={vizDetail} />
                  : <div className="viz-loading">Loading density matrix…</div>
              )}
              {activeTab === 'entanglement' && (
                <EntanglementGraph graphData={vizGraph} loading={loadingGraph} />
              )}
              {activeTab === 'qsphere' && (
                vizDetail
                  ? <QSphere detail={vizDetail} />
                  : <div className="viz-loading">Loading Q-Sphere data…</div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Phase 8 · Quantum Entanglement Visualizer · Built with React + Vite + D3 + Three.js / Python + FastAPI + Qiskit</p>
      </footer>

      {/* ── Gamification Modals & Toasts ────────────── */}
      <ChallengesModal
        isOpen={isChallengesOpen}
        onClose={() => setIsChallengesOpen(false)}
        puzzles={puzzles}
        dailyChallenge={dailyChallenge}
        earnedBadges={earnedBadges}
        onSelectPuzzle={(puzzle) => {
          setActivePuzzle(puzzle)
          setIsChallengesOpen(false)
        }}
      />
      <BadgeToast 
        badge={toastBadge} 
        show={!!toastBadge} 
        onClose={() => setToastBadge(null)} 
      />

      <AIAssistant 
        circuit={circuitResult?.circuit || []} 
        numQubits={vizDetail?.qubits || 2} 
        currentStateDetails={vizDetail} 
      />
