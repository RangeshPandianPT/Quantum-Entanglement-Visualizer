import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

export default function BadgeToast({ badge, show, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show && badge) {
      setIsVisible(true);
      // Trigger confetti wow factor
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#8a2be2', '#ff00ff']
      });

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 400); // Wait for transition
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show, badge, onClose]);

  if (!show && !isVisible) return null;

  return (
    <div className={`badge-toast ${isVisible ? 'visible' : ''}`}>
      <div className="badge-toast-icon">🏆</div>
      <div className="badge-toast-content">
        <h4>Achievement Unlocked!</h4>
        <p className="badge-toast-name">{badge}</p>
      </div>
      <button className="badge-toast-close" onClick={() => setIsVisible(false)}>×</button>
    </div>
  );
}
