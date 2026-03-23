import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import _build_circuit, GateOp, _full_circuit_response
from algorithms_data import ALGORITHMS

print("Starting verification...")
for algo in ALGORITHMS:
    gates = [GateOp(**g) for g in algo['gates']]
    try:
        qc = _build_circuit(algo['num_qubits'], gates)
        res = _full_circuit_response(qc, algo['num_qubits'])
        print(f"OK: {algo['name']} generated {algo['num_qubits']} qubits, state size {len(res['statevector'])}")
    except Exception as e:
        print(f"FAILED: {algo['name']} with error: {e}")
        sys.exit(1)
print("All algorithms verified successfully!")
