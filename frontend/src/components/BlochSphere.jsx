import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'

// ── Sphere wireframe grid ───────────────────
function SphereGrid() {
  const lines = useMemo(() => {
    const segments = []
    const N = 64

    // Latitude lines
    for (let lat = -75; lat <= 75; lat += 30) {
      const phi = (lat * Math.PI) / 180
      const points = []
      for (let i = 0; i <= N; i++) {
        const theta = (i / N) * 2 * Math.PI
        points.push(
          new THREE.Vector3(
            Math.cos(phi) * Math.cos(theta),
            Math.sin(phi),
            Math.cos(phi) * Math.sin(theta)
          )
        )
      }
      segments.push(points)
    }

    // Longitude lines
    for (let lon = 0; lon < 360; lon += 45) {
      const theta = (lon * Math.PI) / 180
      const points = []
      for (let i = 0; i <= N; i++) {
        const phi = (i / N) * Math.PI - Math.PI / 2
        points.push(
          new THREE.Vector3(
            Math.cos(phi) * Math.cos(theta),
            Math.sin(phi),
            Math.cos(phi) * Math.sin(theta)
          )
        )
      }
      segments.push(points)
    }
    return segments
  }, [])

  return (
    <>
      {lines.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#1e2840"
          lineWidth={0.6}
          transparent
          opacity={0.7}
        />
      ))}
    </>
  )
}

// ── Bloch Vector Arrow ───────────────────────
function BlochArrow({ x, y, z, phase }) {
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360
  const color = new THREE.Color(`hsl(${hue.toFixed(0)}, 90%, 55%)`)

  const tipPos = useMemo(() => new THREE.Vector3(x * 0.85, y * 0.85, z * 0.85), [x, y, z])

  return (
    <group>
      {/* Shaft */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), tipPos]}
        color={color}
        lineWidth={3}
      />
      {/* Arrowhead cone */}
      <mesh position={[x, y, z]}>
        <coneGeometry args={[0.06, 0.15, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {/* Glow sphere at origin */}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

// ── Pole labels ──────────────────────────────
function PoleLabels() {
  const labels = [
    { pos: [0, 1.22, 0], text: '|0⟩' },
    { pos: [0, -1.22, 0], text: '|1⟩' },
    { pos: [1.22, 0, 0], text: '|+⟩' },
    { pos: [-1.22, 0, 0], text: '|-⟩' },
    { pos: [0, 0, 1.22], text: '|i⟩' },
    { pos: [0, 0, -1.22], text: '|-i⟩' },
  ]
  return (
    <>
      {labels.map(({ pos, text }) => (
        <Text
          key={text}
          position={pos}
          fontSize={0.12}
          color="#8892aa"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4xD-IQ.woff2"
        >
          {text}
        </Text>
      ))}
    </>
  )
}

// ── Single Bloch Sphere Scene ────────────────
function SingleBlochScene({ blochVec }) {
  const { x, y, z } = blochVec
  const phase = Math.atan2(z, x)

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={1.2} />

      {/* Translucent outer sphere */}
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color="#0a1228"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      <SphereGrid />
      <PoleLabels />
      <BlochArrow x={x} y={y} z={z} phase={phase} />

      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.2} />
    </>
  )
}

// ── Individual sphere box ────────────────────
function BlochSphereBox({ blochVec }) {
  const hue = (((Math.atan2(blochVec.z, blochVec.x) + Math.PI) / (2 * Math.PI)) * 360).toFixed(0)
  const mag = Math.sqrt(blochVec.x ** 2 + blochVec.y ** 2 + blochVec.z ** 2).toFixed(3)

  return (
    <div className="bloch-sphere-box">
      <div className="bloch-sphere-label">{blochVec.label}</div>
      <div className="bloch-canvas-wrap">
        <Canvas camera={{ position: [1.8, 1.2, 1.8], fov: 45 }}>
          <SingleBlochScene blochVec={blochVec} />
        </Canvas>
      </div>
      <div className="bloch-stats">
        <span className="bloch-stat"><span>x</span>{blochVec.x.toFixed(3)}</span>
        <span className="bloch-stat"><span>y</span>{blochVec.y.toFixed(3)}</span>
        <span className="bloch-stat"><span>z</span>{blochVec.z.toFixed(3)}</span>
        <span className="bloch-stat purity" style={{ color: `hsl(${hue},80%,60%)` }}>
          <span>|r|</span>{mag}
        </span>
      </div>
      <div className="bloch-purity-bar">
        <div
          className="bloch-purity-fill"
          style={{
            width: `${parseFloat(mag) * 100}%`,
            background: `hsl(${hue}, 80%, 55%)`
          }}
        />
      </div>
    </div>
  )
}

// ── Exported Component ───────────────────────
export default function BlochSphere({ blochData, loading }) {
  if (loading) return <div className="viz-loading">Fetching Bloch vectors…</div>
  if (!blochData) return <div className="viz-empty">Select a state to view Bloch spheres</div>

  return (
    <div className="bloch-row">
      {blochData.bloch_vectors.map((bv) => (
        <BlochSphereBox key={bv.qubit} blochVec={bv} />
      ))}
    </div>
  )
}
