import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

/**
 * Density Matrix Heatmap using D3.
 * Colour: hue = phase, lightness = magnitude
 */
export default function DensityMatrix({ detail }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!detail?.density_matrix || !svgRef.current) return

    const dm = detail.density_matrix
    const N = dm.length // 4 for 2-qubit, 8 for 3-qubit

    // Precompute cell data
    const cells = []
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const { re, im } = dm[i][j]
        const mag = Math.sqrt(re * re + im * im)
        const phase = Math.atan2(im, re)
        const phaseDeg = (phase * 180) / Math.PI
        cells.push({ i, j, re, im, mag, phase, phaseDeg })
      }
    }

    // Dimensions
    const container = svgRef.current.parentElement
    const totalW = container.clientWidth || 560
    const margin = { top: 36, right: 20, bottom: 56, left: 56 }
    const plotSize = Math.min(totalW - margin.left - margin.right, 480)
    const cellSize = plotSize / N

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', totalW)
      .attr('height', plotSize + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Phase→colour helper
    const cellColor = (mag, phase) => {
      if (mag < 0.001) return '#0a0d14'
      const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360
      const lightness = 12 + mag * 52
      return `hsl(${hue.toFixed(1)}, 75%, ${lightness.toFixed(1)}%)`
    }

    // Draw cells
    svg.selectAll('.dm-cell')
      .data(cells)
      .join('rect')
      .attr('class', 'dm-cell')
      .attr('x', d => d.j * cellSize)
      .attr('y', d => d.i * cellSize)
      .attr('width', cellSize - 1.5)
      .attr('height', cellSize - 1.5)
      .attr('rx', 3)
      .attr('fill', '#0a0d14')
      .attr('stroke', '#1e2840')
      .attr('stroke-width', 0.8)
      .transition().duration(500)
      .attr('fill', d => cellColor(d.mag, d.phase))

    // Diagonal highlight border
    svg.selectAll('.dm-diag')
      .data(cells.filter(d => d.i === d.j))
      .join('rect')
      .attr('x', d => d.j * cellSize)
      .attr('y', d => d.i * cellSize)
      .attr('width', cellSize - 1.5)
      .attr('height', cellSize - 1.5)
      .attr('rx', 3)
      .attr('fill', 'none')
      .attr('stroke', '#4f8ef7')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6)

    // Magnitude text in cells (only if cells are large enough)
    if (cellSize >= 42) {
      svg.selectAll('.dm-val')
        .data(cells)
        .join('text')
        .attr('x', d => d.j * cellSize + cellSize / 2)
        .attr('y', d => d.i * cellSize + cellSize / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-size', Math.max(8, cellSize * 0.2) + 'px')
        .attr('fill', d => d.mag > 0.05 ? 'rgba(226,232,248,0.8)' : 'transparent')
        .text(d => d.mag.toFixed(2))
    }

    // Axis labels (basis states)
    const labels = Array.from({ length: N }, (_, k) =>
      `|${k.toString(2).padStart(detail.qubits, '0')}⟩`
    )

    svg.selectAll('.col-label')
      .data(labels)
      .join('text')
      .attr('x', (_, k) => k * cellSize + cellSize / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', Math.max(9, Math.min(12, cellSize * 0.28)) + 'px')
      .attr('fill', '#9f6ef5')
      .text(d => d)

    svg.selectAll('.row-label')
      .data(labels)
      .join('text')
      .attr('x', -8)
      .attr('y', (_, k) => k * cellSize + cellSize / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', Math.max(9, Math.min(12, cellSize * 0.28)) + 'px')
      .attr('fill', '#9f6ef5')
      .text(d => d)

    // Tooltip
    const tooltip = d3.select('body')
      .selectAll('.dm-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'dm-tooltip')
      .style('position', 'fixed')
      .style('background', '#111620')
      .style('border', '1px solid #1e2840')
      .style('border-radius', '8px')
      .style('padding', '10px 14px')
      .style('font-size', '0.78rem')
      .style('color', '#e2e8f8')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('font-family', "'JetBrains Mono', monospace")
      .style('z-index', 9999)

    svg.selectAll('.dm-cell')
      .on('mouseover', (event, d) => {
        const hue = (((d.phase + Math.PI) / (2 * Math.PI)) * 360).toFixed(1)
        tooltip.style('opacity', 1).html(`
          <div style="color:#9f6ef5;font-weight:700;margin-bottom:6px">ρ[${d.i}][${d.j}]</div>
          <div>Re: <span style="color:#4f8ef7">${d.re.toFixed(4)}</span></div>
          <div>Im: <span style="color:#4f8ef7">${d.im.toFixed(4)}</span></div>
          <div>|ρ|: <span style="color:#3ecf8e">${d.mag.toFixed(4)}</span></div>
          <div>Phase: <span style="color:hsl(${hue},80%,60%)">${d.phaseDeg.toFixed(1)}°</span></div>
          ${d.i === d.j ? '<div style="color:#4f8ef7;margin-top:4px">◆ Diagonal (probability)</div>' : ''}
        `)
      })
      .on('mousemove', event => {
        tooltip.style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 30) + 'px')
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))

    // Legend
    const lgY = plotSize + 20
    const lgW = 200, lgH = 10
    const lgX = (plotSize - lgW) / 2
    const lgDefs = svg.append('defs')
    const lgGrad = lgDefs.append('linearGradient').attr('id', 'dm-phase-grad')
    for (let s = 0; s <= 12; s++) {
      lgGrad.append('stop')
        .attr('offset', `${(s / 12) * 100}%`)
        .attr('stop-color', `hsl(${s * 30}, 75%, 42%)`)
    }
    svg.append('rect')
      .attr('x', lgX).attr('y', lgY)
      .attr('width', lgW).attr('height', lgH)
      .attr('rx', lgH / 2)
      .attr('fill', 'url(#dm-phase-grad)')
    svg.append('text').attr('x', lgX).attr('y', lgY + lgH + 14)
      .attr('fill', '#8892aa').attr('font-size', '0.66rem').text('Phase -π')
    svg.append('text').attr('x', lgX + lgW).attr('y', lgY + lgH + 14)
      .attr('fill', '#8892aa').attr('font-size', '0.66rem').attr('text-anchor', 'end').text('+π')
    svg.append('text').attr('x', lgX + lgW / 2).attr('y', lgY - 6)
      .attr('fill', '#8892aa').attr('font-size', '0.66rem').attr('text-anchor', 'middle')
      .text('Hue = phase · Brightness = |ρ|')

  }, [detail])

  return (
    <div className="viz-chart-wrap">
      <p className="section-hint">N×N density matrix · Diagonal cells = measurement probabilities · Blue outline = diagonal</p>
      <svg ref={svgRef} style={{ width: '100%' }} />
    </div>
  )
}
