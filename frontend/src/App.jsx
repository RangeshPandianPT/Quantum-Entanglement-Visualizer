import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import BlochSphere from './components/BlochSphere.jsx'
import AmplitudeChart from './components/AmplitudeChart.jsx'
import DensityMatrix from './components/DensityMatrix.jsx'
import EntanglementGraph from './components/EntanglementGraph.jsx'
import QSphere from './components/QSphere.jsx'

const API_BASE = 'http://localhost:8000'

const TABS = [
  { id: 'bloch',         label: '⊕ Bloch Spheres' },
  { id: 'amplitudes',   label: '▦ Amplitudes'     },
  { id: 'density',      label: '⬛ Density Matrix'  },
  { id: 'entanglement', label: '⬡ Entanglement'   },
  { id: 'qsphere',      label: '◉ Q-Sphere'       },
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

  // Initial load
  useEffect(() => {
    axios.get(`${API_BASE}/api/health`)
      .then(() => {
        setApiStatus('online')
        return axios.get(`${API_BASE}/api/quantum-states`)
      })
      .then(res => setStates(res.data.states))
      .catch(() => setApiStatus('offline'))
  }, [])

  // Load state detail + bloch + graph when a state is selected
  useEffect(() => {
    if (!selected) return

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
          <div className={`api-badge ${apiStatus}`}>
            <span className="dot" />
            {apiStatus === 'checking' ? 'Connecting…'
              : apiStatus === 'online' ? 'API Online' : 'API Offline'}
          </div>
        </div>
      </header>

      <main className="main">
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
        {selected && (
          <section className="detail-panel">
            {/* State header */}
            {detail && !loadingDetail && (
              <div className="state-header-row">
                <div>
                  <h2>{detail.name}</h2>
                  <p className="detail-subtitle">
                    {detail.qubits}-qubit state · {detail.basis_labels.length} basis vectors
                  </p>
                </div>
                <div
                  className="entropy-badge"
                  title="Von Neumann Entropy — measures degree of entanglement"
                >
                  <span className="entropy-label">Entanglement Entropy</span>
                  <span className="entropy-value">
                    {detail.entanglement_entropy.toFixed(3)} S
                  </span>
                </div>
              </div>
            )}
            {loadingDetail && <div className="loading-spinner">Computing quantum state…</div>}

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
            </div>

            {/* Tab panels */}
            <div className="viz-panel">
              {activeTab === 'bloch' && (
                <BlochSphere blochData={blochData} loading={loadingBloch} />
              )}
              {activeTab === 'amplitudes' && (
                detail
                  ? <AmplitudeChart detail={detail} />
                  : <div className="viz-loading">Loading amplitude data…</div>
              )}
              {activeTab === 'density' && (
                detail
                  ? <DensityMatrix detail={detail} />
                  : <div className="viz-loading">Loading density matrix…</div>
              )}
              {activeTab === 'entanglement' && (
                <EntanglementGraph graphData={graphData} loading={loadingGraph} />
              )}
              {activeTab === 'qsphere' && (
                detail
                  ? <QSphere detail={detail} />
                  : <div className="viz-loading">Loading Q-Sphere data…</div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Phase 3 Complete · Bloch Sphere · Amplitudes · Density Matrix · Entanglement Graph · Q-Sphere</p>
        <p style={{ marginTop: '4px' }}>React + Vite + D3 + Three.js / Python + FastAPI + Qiskit</p>
      </footer>
    </div>
  )
}
