import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Fireworks.css';

const Fireworks = ({ onComplete }) => {
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  // Mantener la referencia más reciente de onComplete
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ffeaa7', '#fd79a8'];
    
    // Crear múltiples explosiones en diferentes posiciones
    const explosionPositions = [
      { top: '30%', left: '20%' },
      { top: '20%', left: '80%' },
      { top: '70%', left: '30%' },
      { top: '60%', left: '70%' },
      { top: '50%', left: '50%' }
    ];

    const allParticles = [];

    explosionPositions.forEach((pos, explosionIndex) => {
      const particleCount = 30;

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 1.5 + Math.random() * 2.5;
        const x = Math.cos(angle) * velocity;
        const y = Math.sin(angle) * velocity;
        const size = 3 + Math.random() * 5;
        const delay = explosionIndex * 0.2 + Math.random() * 0.3;
        
        particle.style.setProperty('--x', `${x * 80}px`);
        particle.style.setProperty('--y', `${y * 80}px`);
        particle.style.setProperty('--delay', `${delay}s`);
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = color;
        particle.style.left = pos.left;
        particle.style.top = pos.top;
        particle.style.transform = 'translate(-50%, -50%)';
        
        container.appendChild(particle);
        allParticles.push(particle);
      }
    });

    // Limpiar después de la animación - usar ref para evitar que se limpie antes de tiempo
    // Aumentar tiempo para que se vean bien los fuegos artificiales
    timeoutRef.current = setTimeout(() => {
      allParticles.forEach(particle => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });
      // Usar la referencia más reciente
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 5000); // 5 segundos para que se vean bien los fuegos artificiales

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      allParticles.forEach(particle => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });
    };
  }, []); // Sin dependencias para que solo se ejecute una vez

  return createPortal(
    <div className="fireworks-overlay" ref={containerRef}>
    </div>,
    document.body
  );
};

export default Fireworks;

