import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

/**
 * Entanglement Graph — D3 force-directed graph.
 * Nodes = qubits, Edges = pairwise entanglement entropy (normalised weight).
 */
export default function EntanglementGraph({ graphData, loading }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!graphData || !svgRef.current) return

    const { nodes: rawNodes, edges: rawEdges } = graphData
    const nodes = rawNodes.map(n => ({ ...n })) // mutable copies for D3
    const links = rawEdges.map(e => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      entropy: e.entropy,
    }))

    const container = svgRef.current.parentElement
    const W = container.clientWidth || 520
    const H = 320

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H)

    // Defs: arrowhead marker + glow filter
    const defs = svg.append('defs')

    defs.append('filter').attr('id', 'node-glow')
      .append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur')

    const feMerge = defs.select('filter').append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'blur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Background
    svg.append('rect').attr('width', W).attr('height', H)
      .attr('fill', '#0a0d14').attr('rx', 12)

    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(130).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(50))

    // Edge thickness & color scaled by weight
    const linkThick = d3.scaleLinear().domain([0, 1]).range([1, 8])
    const linkColor = (w) => {
      if (w < 0.01) return '#1e2840'
      const hue = 200 + w * 60  // blue→purple as entanglement grows
      return `hsl(${hue.toFixed(0)}, 80%, ${30 + w * 35}%)`
    }

    // Links
    const linkG = svg.append('g').attr('class', 'links')
    const linkEl = linkG.selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => linkColor(d.weight))
      .attr('stroke-width', d => linkThick(d.weight))
      .attr('stroke-linecap', 'round')
      .attr('opacity', d => d.weight < 0.01 ? 0.2 : 0.85)

    // Edge weight labels
    const linkLabel = svg.selectAll('.edge-label')
      .data(links)
      .join('text')
      .attr('class', 'edge-label')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '0.68rem')
      .attr('fill', '#8892aa')
      .attr('opacity', d => d.weight > 0.05 ? 1 : 0)
      .text(d => d.entropy.toFixed(3) + ' S')

    // Nodes
    const nodeG = svg.append('g').attr('class', 'nodes')
    const nodeEl = nodeG.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node-grp')
      .call(d3.drag()
        .on('start', (evt, d) => {
          if (!evt.active) sim.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (evt, d) => { d.fx = evt.x; d.fy = evt.y })
        .on('end', (evt, d) => {
          if (!evt.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )

    // Glow outer ring (entangled nodes)
    nodeEl.append('circle')
      .attr('r', d => d.is_entangled ? 34 : 26)
      .attr('fill', 'none')
      .attr('stroke', d => d.is_entangled ? '#4f8ef7' : '#1e2840')
      .attr('stroke-width', d => d.is_entangled ? 1.5 : 0.6)
      .attr('opacity', 0.4)
      .attr('filter', d => d.is_entangled ? 'url(#node-glow)' : null)

    // Main circle
    nodeEl.append('circle')
      .attr('r', 24)
      .attr('fill', d => d.is_entangled ? '#111f3a' : '#111620')
      .attr('stroke', d => d.is_entangled ? '#4f8ef7' : '#8892aa')
      .attr('stroke-width', 2)

    // Node label
    nodeEl.append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '0.85rem').attr('font-weight', '700')
      .attr('fill', d => d.is_entangled ? '#4f8ef7' : '#8892aa')
      .text(d => d.label)

    // Purity ring arc
    nodeEl.append('path')
      .attr('fill', 'none')
      .attr('stroke', d => d.is_entangled ? '#9f6ef5' : '#3ecf8e')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('d', d => {
        const r = 28
        const angle = (1 - d.purity) * Math.PI * 2 * 0.9  // arc length = impurity
        if (angle < 0.01) return ''
        const x1 = r * Math.cos(-Math.PI / 2)
        const y1 = r * Math.sin(-Math.PI / 2)
        const x2 = r * Math.cos(-Math.PI / 2 + angle)
        const y2 = r * Math.sin(-Math.PI / 2 + angle)
        const large = angle > Math.PI ? 1 : 0
        return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
      })

    // Purity tooltip text below node
    nodeEl.append('text')
      .attr('text-anchor', 'middle').attr('dy', '2.8em')
      .attr('font-size', '0.6rem')
      .attr('fill', '#8892aa')
      .text(d => `p=${d.purity.toFixed(2)}`)

    // Legend
    svg.append('text')
      .attr('x', 12).attr('y', H - 32)
      .attr('fill', '#4f8ef7').attr('font-size', '0.68rem')
      .attr('font-family', "'JetBrains Mono', monospace")
      .text('● Entangled node')
    svg.append('text')
      .attr('x', 12).attr('y', H - 16)
      .attr('fill', '#8892aa').attr('font-size', '0.68rem')
      .attr('font-family', "'JetBrains Mono', monospace")
      .text('Arc = impurity (1 - purity) · Edge = S entropy')

    // Tick
    sim.on('tick', () => {
      linkEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 8)
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [graphData])

  if (loading) return <div className="viz-loading">Computing entanglement graph…</div>
  if (!graphData) return <div className="viz-empty">Select a state to view the entanglement graph</div>

  return (
    <div className="viz-chart-wrap">
      <p className="section-hint">Nodes = qubits · Edge thickness & color = entanglement entropy (bits) · Arc = impurity · Drag nodes to explore</p>
      <svg ref={svgRef} style={{ width: '100%', borderRadius: '12px', border: '1px solid #1e2840' }} />
    </div>
  )
}
