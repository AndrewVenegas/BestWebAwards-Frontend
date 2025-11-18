import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './IntroGuide.css';

const IntroGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { updateUser, user } = useAuth();

  const steps = [
    {
      title: '¡Bienvenido a BestWebAwards!',
      content: 'Este es el concurso de aplicaciones web más importante del curso. Aquí podrás descubrir y votar por las mejores aplicaciones creadas por tus compañeros.'
    },
    {
      title: 'Sistema de Votación',
      content: 'Cada alumno puede votar por máximo tres aplicaciones diferentes. Recuerda que no puedes votar más de una vez por el mismo grupo.'
    },
    {
      title: 'Explorando Aplicaciones',
      content: 'En cada tarjeta verás información sobre la aplicación: nombre, equipo, integrantes, y podrás acceder al video de YouTube y al despliegue de la aplicación.'
    },
    {
      title: 'Countdown de Votaciones',
      content: 'Presta atención al contador de tiempo restante. Cuando se cierre el período de votaciones, podrás ver los resultados y el podio de los ganadores.'
    },
    {
      title: 'Tu Perfil',
      content: 'Puedes editar tu nombre y foto de perfil en cualquier momento desde la sección "Mi Perfil". La contraseña no se puede cambiar desde aquí.'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const response = await api.put('/students/me/intro');
      // Actualizar el contexto de autenticación con el nuevo estado
      if (user && response.data.student) {
        updateUser({
          ...user,
          hasSeenIntro: true
        });
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Error al marcar introducción:', error);
      // Aún así actualizar el contexto localmente para evitar el loop
      if (user) {
        updateUser({
          ...user,
          hasSeenIntro: true
        });
      }
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="intro-overlay">
      <div className="intro-modal">
        <div className="intro-progress">
          <div className="progress-bar" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
        </div>
        
        <div className="intro-content">
          <h2 className="intro-title">{steps[currentStep].title}</h2>
          <p className="intro-text">{steps[currentStep].content}</p>
        </div>

        <div className="intro-footer">
          <div className="intro-steps">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>

          <div className="intro-buttons">
            {currentStep > 0 && (
              <button onClick={handlePrevious} className="intro-button secondary">
                Anterior
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button onClick={handleNext} className="intro-button primary">
                Siguiente
              </button>
            ) : (
              <button onClick={handleFinish} className="intro-button primary" disabled={loading}>
                {loading ? 'Cargando...' : 'Entendido'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroGuide;

