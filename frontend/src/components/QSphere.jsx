import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'

/** Hamming weight = number of 1s in binary string */
function hammingWeight(str) {
  return str.split('').filter(c => c === '1').length
}

/** Convert basis index to spherical coords on Q-sphere.
 *  Latitude = (π - θ) maps hamming weight to polar angle.
 *  Longitude spread around each latitude band.
 */
function basisToSpherical(label, n) {
  const hw = hammingWeight(label)
  const theta = Math.PI * (1 - hw / n)  // 0 (|11..1⟩) to π (|00..0⟩)

  const binaryVal = parseInt(label, 2)
  // Simple even spread: use index within the band
  const phi = (binaryVal / Math.pow(2, n)) * 2 * Math.PI * 2.4  // golden spread

  return { theta, phi }
}

function sphericalToCart(theta, phi, r = 1) {
  return new THREE.Vector3(
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi)
  )
}

// ── QSphere meridians ────────────────────────
function QSphereGrid() {
  const lines = useMemo(() => {
    const segs = []
    const N = 64
    // 4 great circles
    for (let lon = 0; lon < 180; lon += 45) {
      const phi = (lon * Math.PI) / 180
      const pts = []
      for (let i = 0; i <= N; i++) {
        const theta = (i / N) * Math.PI
        pts.push(sphericalToCart(theta, phi))
      }
      segs.push(pts)
    }
    // Equator
    const eq = []
    for (let i = 0; i <= N; i++) {
      const phi = (i / N) * 2 * Math.PI
      eq.push(new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi)))
    }
    segs.push(eq)
    return segs
  }, [])

  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#1a2236" lineWidth={0.8} transparent opacity={0.5} />
      ))}
    </>
  )
}

// ── A single basis state dot on the sphere ───
function StatePoint({ label, amp, n }) {
  const { theta, phi } = basisToSpherical(label, n)
  const pos = sphericalToCart(theta, phi, 0.98)
  const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im)
  const phaseDeg = Math.atan2(amp.im, amp.re)
  const hue = (((phaseDeg + Math.PI) / (2 * Math.PI)) * 360).toFixed(0)
  const dotSize = Math.max(0.025, mag * 0.22)
  const color = new THREE.Color(`hsl(${hue}, 90%, 55%)`)

  if (mag < 0.005) return null  // Skip zero-amplitude states

  return (
    <group position={pos.toArray()}>
      {/* Glow sphere */}
      <mesh>
        <sphereGeometry args={[dotSize * 1.8, 16, 16]} />
        <meshStandardMaterial
          color={color} transparent opacity={0.15}
          emissive={color} emissiveIntensity={0.3}
        />
      </mesh>
      {/* Main dot */}
      <mesh>
        <sphereGeometry args={[dotSize, 16, 16]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Label */}
      <Text
        position={[pos.x * 0.12, pos.y * 0.12 + dotSize + 0.06, pos.z * 0.12]}
        fontSize={0.08}
        color="#8892aa"
        anchorX="center"
      >
        |{label}⟩
      </Text>
    </group>
  )
}

// ── Connecting arcs between same-Hamming states ──
function HammingArcs({ detail }) {
  const { statevector, basis_labels } = detail
  const n = detail.qubits

  const lines = useMemo(() => {
    const arcs = []
    const active = basis_labels.filter((lbl, i) => {
      const { re, im } = statevector[i]
      return Math.sqrt(re * re + im * im) > 0.02
    })

    // Connect pairs with same Hamming weight
    for (let a = 0; a < active.length; a++) {
      for (let b = a + 1; b < active.length; b++) {
        if (hammingWeight(active[a]) === hammingWeight(active[b])) {
          const pA = sphericalToCart(...Object.values(basisToSpherical(active[a], n)))
          const pB = sphericalToCart(...Object.values(basisToSpherical(active[b], n)))
          const mid = pA.clone().add(pB).multiplyScalar(0.5).normalize().multiplyScalar(0.6)
          const pts = []
          for (let t = 0; t <= 20; t++) {
            const u = t / 20
            pts.push(
              pA.clone().multiplyScalar((1 - u) ** 2)
                .add(mid.clone().multiplyScalar(2 * u * (1 - u)))
                .add(pB.clone().multiplyScalar(u ** 2))
            )
          }
          arcs.push(pts)
        }
      }
    }
    return arcs
  }, [basis_labels, statevector, n])

  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#2a3a5e" lineWidth={1.2} transparent opacity={0.6} dashed dashSize={0.05} gapSize={0.03} />
      ))}
    </>
  )
}

// ── Q-Sphere scene ───────────────────────────
function QSphereScene({ detail }) {
  const groupRef = useRef()
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25
  })

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[3, 3, 3]} intensity={1.5} />
      <pointLight position={[-3, -2, -3]} intensity={0.4} color="#4f8ef7" />

      {/* Translucent shell */}
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color="#030812" transparent opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={groupRef}>
        <QSphereGrid />
        <HammingArcs detail={detail} />

        {detail.basis_labels.map((lbl, i) => (
          <StatePoint
            key={lbl}
            label={lbl}
            amp={detail.statevector[i]}
            phase={detail.statevector[i]}
            n={detail.qubits}
          />
        ))}
      </group>

      {/* Pole labels (static) */}
      <Text position={[0, 1.22, 0]} fontSize={0.1} color="#8892aa" anchorX="center">|{'1'.repeat(detail.qubits)}⟩</Text>
      <Text position={[0, -1.22, 0]} fontSize={0.1} color="#8892aa" anchorX="center">|{'0'.repeat(detail.qubits)}⟩</Text>

      <OrbitControls enablePan={false} />
    </>
  )
}

// ── Exported Component ───────────────────────
export default function QSphere({ detail }) {
  if (!detail) return <div className="viz-empty">Select a state to view the Q-Sphere</div>

  return (
    <div className="viz-chart-wrap">
      <p className="section-hint">
        Latitude = Hamming weight · Dot size = |amplitude| · Dot hue = phase · Dashed arcs connect same-weight states
      </p>
      <div style={{ width: '100%', height: '420px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e2840' }}>
        <Canvas camera={{ position: [2.2, 1.0, 2.2], fov: 42 }}>
          <QSphereScene detail={detail} />
        </Canvas>
      </div>
    </div>
  )
}
