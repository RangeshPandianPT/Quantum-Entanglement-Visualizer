import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './AIAssistant.css';

export default function AIAssistant({ circuit, numQubits, currentStateDetails }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your Quantum AI Assistant powered by Claude. Ask me how to entangle qubits, decipher a state, or fix errors in your circuit!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      // Build context
      let stateInfo = "Unknown State";
      if (currentStateDetails && currentStateDetails.amplitudes) {
        // Find states with high probability
        const amps = currentStateDetails.amplitudes;
        const topStates = Object.keys(amps).filter(k => (amps[k].magnitude ** 2) > 0.05);
        stateInfo = `Top states: ${topStates.join(', ')}`;
      }

      const res = await axios.post('/api/assistant', {
        query: userMsg,
        circuit: circuit || [],
        num_qubits: numQubits || 2,
        state_info: stateInfo
      });

      setMessages(prev => [...prev, { role: 'assistant', text: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I had trouble communicating with my neural processors! Please check the backend connection." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ai-assistant ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button className="ai-launcher" onClick={() => setIsOpen(true)}>
          🤖 Ask AI Assistant
        </button>
      )}
      
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-header">
            <h3>🤖 Claude Quantum Assistant</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ${msg.role}`}>
                <div className="ai-bubble">{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className="ai-msg assistant typing">
                <div className="ai-bubble">Thinking... ✵</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-input-area">
            <input 
              type="text" 
              placeholder="E.g., How do I create a Bell state?" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={loading}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
