from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Quantum State Visualizer API")

# Setup CORS to allow React frontend (default running on 5173 or others)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Quantum State Visualizer API is running."}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/quantum-states")
def get_quantum_states():
    # Placeholder for the actual quantum state calculations (Bell, GHZ, W)
    return {
        "states": [
            {"id": "bell", "name": "Bell State", "qubits": 2},
            {"id": "ghz", "name": "GHZ State", "qubits": 3},
            {"id": "w", "name": "W State", "qubits": 3}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.1", port=8000, reload=True)
