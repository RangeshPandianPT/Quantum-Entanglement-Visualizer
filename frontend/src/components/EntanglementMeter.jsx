export default function EntanglementMeter({ entropy, maxEntropy = 1.0 }) {
  if (entropy == null) return null

  const normalized = Math.min(entropy / maxEntropy, 1.0)
  const percentage = (normalized * 100).toFixed(0)

  // Dynamic color from cyan (separable) → purple (partially) → pink (maximally entangled)
  const hue = 200 - (normalized * 120) // 200=cyan → 80=pink
  const color = `hsl(${hue}, 75%, 60%)`

  const getLabel = () => {
    if (normalized < 0.01) return { text: 'Separable (No Entanglement)', emoji: '🔵' }
    if (normalized < 0.25) return { text: 'Weakly Entangled', emoji: '🟢' }
    if (normalized < 0.50) return { text: 'Partially Entangled', emoji: '🟡' }
    if (normalized < 0.75) return { text: 'Strongly Entangled', emoji: '🟠' }
    if (normalized < 0.99) return { text: 'Highly Entangled', emoji: '🔴' }
    return { text: 'Maximally Entangled!', emoji: '⚛' }
  }

  const label = getLabel()

  return (
    <div className="entanglement-meter">
      <div className="meter-header">
        <span className="meter-title">
          <span className="meter-emoji">{label.emoji}</span>
          Entanglement Meter
        </span>
        <span className="meter-score" style={{ color }}>{entropy.toFixed(3)} S</span>
      </div>
      <div className="meter-bar-track">
        <div
          className="meter-bar-fill"
          style={{ width: `${percentage}%`, background: color }}
        />
        <div className="meter-markers">
          <span>0</span>
          <span>0.25</span>
          <span>0.5</span>
          <span>0.75</span>
          <span>1.0</span>
        </div>
      </div>
      <div className="meter-label" style={{ color }}>
        {label.text}
      </div>
      <div className="meter-tooltip">
        Von Neumann entropy of the reduced density matrix. 0 = completely separable (no quantum correlation), 
        1 = maximally entangled (perfect quantum correlation between qubits).
      </div>
    </div>
  )
}
