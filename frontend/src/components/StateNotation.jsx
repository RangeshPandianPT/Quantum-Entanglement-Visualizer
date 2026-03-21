/**
 * StateNotation — Renders the mathematical state vector notation in real time.
 * Shows |ψ⟩ = Σ αᵢ|i⟩ with only non-zero amplitudes.
 */
export default function StateNotation({ detail }) {
  if (!detail || !detail.statevector || !detail.basis_labels) return null

  const { statevector, basis_labels, name, qubits } = detail

  // Build terms: only include non-zero amplitudes
  const terms = []
  statevector.forEach((amp, i) => {
    const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im)
    if (mag < 1e-6) return

    let coeff = ''
    if (Math.abs(amp.im) < 1e-6) {
      // Real coefficient
      const val = amp.re
      if (Math.abs(Math.abs(val) - 1) < 1e-6) {
        coeff = val < 0 ? '−' : ''
      } else if (Math.abs(Math.abs(val) - 1 / Math.sqrt(2)) < 1e-4) {
        coeff = val < 0 ? '−1/√2' : '1/√2'
      } else if (Math.abs(Math.abs(val) - 1 / Math.sqrt(3)) < 1e-4) {
        coeff = val < 0 ? '−1/√3' : '1/√3'
      } else {
        coeff = val.toFixed(3)
      }
    } else if (Math.abs(amp.re) < 1e-6) {
      // Pure imaginary
      const val = amp.im
      if (Math.abs(Math.abs(val) - 1) < 1e-6) {
        coeff = val < 0 ? '−i' : 'i'
      } else {
        coeff = `${val.toFixed(3)}i`
      }
    } else {
      // Complex
      const sign = amp.im >= 0 ? '+' : '−'
      coeff = `(${amp.re.toFixed(2)}${sign}${Math.abs(amp.im).toFixed(2)}i)`
    }

    terms.push({
      coeff,
      basis: basis_labels[i],
      negative: coeff.startsWith('−') || coeff.startsWith('-'),
    })
  })

  if (terms.length === 0) return null

  return (
    <div className="state-notation">
      <div className="notation-header">
        <span className="notation-label">Quantum State (Dirac Notation)</span>
        {name && <span className="notation-name">{name}</span>}
      </div>
      <div className="notation-formula">
        <span className="ket-psi">|ψ⟩</span>
        <span className="eq">=</span>
        {terms.map((t, i) => (
          <span key={i} className="term">
            {i > 0 && (
              <span className="op">{t.negative ? ' − ' : ' + '}</span>
            )}
            {i === 0 && t.negative && <span className="op">−</span>}
            <span className="coeff">{t.coeff.replace(/^[−-]/, '')}</span>
            <span className="ket">|{t.basis}⟩</span>
          </span>
        ))}
      </div>
      <div className="notation-info">
        {qubits}-qubit Hilbert space · {basis_labels.length} basis states · {terms.length} non-zero amplitudes
      </div>
    </div>
  )
}
