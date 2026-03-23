import math

ALGORITHMS = [
    {
        "id": "deutsch_jozsa",
        "name": "Deutsch-Jozsa Algorithm",
        "description": "Determines if a hidden function is constant or balanced in a single query.",
        "num_qubits": 3,
        "gates": [
            # Init target
            {"gate": "x", "targets": [2], "controls": []},
            # Superposition
            {"gate": "h", "targets": [0], "controls": []},
            {"gate": "h", "targets": [1], "controls": []},
            {"gate": "h", "targets": [2], "controls": []},
            # Oracle (Balanced: f(x) = x0 XOR x1)
            {"gate": "cx", "targets": [2], "controls": [0]},
            {"gate": "cx", "targets": [2], "controls": [1]},
            # Interference
            {"gate": "h", "targets": [0], "controls": []},
            {"gate": "h", "targets": [1], "controls": []}
        ],
        "steps": [
            "We dedicate qubit 2 as the 'target' and apply an X gate to flip it to |1⟩.",
            "Apply a Hadamard (H) gate to input qubit 0 to create a superposition of paths.",
            "Apply H to input qubit 1. The inputs now hold all possible 2-bit values.",
            "Apply H to target qubit 2. Since it was |1⟩, it becomes the |-⟩ state, which enables 'phase kickback'.",
            "Oracle (Balanced func): CNOT from q0 to q2. If q0 is 1, phase kicks back.",
            "Oracle (Balanced func): CNOT from q1 to q2. The inputs' phases now encode the function's output.",
            "Interference: Apply final H to q0. The amplitudes recombine.",
            "Interference: Apply final H to q1. If function is balanced, measuring the inputs will yield a non-zero state (like |11⟩) with 100% probability!"
        ]
    },
    {
        "id": "grovers_search",
        "name": "Grover's Search",
        "description": "Finds a specific marked item in an unsorted database quadratically faster.",
        "num_qubits": 2,
        "gates": [
            # Superposition
            {"gate": "h", "targets": [0], "controls": []},
            {"gate": "h", "targets": [1], "controls": []},
            # Oracle (mark |11>)
            {"gate": "cz", "targets": [1], "controls": [0]},
            # Diffuser
            {"gate": "h", "targets": [0], "controls": []},
            {"gate": "h", "targets": [1], "controls": []},
            {"gate": "x", "targets": [0], "controls": []},
            {"gate": "x", "targets": [1], "controls": []},
            {"gate": "cz", "targets": [1], "controls": [0]},
            {"gate": "x", "targets": [0], "controls": []},
            {"gate": "x", "targets": [1], "controls": []},
            {"gate": "h", "targets": [0], "controls": []},
            {"gate": "h", "targets": [1], "controls": []}
        ],
        "steps": [
            "Apply H to q0. We are preparing an equal superposition of all 4 states (|00>, |01>, |10>, |11>).",
            "Apply H to q1. Notice the equal probabilities in the Amplitude chart.",
            "Oracle: Apply CZ to flip the phase of the marked state (|11>). The amplitude for |11> points downward now.",
            "Diffuser step 1: H on q0. We begin 'inversion about the mean'.",
            "Diffuser step 1: H on q1.",
            "Diffuser step 2: X on q0.",
            "Diffuser step 2: X on q1.",
            "Diffuser step 3: CZ to flip the phase of |00>.",
            "Diffuser step 4: X on q0.",
            "Diffuser step 4: X on q1.",
            "Diffuser step 5: Final H on q0.",
            "Diffuser step 5: Final H on q1. The amplitude of |11> has been amplified to 100%!"
        ]
    },
    {
        "id": "bernstein_vazirani",
        "name": "Bernstein-Vazirani",
        "description": "Finds a secret binary string s in exactly one query.",
        "num_qubits": 4,
        "gates": [
            # Init target
            {"gate": "x", "targets": [3], "controls": []},
            # Superposition
            {"gate": "h", "targets": [0], "controls": []},
            {"gate": "h", "targets": [1], "controls": []},
            {"gate": "h", "targets": [2], "controls": []},
            {"gate": "h", "targets": [3], "controls": []},
            # Oracle for s = 101 (q0 and q2)
            {"gate": "cx", "targets": [3], "controls": [0]},
            {"gate": "cx", "targets": [3], "controls": [2]},
            # Interference
            {"gate": "h", "targets": [0], "controls": []},
            {"gate": "h", "targets": [1], "controls": []},
            {"gate": "h", "targets": [2], "controls": []}
        ],
        "steps": [
            "We dedicate q3 as the target. Apply X to flip it to |1⟩.",
            "Apply H to input q0.",
            "Apply H to input q1.",
            "Apply H to input q2.",
            "Apply H to target q3 to create the |-⟩ state for phase kickback.",
            "Oracle: The secret string is s='101'. We CNOT from q0 (bit=1).",
            "Oracle: We CNOT from q2 (bit=1). The secret string phase is kicked back to the inputs.",
            "Interference: H on q0 correctly resolves the 1 bit.",
            "Interference: H on q1 correctly resolves the 0 bit.",
            "Interference: H on q2. Measurement now deterministically reveals '101'!"
        ]
    },
    {
        "id": "quantum_teleportation",
        "name": "Quantum Teleportation",
        "description": "Transmits a quantum state using entanglement and classical communication.",
        "num_qubits": 3,
        "gates": [
            # Prepare state |-> on q0 to teleport
            {"gate": "x", "targets": [0], "controls": []},
            {"gate": "h", "targets": [0], "controls": []},
            
            # Create Bell pair between Alice (q1) and Bob (q2)
            {"gate": "h", "targets": [1], "controls": []},
            {"gate": "cx", "targets": [2], "controls": [1]},
            
            # Alice measures her qubits in Bell Basis
            {"gate": "cx", "targets": [1], "controls": [0]},
            {"gate": "h", "targets": [0], "controls": []},
            
            # In simulation, we apply Bob's corrections via quantum control directly
            {"gate": "cx", "targets": [2], "controls": [1]},
            {"gate": "cz", "targets": [2], "controls": [0]}
        ],
        "steps": [
            "Prepare the state we want to teleport on q0. We apply X...",
            "...and then H. So Alice's mysterious state is |-⟩.",
            "Alice and Bob share an entangled Bell pair. We apply H to q1.",
            "Apply CNOT between q1 and q2. Bob takes q2 far away, Alice keeps q1.",
            "Alice entwines her unknown state (q0) with her half of the Bell pair (q1) via CNOT.",
            "Alice applies H to q0, completing her Bell-basis measurement preparation.",
            "Bob applies CNOT controlled by Alice's q1 measurement (simulated quantumly here).",
            "Bob applies CZ controlled by Alice's q0 measurement. Bob's q2 is now exactly |-⟩! Teleportation complete."
        ]
    },
    {
        "id": "qft",
        "name": "Quantum Fourier Transform",
        "description": "The quantum version of FFT — the engine powering Shor's algorithm.",
        "num_qubits": 3,
        "gates": [
            # Prepare state |100> (number 4)
            {"gate": "x", "targets": [2], "controls": []},
            
            # QFT operations
            {"gate": "h", "targets": [2], "controls": []},
            {"gate": "cp", "targets": [2], "controls": [1], "params": [math.pi / 2]},
            {"gate": "cp", "targets": [2], "controls": [0], "params": [math.pi / 4]},
            
            {"gate": "h", "targets": [1], "controls": []},
            {"gate": "cp", "targets": [1], "controls": [0], "params": [math.pi / 2]},
            
            {"gate": "h", "targets": [0], "controls": []},
            
            # Swap to reverse order
            {"gate": "swap", "targets": [0, 2], "controls": []}
        ],
        "steps": [
            "Let's prepare the input state |100> (the number 4 in binary).",
            "Apply H to q2. This creates an equal superposition in amplitude, but phase matters here.",
            "Apply a Controlled-Phase (90°) from q1 to q2 to encode amplitude into relative phase.",
            "Apply a Controlled-Phase (45°) from q0 to q2.",
            "Move to the next qubit. Apply H to q1.",
            "Apply a Controlled-Phase (90°) from q0 to q1.",
            "Apply H to the final qubit (q0).",
            "Swap q0 and q2 to reverse the output order. The QFT converts computational basis states into states wrapped around the Z-axis of the Bloch sphere at different frequencies!"
        ]
    }
]
