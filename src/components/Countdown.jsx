import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import consoleDebug from '../utils/debug';
import Fireworks from './Fireworks';
import './Countdown.css';

// Componente para el círculo con progreso circular
const CountdownCircle = ({ value, label, max, current }) => {
  // Calcular el porcentaje basado en el valor actual vs máximo
  const percentage = Math.min((current / max) * 100, 100);
  
  // Parámetros del círculo
  const centerX = 80;
  const centerY = 80;
  const outerRadius = 65; // Radio del círculo externo
  const innerRadius = 55; // Radio del círculo interno
  const strokeWidth = 3; // Grosor del borde (igual para ambos)
  
  // Calcular el stroke-dasharray y stroke-dashoffset para el relleno entre bordes
  // El relleno se vacía (queda blanco) a medida que pasa el tiempo
  // Usamos el radio medio para calcular la circunferencia del donut
  const midRadius = (outerRadius + innerRadius) / 2;
  const circumference = 2 * Math.PI * midRadius;
  const progress = (percentage / 100) * circumference;
  const dashOffset = circumference - progress;
  
  return (
    <div className="countdown-circle-item">
      <div className="countdown-circle-wrapper">
        <svg className="countdown-circle-svg" viewBox="0 0 160 160">
          {/* Borde externo fijo */}
          <circle
            cx={centerX}
            cy={centerY}
            r={outerRadius}
            fill="none"
            stroke="#667eea"
            strokeWidth={strokeWidth}
            className="countdown-circle-outer-border"
          />
          
          {/* Relleno entre bordes (donut) - se va vaciando */}
          <circle
            cx={centerX}
            cy={centerY}
            r={midRadius}
            fill="none"
            stroke="#667eea"
            strokeWidth={outerRadius - innerRadius}
            strokeLinecap="round"
            className="countdown-circle-fill"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
              transform: 'rotate(-90deg)',
              transformOrigin: `${centerX}px ${centerY}px`,
            }}
          />
          
          {/* Borde interno fijo */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
            fill="none"
            stroke="#667eea"
            strokeWidth={strokeWidth}
            className="countdown-circle-inner-border"
          />
        </svg>
        <div className="countdown-circle-content">
          <div className="countdown-value">{String(value).padStart(2, '0')}</div>
        </div>
      </div>
      <div className="countdown-label">{label.toUpperCase()}</div>
    </div>
  );
};

const Countdown = ({ onVotingClosed, onInitialized, onTimeUpdate, remainingVotes, canUserVote }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isOpen, setIsOpen] = useState(true);
  const [showFireworks, setShowFireworks] = useState(false);
  const hasTriggeredFireworks = useRef(false);
  const isInitialized = useRef(false);
  const hasNotifiedInitialized = useRef(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/config');
        const { votingDeadline, votingStartDate, isInDataLoadingPeriod, isOpen: votingIsOpen } = response.data;
        setIsOpen(votingIsOpen);
        
        // Si está en periodo de carga de datos, usar la fecha de inicio de votaciones
        // Si no, usar la fecha de cierre
        const targetDate = isInDataLoadingPeriod && votingStartDate 
          ? new Date(votingStartDate) 
          : new Date(votingDeadline);
        
        const now = new Date();
        const difference = targetDate - now;
        
        // Si ya pasó la fecha objetivo, no disparar fuegos artificiales
        if (difference <= 0) {
          const zeroTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, deadline: targetDate };
          setTimeLeft(zeroTimeLeft);
          setIsOpen(false);
          hasTriggeredFireworks.current = true; // Marcar como ya disparado para evitar loops
          isInitialized.current = true;
          if (onInitialized && !hasNotifiedInitialized.current) {
            hasNotifiedInitialized.current = true;
            onInitialized();
          }
          // Notificar al componente padre que el tiempo llegó a 0
          if (onTimeUpdate) {
            onTimeUpdate(zeroTimeLeft);
          }
          return; // No continuar con el temporizador si ya pasó la fecha
        }
        
        updateTimeLeft(targetDate);
        isInitialized.current = true;
        if (onInitialized && !hasNotifiedInitialized.current) {
          hasNotifiedInitialized.current = true;
          onInitialized();
        }
      } catch (error) {
        consoleDebug('Error al obtener configuración:', error);
        isInitialized.current = true;
        if (onInitialized && !hasNotifiedInitialized.current) {
          hasNotifiedInitialized.current = true;
          onInitialized();
        }
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
      const zeroTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, deadline };
      setTimeLeft(zeroTimeLeft);
      setIsOpen(false);
      
      // Notificar al componente padre que el tiempo llegó a 0
      if (onTimeUpdate) {
        onTimeUpdate(zeroTimeLeft);
      }
      
      // Solo disparar fuegos artificiales si acabamos de llegar a 0 (no si ya estaban cerradas)
      // Verificamos que el segundo anterior era > 0 para asegurar que acabamos de llegar a 0
      if (!hasTriggeredFireworks.current && timeLeft && 
          (timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0)) {
        hasTriggeredFireworks.current = true;
        setShowFireworks(true);
      }
      
      return;
    }

    const newTimeLeft = { days, hours, minutes, seconds, deadline };
    setTimeLeft(newTimeLeft);
    
    // Notificar al componente padre sobre el tiempo restante
    if (onTimeUpdate) {
      onTimeUpdate(newTimeLeft);
    }
  };

  // Manejar cuando terminan los fuegos artificiales - simplemente refrescar la página
  const handleFireworksComplete = () => {
    consoleDebug('Fuegos artificiales completados, refrescando página...');
    // Esperar un momento antes de refrescar para que se vea el final de la animación
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Si las votaciones están cerradas y ya se inicializó, no mostrar nada (ni siquiera el contenedor)
  const isHidden = isInitialized.current && !isOpen && timeLeft && timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0 && !showFireworks;
  
  if (isHidden) {
    return showFireworks ? (
      <Fireworks 
        key="fireworks" 
        onComplete={handleFireworksComplete} 
      />
    ) : null;
  }

  return (
    <>
      {showFireworks && (
        <Fireworks 
          key="fireworks" 
          onComplete={handleFireworksComplete} 
        />
      )}
      {/* Reservar el espacio del countdown solo cuando las votaciones están abiertas o están cargando */}
      {(!isInitialized.current || (isOpen && !showFireworks && timeLeft)) && (
        <div className="countdown-container">
          {!isInitialized.current ? (
            // Mientras carga, mostrar mensaje de carga
            <div className="countdown countdown-loading">
              <h3 className="countdown-title">Tiempo Restante para Votar</h3>
              <div className="countdown-loading-message">Cargando...</div>
            </div>
          ) : !showFireworks && timeLeft ? (
            <div className="countdown">
              <h3 className="countdown-title">
                {isOpen ? 'Tiempo Restante para Votar' : 'Las Votaciones Comenzarán en'}
              </h3>
              <div className="countdown-grid">
                <CountdownCircle
                  value={timeLeft.days}
                  label="Días"
                  max={Math.max(30, timeLeft.days + 1)}
                  current={timeLeft.days}
                />
                <CountdownCircle
                  value={timeLeft.hours}
                  label="Horas"
                  max={24}
                  current={timeLeft.hours}
                />
                <CountdownCircle
                  value={timeLeft.minutes}
                  label="Minutos"
                  max={60}
                  current={timeLeft.minutes}
                />
                <CountdownCircle
                  value={timeLeft.seconds}
                  label="Segundos"
                  max={60}
                  current={timeLeft.seconds}
                />
              </div>
              {/* Mostrar votos restantes si está disponible */}
              {canUserVote !== undefined && remainingVotes !== undefined && canUserVote && (
                <div className="votes-display">
                  <div className="votes-label">Votos Restantes</div>
                  <div className="votes-boxes">
                    {[1, 2, 3].map((voteNum) => (
                      <div
                        key={voteNum}
                        className={`vote-box ${voteNum <= remainingVotes ? 'available' : 'used'}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                    ))}
                  </div>
                  <div className="votes-count-text">
                    <span className="votes-number">{remainingVotes}</span>
                    <span className="votes-total">/ 3</span>
                  </div>
                  {remainingVotes === 0 && (
                    <div className="no-votes-message">Ya has usado todos tus votos</div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
};

export default Countdown;

