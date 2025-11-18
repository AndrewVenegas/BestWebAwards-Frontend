import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './InstructionsButton.css';

const InstructionsButton = () => {
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '¡Bienvenido a BestWebAwards!',
      content: 'Aquí podrás descubrir y votar por las mejores aplicaciones creadas por tus compañeros.'
    },
    {
      title: 'Sistema de Votación',
      content: 'Cada alumno puede votar por máximo tres aplicaciones diferentes.'
    },
    {
      title: 'Explorando Aplicaciones',
      content: 'En cada tarjeta verás información sobre la aplicación: nombre, equipo, integrantes, y podrás acceder al video de YouTube y al despliegue de la aplicación.'
    },
    {
      title: 'Marcar Favoritos',
      content: 'Puedes marcar tus aplicaciones favoritas haciendo clic en el corazón (🤍) en la esquina superior derecha de cada tarjeta.'
    },
    {
      title: 'Filtrar Favoritos',
      content: 'Usa el botón "Ver mis favoritos" para ver tus aplicaciones favoritas. Esto facilitará tu selección cuando llegue el momento de votar por tus tres aplicaciones preferidas.'
    },
    {
      title: 'Countdown de Votaciones',
      content: 'Presta atención al contador de tiempo restante. Cuando se cierre el período de votaciones, podrás ver los resultados y el podio de los ganadores.'
    },
    {
      title: 'Tu Perfil',
      content: 'Puedes editar tu nombre y foto de perfil en cualquier momento desde la sección "Mi Perfil".'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setCurrentStep(0);
  };

  return (
    <>
      <button 
        className="instructions-button"
        onClick={() => setShowModal(true)}
        aria-label="Ver instrucciones"
        title="Ver instrucciones"
      >
        <span className="instructions-icon">ℹ️</span>
      </button>

      {showModal && createPortal(
        <div className="instructions-overlay" onClick={handleClose}>
          <div className="instructions-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="instructions-close"
              onClick={handleClose}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="instructions-progress">
              <div 
                className="instructions-progress-bar" 
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>

            <div className="instructions-content">
              <h2 className="instructions-title">{steps[currentStep].title}</h2>
              <p className="instructions-text">{steps[currentStep].content}</p>
            </div>

            <div className="instructions-footer">
              <div className="instructions-steps">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`instructions-step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                  />
                ))}
              </div>

              <div className="instructions-buttons">
                {currentStep > 0 && (
                  <button onClick={handlePrevious} className="instructions-button-nav secondary">
                    Anterior
                  </button>
                )}
                {currentStep < steps.length - 1 ? (
                  <button onClick={handleNext} className="instructions-button-nav primary">
                    Siguiente
                  </button>
                ) : (
                  <button onClick={handleClose} className="instructions-button-nav primary">
                    Entendido
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default InstructionsButton;

