import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Landing.css';

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="landing">
      <div className="landing-content">
        <h1 className="landing-title animate-fade-in">
          BestWebAwards
        </h1>
        <p className="landing-subtitle animate-fade-in-delay">
          El concurso de aplicaciones web más importante del curso IIC2513
        </p>
        <p className="landing-description animate-fade-in-delay-2">
          Descubre las mejores aplicaciones creadas por tus compañeros,
          vota por tus favoritas y celebra la innovación en desarrollo web.
        </p>
        {!user && (
          <Link to="/login" className="landing-button animate-fade-in-delay-3">
            Iniciar Sesión
          </Link>
        )}
        {user && user.type === 'student' && (
          <Link to="/dashboard" className="landing-button animate-fade-in-delay-3">
            Ir a votaciones
          </Link>
        )}
      </div>
      <div className="landing-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    </div>
  );
};

export default Landing;

