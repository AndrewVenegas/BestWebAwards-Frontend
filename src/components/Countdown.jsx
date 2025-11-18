import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Countdown.css';

const Countdown = () => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/config');
        const { votingDeadline, isOpen: votingIsOpen } = response.data;
        setIsOpen(votingIsOpen);
        
        const deadline = new Date(votingDeadline);
        updateTimeLeft(deadline);
        setLoading(false);
      } catch (error) {
        console.error('Error al obtener configuración:', error);
        setLoading(false);
      }
    };

    fetchConfig();
    const interval = setInterval(() => {
      fetchConfig();
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!timeLeft) return;

    const timer = setInterval(() => {
      updateTimeLeft(new Date(timeLeft.deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const updateTimeLeft = (deadline) => {
    const now = new Date();
    const difference = deadline - now;

    if (difference <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, deadline });
      setIsOpen(false);
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    setTimeLeft({ days, hours, minutes, seconds, deadline });
  };

  if (loading) {
    return <div className="countdown-loading">Cargando...</div>;
  }

  // Cuando las votaciones están cerradas, no mostrar nada (el mensaje se muestra en el dashboard)
  if (!isOpen && timeLeft && timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return null;
  }

  if (!timeLeft) return null;

  return (
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
  );
};

export default Countdown;

