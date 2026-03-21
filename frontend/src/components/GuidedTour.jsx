import { useState } from 'react'

const TOUR_STEPS = [
  {
    title: 'Welcome to Quantum Circuits! 🌌',
    content: 'This guided tour will walk you through creating a Bell state — the simplest example of quantum entanglement. Two qubits become perfectly correlated, no matter the distance between them.',
    highlight: null,
  },
  {
    title: 'Step 1: The Hadamard Gate',
    content: 'First, we apply a Hadamard (H) gate to qubit q₀. This puts the qubit into a superposition — meaning it\'s in both |0⟩ and |1⟩ states simultaneously. Think of it like a coin spinning in the air, neither heads nor tails yet.',
    action: 'add_h',
    highlight: 'palette',
  },
  {
    title: 'Step 2: The CNOT Gate',
    content: 'Now we apply a CNOT (Controlled-NOT) gate with q₀ as control and q₁ as target. This entangles the two qubits — if q₀ is |0⟩, q₁ stays |0⟩; if q₀ is |1⟩, q₁ flips to |1⟩. The qubits\' fates are now linked!',
    action: 'add_cnot',
    highlight: 'palette',
  },
  {
    title: 'Step 3: Run the Circuit! ⚡',
    content: 'Click "Run Circuit" to execute. The result is the Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2. Notice how the entropy jumps to 1.0 — maximum entanglement! Both qubits are perfectly correlated.',
    action: 'run',
    highlight: 'run-btn',
  },
  {
    title: 'Understanding the Visualizations 📊',
    content: 'Explore each visualization tab:\n\n• Bloch Spheres — Each qubit appears at the center (maximally mixed), meaning individually they\'re random.\n• Amplitudes — Only |00⟩ and |11⟩ have probability, confirming perfect correlation.\n• Entanglement Graph — Strong lines between qubits show they\'re entangled.',
    highlight: 'viz-tabs',
  },
  {
    title: 'You\'re a Quantum Engineer! 🎓',
    content: 'You\'ve just created quantum entanglement! Try modifying the circuit, add more gates, or use the step-through mode to watch the state evolve one gate at a time. The entanglement meter shows how entangled your state is in real time.',
    highlight: null,
  },
]

export default function GuidedTour({ onAction }) {
  const [active, setActive]   = useState(false)
  const [step, setStep]       = useState(0)

  const startTour = () => { setActive(true); setStep(0) }
  const endTour   = () => { setActive(false); setStep(0) }

  const nextStep = () => {
    const current = TOUR_STEPS[step]
    // Execute action if this step has one
    if (current.action && onAction) {
      onAction(current.action)
    }
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      endTour()
    }
  }

  const prevStep = () => {
    if (step > 0) setStep(step - 1)
  }

  if (!active) {
    return (
      <button className="tour-start-btn" onClick={startTour}>
        <span className="tour-icon">🎓</span>
        <span>Guided Tour</span>
        <span className="tour-sub">Learn Bell States</span>
      </button>
    )
  }

  const current = TOUR_STEPS[step]

  return (
    <div className="guided-tour-overlay">
      <div className="guided-tour-card">
        <div className="tour-progress">
          {TOUR_STEPS.map((_, i) => (
            <div key={i} className={`tour-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>
        <h3 className="tour-title">{current.title}</h3>
        <div className="tour-content">
          {current.content.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <div className="tour-actions">
          <button className="tour-btn secondary" onClick={endTour}>Skip Tour</button>
          <div className="tour-nav">
            {step > 0 && (
              <button className="tour-btn secondary" onClick={prevStep}>← Back</button>
            )}
            <button className="tour-btn primary" onClick={nextStep}>
              {step < TOUR_STEPS.length - 1
                ? (current.action ? '✦ Apply & Next' : 'Next →')
                : 'Finish Tour 🎉'}
            </button>
          </div>
        </div>
        <div className="tour-step-count">{step + 1} / {TOUR_STEPS.length}</div>
      </div>
    </div>
  )
}
