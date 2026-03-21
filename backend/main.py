from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from qiskit.quantum_info import Statevector, DensityMatrix, partial_trace, entropy, SparsePauliOp
from qiskit import QuantumCircuit
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

app = FastAPI(title="Quantum Entanglement Visualizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Pydantic models for circuit builder
# ──────────────────────────────────────────────
class GateOp(BaseModel):
    gate: str                          # h, x, y, z, cx, cz, swap, ccx
    targets: List[int]                 # target qubit(s)
    controls: Optional[List[int]] = [] # control qubit(s) for multi-qubit gates

class CircuitRequest(BaseModel):
    num_qubits: int                    # 2-4
    gates: List[GateOp]

class CircuitStepRequest(CircuitRequest):
    step: int                          # apply gates[0..step] inclusive

# ──────────────────────────────────────────────
# Helper: convert complex numpy array to a JSON-safe list
# ──────────────────────────────────────────────
def to_serializable(arr):
    return [{"re": float(np.real(v)), "im": float(np.imag(v))} for v in arr]

def matrix_to_serializable(mat):
    return [[{"re": float(np.real(v)), "im": float(np.imag(v))} for v in row] for row in mat]

# ──────────────────────────────────────────────
# Build quantum state circuits
# ──────────────────────────────────────────────
def build_bell_state_phi_plus() -> Statevector:
    """Bell state |Φ+⟩ = (|00⟩ + |11⟩) / √2"""
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    return Statevector.from_instruction(qc)

def build_bell_state_phi_minus() -> Statevector:
    """Bell state |Φ-⟩ = (|00⟩ - |11⟩) / √2"""
    qc = QuantumCircuit(2)
    qc.x(0)
    qc.h(0)
    qc.cx(0, 1)
    return Statevector.from_instruction(qc)

def build_bell_state_psi_plus() -> Statevector:
    """Bell state |Ψ+⟩ = (|01⟩ + |10⟩) / √2"""
    qc = QuantumCircuit(2)
    qc.x(1)
    qc.h(0)
    qc.cx(0, 1)
    return Statevector.from_instruction(qc)

def build_bell_state_psi_minus() -> Statevector:
    """Bell state |Ψ-⟩ = (|01⟩ - |10⟩) / √2"""
    qc = QuantumCircuit(2)
    qc.x(0)
    qc.x(1)
    qc.h(0)
    qc.cx(0, 1)
    return Statevector.from_instruction(qc)

def build_ghz_state() -> Statevector:
    """GHZ state = (|000⟩ + |111⟩) / √2  (3 qubits)"""
    qc = QuantumCircuit(3)
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(0, 2)
    return Statevector.from_instruction(qc)

def build_w_state() -> Statevector:
    """W state = (|001⟩ + |010⟩ + |100⟩) / √3  (3 qubits)"""
    w_vec = np.zeros(8, dtype=complex)
    w_vec[1] = 1 / np.sqrt(3)   # |001⟩
    w_vec[2] = 1 / np.sqrt(3)   # |010⟩
    w_vec[4] = 1 / np.sqrt(3)   # |100⟩
    return Statevector(w_vec)

# ──────────────────────────────────────────────
# State builder registry
# ──────────────────────────────────────────────
STATE_BUILDERS = {
    "bell_phi_plus":  (build_bell_state_phi_plus,  "Bell State |Φ+⟩", 2),
    "bell_phi_minus": (build_bell_state_phi_minus, "Bell State |Φ-⟩", 2),
    "bell_psi_plus":  (build_bell_state_psi_plus,  "Bell State |Ψ+⟩", 2),
    "bell_psi_minus": (build_bell_state_psi_minus, "Bell State |Ψ-⟩", 2),
    "ghz":            (build_ghz_state,            "GHZ State", 3),
    "w":              (build_w_state,              "W State", 3),
}

def get_sv(state_id: str):
    if state_id not in STATE_BUILDERS:
        raise HTTPException(status_code=404, detail=f"State '{state_id}' not found")
    builder, name, qubits = STATE_BUILDERS[state_id]
    return builder(), name, qubits

# ──────────────────────────────────────────────
# Bloch vector helpers
# ──────────────────────────────────────────────
def bloch_vector_from_dm(dm_2x2: np.ndarray) -> dict:
    """Extract Bloch sphere (x,y,z) coords from a single-qubit 2x2 density matrix."""
    # σx = [[0,1],[1,0]]  σy = [[0,-i],[i,0]]  σz = [[1,0],[0,-1]]
    x = float(2 * np.real(dm_2x2[0,1]))
    y = float(2 * np.imag(dm_2x2[1,0]))
    z = float(np.real(dm_2x2[0,0] - dm_2x2[1,1]))
    return {"x": x, "y": y, "z": z}

# ──────────────────────────────────────────────
# Pairwise entanglement (Von Neumann entropy of reduced DM)
# ──────────────────────────────────────────────
def pairwise_entropy(sv: Statevector, n_qubits: int, qi: int, qj: int) -> float:
    """Von Neumann entropy of the two-qubit subsystem (qi, qj)."""
    all_qubits = list(range(n_qubits))
    keep = [qi, qj]
    trace_out = [q for q in all_qubits if q not in keep]
    if not trace_out:
        return float(entropy(DensityMatrix(sv), base=2))
    rdm = partial_trace(sv, trace_out)
    return float(entropy(rdm, base=2))

# ──────────────────────────────────────────────
# Health / Root
# ──────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "Quantum Entanglement Visualizer API is running."}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "framework": "Qiskit"}

# ──────────────────────────────────────────────
# Quantum State Catalogue
# ──────────────────────────────────────────────
@app.get("/api/quantum-states")
def get_quantum_states():
    """List of supported quantum states with metadata."""
    return {
        "states": [
            {
                "id": "bell_phi_plus",
                "name": "Bell State |Φ+⟩",
                "qubits": 2,
                "description": "Maximally entangled 2-qubit state (correlated): (|00⟩ + |11⟩) / √2",
                "formula": "(|00⟩ + |11⟩) / √2"
            },
            {
                "id": "bell_phi_minus",
                "name": "Bell State |Φ-⟩",
                "qubits": 2,
                "description": "Maximally entangled 2-qubit state (anti-correlated phase): (|00⟩ - |11⟩) / √2",
                "formula": "(|00⟩ - |11⟩) / √2"
            },
            {
                "id": "bell_psi_plus",
                "name": "Bell State |Ψ+⟩",
                "qubits": 2,
                "description": "Maximally entangled 2-qubit state (anti-correlated): (|01⟩ + |10⟩) / √2",
                "formula": "(|01⟩ + |10⟩) / √2"
            },
            {
                "id": "bell_psi_minus",
                "name": "Bell State |Ψ-⟩",
                "qubits": 2,
                "description": "Maximally entangled 2-qubit state (singlet): (|01⟩ - |10⟩) / √2",
                "formula": "(|01⟩ - |10⟩) / √2"
            },
            {
                "id": "ghz",
                "name": "GHZ State",
                "qubits": 3,
                "description": "Greenberger–Horne–Zeilinger state: (|000⟩ + |111⟩) / √2",
                "formula": "(|000⟩ + |111⟩) / √2"
            },
            {
                "id": "w",
                "name": "W State",
                "qubits": 3,
                "description": "W entangled state: (|001⟩ + |010⟩ + |100⟩) / √3",
                "formula": "(|001⟩ + |010⟩ + |100⟩) / √3"
            }
        ]
    }

# ──────────────────────────────────────────────
# Individual State Endpoints
# ──────────────────────────────────────────────
def _state_response(name: str, qubits: int, sv: Statevector):
    dm = DensityMatrix(sv)
    probs = sv.probabilities_dict()
    
    trace_sys = [0] if qubits == 2 else [0, 1]
    reduced_dm = partial_trace(sv, trace_sys)
    entanglement_entropy = float(entropy(reduced_dm, base=2))

    return {
        "name": name,
        "qubits": qubits,
        "statevector": to_serializable(sv.data),
        "basis_labels": [format(i, f"0{qubits}b") for i in range(2**qubits)],
        "probabilities": {k: float(v) for k, v in probs.items()},
        "density_matrix": matrix_to_serializable(dm.data),
        "entanglement_entropy": entanglement_entropy
    }

@app.get("/api/state/{state_id}")
def get_state(state_id: str):
    sv, name, qubits = get_sv(state_id)
    return _state_response(name, qubits, sv)

# ──────────────────────────────────────────────
# NEW: Bloch Vectors endpoint
# ──────────────────────────────────────────────
@app.get("/api/state/{state_id}/bloch")
def get_bloch_vectors(state_id: str):
    """
    Returns Bloch sphere vector (x,y,z) for each qubit in the state.
    Each qubit's reduced density matrix is used to extract the Bloch coordinates.
    """
    sv, name, qubits = get_sv(state_id)
    bloch_vectors = []
    all_qubits = list(range(qubits))

    for qi in range(qubits):
        # Trace out all OTHER qubits to get the single-qubit reduced DM
        trace_out = [q for q in all_qubits if q != qi]
        if trace_out:
            rdm = partial_trace(sv, trace_out)
        else:
            rdm = DensityMatrix(sv)
        
        dm_2x2 = np.array(rdm.data, dtype=complex)
        bvec = bloch_vector_from_dm(dm_2x2)
        
        # Compute local purity: Tr(ρ²)
        purity = float(np.real(np.trace(dm_2x2 @ dm_2x2)))
        bvec["purity"] = purity
        bvec["qubit"] = qi
        bvec["label"] = f"Q{qi}"
        bloch_vectors.append(bvec)

    return {
        "state_id": state_id,
        "name": name,
        "qubits": qubits,
        "bloch_vectors": bloch_vectors
    }

# ──────────────────────────────────────────────
# NEW: Entanglement Graph endpoint
# ──────────────────────────────────────────────
@app.get("/api/state/{state_id}/entanglement-graph")
def get_entanglement_graph(state_id: str):
    """
    Returns qubit nodes and pairwise entanglement edges.
    Edge weight = Von Neumann entropy of the two-qubit subsystem (normalised 0-1).
    """
    sv, name, qubits = get_sv(state_id)
    all_qubits = list(range(qubits))

    # Build nodes with local purity
    nodes = []
    for qi in all_qubits:
        trace_out = [q for q in all_qubits if q != qi]
        rdm = partial_trace(sv, trace_out)
        dm_2x2 = np.array(rdm.data, dtype=complex)
        purity = float(np.real(np.trace(dm_2x2 @ dm_2x2)))
        nodes.append({
            "id": qi,
            "label": f"Q{qi}",
            "purity": purity,
            # Mixed qubits (purity < 1) indicate entanglement
            "is_entangled": purity < 0.999
        })

    # Build edges with pairwise entanglement entropy
    edges = []
    for i in range(qubits):
        for j in range(i + 1, qubits):
            ent = pairwise_entropy(sv, qubits, i, j)
            # Normalize: max entropy for 2 qubits is 2 bits
            weight = min(ent / 2.0, 1.0)
            edges.append({
                "source": i,
                "target": j,
                "entropy": ent,
                "weight": weight
            })

    return {
        "state_id": state_id,
        "name": name,
        "qubits": qubits,
        "nodes": nodes,
        "edges": edges
    }

# ──────────────────────────────────────────────
# Circuit Builder — gate application helper
# ──────────────────────────────────────────────
SUPPORTED_GATES = {"h", "x", "y", "z", "cx", "cz", "swap", "ccx"}

def _build_circuit(num_qubits: int, gates: List[GateOp], max_gates: int = None):
    """Build a QuantumCircuit from a list of gate operations.
       If max_gates is set, only apply gates[0..max_gates-1]."""
    if num_qubits < 1 or num_qubits > 8:
        raise HTTPException(400, "num_qubits must be between 1 and 8")
    
    qc = QuantumCircuit(num_qubits)
    gate_list = gates[:max_gates] if max_gates is not None else gates

    for g in gate_list:
        name = g.gate.lower()
        if name not in SUPPORTED_GATES:
            raise HTTPException(400, f"Unsupported gate: {g.gate}")
        
        targets = g.targets
        controls = g.controls or []

        if name == "h":
            qc.h(targets[0])
        elif name == "x":
            qc.x(targets[0])
        elif name == "y":
            qc.y(targets[0])
        elif name == "z":
            qc.z(targets[0])
        elif name == "cx":
            ctrl = controls[0] if controls else targets[0]
            tgt  = targets[1]  if len(targets) > 1 else targets[0]
            if controls:
                tgt = targets[0]
            qc.cx(ctrl, tgt)
        elif name == "cz":
            ctrl = controls[0] if controls else targets[0]
            tgt  = targets[1]  if len(targets) > 1 else targets[0]
            if controls:
                tgt = targets[0]
            qc.cz(ctrl, tgt)
        elif name == "swap":
            if len(targets) >= 2:
                qc.swap(targets[0], targets[1])
            else:
                raise HTTPException(400, "SWAP requires two target qubits")
        elif name == "ccx":
            ctrls = controls if len(controls) >= 2 else targets[:2]
            tgt = targets[0] if controls else targets[2] if len(targets) > 2 else targets[-1]
            if len(controls) >= 2:
                tgt = targets[0]
            qc.ccx(ctrls[0], ctrls[1], tgt)

    return qc


def _full_circuit_response(qc: QuantumCircuit, num_qubits: int, step: int = None, total_gates: int = None):
    """Compute full visualization payload from a QuantumCircuit."""
    sv = Statevector.from_instruction(qc)
    dm = DensityMatrix(sv)
    probs = sv.probabilities_dict()

    trace_sys = list(range(num_qubits - 1))  # trace out all but last qubit
    if len(trace_sys) == 0:
        trace_sys = [0]
    reduced_dm = partial_trace(sv, trace_sys)
    entanglement_entropy = float(entropy(reduced_dm, base=2))

    # Bloch vectors for each qubit
    all_qubits = list(range(num_qubits))
    bloch_vectors = []
    for qi in all_qubits:
        trace_out = [q for q in all_qubits if q != qi]
        if trace_out:
            rdm = partial_trace(sv, trace_out)
        else:
            rdm = DensityMatrix(sv)
        dm_2x2 = np.array(rdm.data, dtype=complex)
        bvec = bloch_vector_from_dm(dm_2x2)
        purity = float(np.real(np.trace(dm_2x2 @ dm_2x2)))
        bvec["purity"] = purity
        bvec["qubit"] = qi
        bvec["label"] = f"Q{qi}"
        bloch_vectors.append(bvec)

    # Entanglement graph
    nodes = []
    for qi in all_qubits:
        trace_out = [q for q in all_qubits if q != qi]
        rdm = partial_trace(sv, trace_out)
        dm_2x2 = np.array(rdm.data, dtype=complex)
        purity = float(np.real(np.trace(dm_2x2 @ dm_2x2)))
        nodes.append({
            "id": qi, "label": f"Q{qi}",
            "purity": purity, "is_entangled": purity < 0.999
        })

    edges = []
    for i in range(num_qubits):
        for j in range(i + 1, num_qubits):
            ent = pairwise_entropy(sv, num_qubits, i, j)
            weight = min(ent / 2.0, 1.0)
            edges.append({
                "source": i, "target": j,
                "entropy": ent, "weight": weight
            })

    result = {
        "name": "Custom Circuit",
        "qubits": num_qubits,
        "statevector": to_serializable(sv.data),
        "basis_labels": [format(i, f"0{num_qubits}b") for i in range(2**num_qubits)],
        "probabilities": {k: float(v) for k, v in probs.items()},
        "density_matrix": matrix_to_serializable(dm.data),
        "entanglement_entropy": entanglement_entropy,
        "bloch_vectors": bloch_vectors,
        "entanglement_graph": {"nodes": nodes, "edges": edges},
    }
    if step is not None:
        result["step"] = step
    if total_gates is not None:
        result["total_gates"] = total_gates
    return result


# ──────────────────────────────────────────────
# Circuit Builder Endpoints
# ──────────────────────────────────────────────
@app.post("/api/circuit/run")
def run_circuit(req: CircuitRequest):
    """Build and run the full circuit, return complete visualization data."""
    qc = _build_circuit(req.num_qubits, req.gates)
    return _full_circuit_response(qc, req.num_qubits, total_gates=len(req.gates))


@app.post("/api/circuit/step")
def step_circuit(req: CircuitStepRequest):
    """Build circuit up to step N (inclusive), return state at that point."""
    if req.step < 0 or req.step >= len(req.gates):
        raise HTTPException(400, f"step must be between 0 and {len(req.gates) - 1}")
    qc = _build_circuit(req.num_qubits, req.gates, max_gates=req.step + 1)
    return _full_circuit_response(qc, req.num_qubits, step=req.step, total_gates=len(req.gates))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
