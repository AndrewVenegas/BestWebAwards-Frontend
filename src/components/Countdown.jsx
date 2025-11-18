import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Fireworks from './Fireworks';
import './Countdown.css';

const Countdown = ({ onVotingClosed }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isOpen, setIsOpen] = useState(true);
  const [showFireworks, setShowFireworks] = useState(false);
  const hasTriggeredFireworks = useRef(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/config');
        const { votingDeadline, isOpen: votingIsOpen } = response.data;
        setIsOpen(votingIsOpen);
        
        const deadline = new Date(votingDeadline);
        const now = new Date();
        const difference = deadline - now;
        
        // Si las votaciones ya están cerradas al cargar la página, no disparar fuegos artificiales
        if (difference <= 0) {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, deadline });
          setIsOpen(false);
          hasTriggeredFireworks.current = true; // Marcar como ya disparado para evitar loops
          isInitialized.current = true;
          return; // No continuar con el temporizador si ya están cerradas
        }
        
        updateTimeLeft(deadline);
        isInitialized.current = true;
      } catch (error) {
        console.error('Error al obtener configuración:', error);
        isInitialized.current = true;
      }
    };

    fetchConfig();
    
    // Solo actualizar la configuración periódicamente (pero fetchConfig ya verifica si están cerradas)
    const interval = setInterval(() => {
      fetchConfig();
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Si las votaciones ya están cerradas o no hay deadline, no iniciar el temporizador
    if (!isOpen && timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
      return;
    }

    // Si no hay deadline, no iniciar el temporizador
    if (!timeLeft.deadline) {
      return;
    }

    const timer = setInterval(() => {
      updateTimeLeft(new Date(timeLeft.deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isOpen]);

  const updateTimeLeft = (deadline) => {
    const now = new Date();
    const difference = deadline - now;

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    // Detectar cuando llega al último segundo (segundos === 1) para disparar fuegos artificiales
    if (days === 0 && hours === 0 && minutes === 0 && seconds === 1 && !hasTriggeredFireworks.current) {
      hasTriggeredFireworks.current = true;
      // Esperar un segundo para que llegue a 0 y luego mostrar fuegos artificiales
      setTimeout(() => {
        setShowFireworks(true);
      }, 1000);
    }

    if (difference <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, deadline });
      setIsOpen(false);
      
      // Solo disparar fuegos artificiales si acabamos de llegar a 0 (no si ya estaban cerradas)
      // Verificamos que el segundo anterior era > 0 para asegurar que acabamos de llegar a 0
      if (!hasTriggeredFireworks.current && timeLeft && 
          (timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0)) {
        hasTriggeredFireworks.current = true;
        setShowFireworks(true);
      }
      return;
    }

    setTimeLeft({ days, hours, minutes, seconds, deadline });
  };

  // Manejar cuando terminan los fuegos artificiales - simplemente refrescar la página
  const handleFireworksComplete = () => {
    console.log('Fuegos artificiales completados, refrescando página...');
    // Esperar un momento antes de refrescar para que se vea el final de la animación
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <>
      {showFireworks && (
        <Fireworks 
          key="fireworks" 
          onComplete={handleFireworksComplete} 
        />
      )}
      {/* Siempre reservar el espacio del countdown */}
      <div className="countdown-container">
        {/* Cuando las votaciones están cerradas, no mostrar contenido (pero mantener el espacio) */}
        {!isOpen && timeLeft && timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0 && !showFireworks ? (
          <div className="countdown countdown-empty"></div>
        ) : !isInitialized.current ? (
          // Mientras carga, mostrar espacio vacío
          <div className="countdown countdown-empty"></div>
        ) : !showFireworks && timeLeft ? (
          <div className="countdown">
            <h3 className="countdown-title">Tiempo Restante para Votar</h3>
            <div className="countdown-grid">
              <div className="countdown-item">
                <div className="countdown-value">{timeLeft.days}</div>
                <div className="countdown-label">Días</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-value">{timeLeft.hours}</div>
                <div className="countdown-label">Horas</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-value">{timeLeft.minutes}</div>
                <div className="countdown-label">Minutos</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-value">{timeLeft.seconds}</div>
                <div className="countdown-label">Segundos</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="countdown countdown-empty"></div>
        )}
      </div>
    </>
  );
};

export default Countdown;

