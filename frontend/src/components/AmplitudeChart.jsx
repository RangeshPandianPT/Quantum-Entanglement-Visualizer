import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

/**
 * Amplitude/Phase bar chart using D3.
 * Each basis state gets a color from its phase angle (HSL hue)
 * and bar height from amplitude magnitude.
 */
export default function AmplitudeChart({ detail }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!detail || !svgRef.current) return

    const { statevector, basis_labels } = detail

    // Data prep
    const data = basis_labels.map((label, i) => {
      const { re, im } = statevector[i]
      const mag = Math.sqrt(re * re + im * im)
      const phase = Math.atan2(im, re) // -π to π
      const phaseDeg = (phase * 180) / Math.PI
      const prob = re * re + im * im
      return { label, re, im, mag, phase, phaseDeg, prob }
    })

    // Dimensions
    const margin = { top: 20, right: 30, bottom: 60, left: 50 }
    const container = svgRef.current.parentElement
    const totalW = container.clientWidth || 600
    const totalH = 280
    const W = totalW - margin.left - margin.right
    const H = totalH - margin.top - margin.bottom

    // Clear old render
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', totalW)
      .attr('height', totalH)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, W])
      .padding(0.28)

    const y = d3.scaleLinear()
      .domain([0, 1.05])
      .range([H, 0])

    // Grid lines
    svg.selectAll('.grid-line')
      .data(y.ticks(5))
      .join('line')
      .attr('class', 'grid-line')
      .attr('x1', 0).attr('x2', W)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#1e2840')
      .attr('stroke-dasharray', '4,3')
      .attr('stroke-width', 0.8)

    // Phase color helper
    const phaseColor = (phase) => {
      const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360
      return `hsl(${hue.toFixed(1)}, 85%, 55%)`
    }

    // Bars (magnitude)
    const barW = x.bandwidth()

    svg.selectAll('.amp-bar')
      .data(data)
      .join('rect')
      .attr('class', 'amp-bar')
      .attr('x', d => x(d.label))
      .attr('y', H)
      .attr('width', barW)
      .attr('height', 0)
      .attr('rx', 5)
      .attr('fill', d => phaseColor(d.phase))
      .attr('opacity', 0.88)
      .transition().duration(700).ease(d3.easeCubicOut)
      .attr('y', d => y(d.mag))
      .attr('height', d => H - y(d.mag))

    // Phase arc at top of each bar
    svg.selectAll('.phase-arc-bg')
      .data(data)
      .join('circle')
      .attr('cx', d => x(d.label) + barW / 2)
      .attr('cy', d => y(d.mag) - 14)
      .attr('r', 8)
      .attr('fill', '#111620')
      .attr('stroke', '#1e2840')
      .attr('stroke-width', 1)
      .attr('opacity', d => d.mag > 0.03 ? 1 : 0)

    svg.selectAll('.phase-dot')
      .data(data)
      .join('circle')
      .attr('cx', d => {
        const ang = d.phase
        return x(d.label) + barW / 2 + Math.cos(ang) * 5
      })
      .attr('cy', d => {
        const ang = d.phase
        return y(d.mag) - 14 - Math.sin(ang) * 5
      })
      .attr('r', 2.5)
      .attr('fill', d => phaseColor(d.phase))
      .attr('opacity', d => d.mag > 0.03 ? 1 : 0)

    // Value labels on bar tops
    svg.selectAll('.bar-label')
      .data(data)
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', d => x(d.label) + barW / 2)
      .attr('y', d => y(d.mag) - 26)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.72rem')
      .attr('fill', '#8892aa')
      .attr('opacity', d => d.mag > 0.05 ? 1 : 0)
      .text(d => `${(d.prob * 100).toFixed(1)}%`)

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x).tickFormat(d => `|${d}⟩`))
      .call(g => {
        g.select('.domain').attr('stroke', '#1e2840')
        g.selectAll('text')
          .attr('fill', '#9f6ef5')
          .attr('font-family', "'JetBrains Mono', monospace")
          .attr('font-size', '0.78rem')
          .attr('dy', '1.2em')
        g.selectAll('.tick line').attr('stroke', '#1e2840')
      })

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d.toFixed(1)))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('text').attr('fill', '#8892aa').attr('font-size', '0.72rem')
        g.selectAll('.tick line').attr('stroke', '#1e2840')
      })

    // Tooltip
    const tooltip = d3.select('body')
      .selectAll('.d3-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'd3-tooltip')
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

    svg.selectAll('.amp-bar')
      .on('mouseover', (event, d) => {
        const hue = (((d.phase + Math.PI) / (2 * Math.PI)) * 360).toFixed(1)
        tooltip
          .style('opacity', 1)
          .html(`
            <div style="color:#9f6ef5;font-weight:700;margin-bottom:6px">|${d.label}⟩</div>
            <div>Re: <span style="color:#4f8ef7">${d.re.toFixed(4)}</span></div>
            <div>Im: <span style="color:#4f8ef7">${d.im.toFixed(4)}</span></div>
            <div>|amp|: <span style="color:#3ecf8e">${d.mag.toFixed(4)}</span></div>
            <div>Prob: <span style="color:#3ecf8e">${(d.prob * 100).toFixed(2)}%</span></div>
            <div>Phase: <span style="color:hsl(${hue},80%,60%)">${d.phaseDeg.toFixed(1)}°</span></div>
          `)
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', (event.clientX + 14) + 'px')
          .style('top', (event.clientY - 30) + 'px')
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))

    // Phase legend
    const lgW = 180, lgH = 12
    const lgX = W - lgW, lgY = -16
    const lgDefs = svg.append('defs')
    const lgGrad = lgDefs.append('linearGradient').attr('id', 'phase-legend-grad')
    for (let s = 0; s <= 10; s++) {
      lgGrad.append('stop')
        .attr('offset', `${s * 10}%`)
        .attr('stop-color', `hsl(${s * 36}, 85%, 55%)`)
    }
    svg.append('rect')
      .attr('x', lgX).attr('y', lgY)
      .attr('width', lgW).attr('height', lgH)
      .attr('rx', lgH / 2)
      .attr('fill', 'url(#phase-legend-grad)')
      .attr('opacity', 0.85)
    svg.append('text')
      .attr('x', lgX).attr('y', lgY - 4)
      .attr('fill', '#8892aa').attr('font-size', '0.68rem')
      .text('Phase: -π')
    svg.append('text')
      .attr('x', lgX + lgW).attr('y', lgY - 4)
      .attr('fill', '#8892aa').attr('font-size', '0.68rem')
      .attr('text-anchor', 'end')
      .text('+π')

  }, [detail])

  return (
    <div className="viz-chart-wrap">
      <p className="section-hint">Bar height = |amplitude| · Colour hue = quantum phase · Dot = phase direction</p>
      <svg ref={svgRef} style={{ width: '100%', overflow: 'visible' }} />
    </div>
  )
}
