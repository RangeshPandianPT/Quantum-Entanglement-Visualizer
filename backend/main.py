from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from qiskit.quantum_info import Statevector, DensityMatrix, partial_trace, entropy, SparsePauliOp
from qiskit import QuantumCircuit
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
