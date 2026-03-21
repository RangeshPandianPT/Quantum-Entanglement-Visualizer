/**
 * VizTooltips — educational explanations for each visualization type.
 * Displayed as a collapsible info box under each viz tab.
 */

const TOOLTIPS = {
  bloch: {
    title: 'Bloch Sphere',
    icon: '🌐',
    explanation: 'Each qubit\'s state is shown as a point on a sphere. The north pole is |0⟩, the south pole is |1⟩, and the equator represents superposition states. When a qubit is entangled, it appears near the center (mixed state) because its state can\'t be described independently.',
    keyConcepts: ['Pure states sit on the surface (|R| = 1)', 'Mixed/entangled states are inside the sphere (|R| < 1)', 'At the center means max entanglement (completely random individually)'],
  },
  amplitudes: {
    title: 'Amplitude Chart',
    icon: '📊',
    explanation: 'Shows the probability of measuring each basis state. The bars represent how likely each outcome is when you observe the qubits. In an entangled state like Bell |Φ⁺⟩, only |00⟩ and |11⟩ have probability — you always measure both qubits the same!',
    keyConcepts: ['Bar height = probability of measuring that state', 'Phase (color) encodes quantum phase information', 'All probabilities sum to 1 (certainty)'],
  },
  density: {
    title: 'Density Matrix',
    icon: '🔲',
    explanation: 'A complete mathematical description of the quantum state. The diagonal elements are probabilities, and off-diagonal elements represent quantum coherence (superposition). Large off-diagonal values indicate strong quantum correlations.',
    keyConcepts: ['Diagonal = probabilities of each basis state', 'Off-diagonal = quantum coherence / superposition', 'Brighter off-diagonal cells = stronger quantum effects'],
  },
  entanglement: {
    title: 'Entanglement Graph',
    icon: '🕸',
    explanation: 'A network showing which qubits are entangled with each other. Thicker, brighter lines mean stronger entanglement between those qubits. Node color indicates how "mixed" each individual qubit is.',
    keyConcepts: ['Edge thickness = entanglement strength', 'Glowing nodes = entangled (mixed) qubits', 'Dim nodes = separable (pure) qubits'],
  },
  qsphere: {
    title: 'Q-Sphere',
    icon: '🔮',
    explanation: 'A 3D visualization where each basis state is a point on a sphere. The size of each point represents its probability, and the color represents its phase. States are positioned by Hamming weight (number of 1s in the binary label).',
    keyConcepts: ['Point size = probability of that state', 'Point color = quantum phase angle', 'Vertical position = number of |1⟩s in the state'],
  },
}

export default function VizTooltip({ tabId }) {
  const tip = TOOLTIPS[tabId]
  if (!tip) return null

  return (
    <div className="viz-tooltip-box">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-icon">{tip.icon}</span>
        <span className="viz-tooltip-title">{tip.title}</span>
        <span className="viz-tooltip-badge">What am I looking at?</span>
      </div>
      <p className="viz-tooltip-text">{tip.explanation}</p>
      <ul className="viz-tooltip-concepts">
        {tip.keyConcepts.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </div>
  )
}
