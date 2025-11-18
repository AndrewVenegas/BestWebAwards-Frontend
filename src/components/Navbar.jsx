import React, { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';
  const navRef = useRef(null);

  useEffect(() => {
    if (isLoginPage && navRef.current) {
      // Forzar el reinicio de la animación removiendo y agregando la clase
      const navElement = navRef.current;
      navElement.classList.remove('navbar-slide-down');
      // Usar requestAnimationFrame para asegurar que el navegador procese el cambio
      requestAnimationFrame(() => {
        navElement.classList.add('navbar-slide-down');
      });
    }
  }, [isLoginPage]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Ocultar navbar solo si está en landing page y no está logueado
  if (isLandingPage && !user) {
    return null;
  }

  return (
    <nav ref={navRef} className={`navbar ${isLoginPage ? 'navbar-slide-down' : ''}`}>
      <div className="navbar-container">
        {!isLandingPage ? (
          <Link to="/" className="navbar-brand">
            <img src="/logo.svg" alt="BestWebAwards Logo" className="navbar-logo" />
            <span>BestWebAwards</span>
          </Link>
        ) : user ? (
          // Mantener el espacio del logo cuando está en landing page con usuario logueado
          <div className="navbar-brand navbar-brand-spacer" aria-hidden="true">
            <img src="/logo.svg" alt="" className="navbar-logo" style={{ opacity: 0, pointerEvents: 'none' }} />
            <span style={{ opacity: 0, pointerEvents: 'none' }}>BestWebAwards</span>
          </div>
        ) : null}
        
        {user && (
          <div className="navbar-menu">
            {user.type === 'student' && (
              <>
                <Link to="/dashboard" className="navbar-link">Votaciones</Link>
                <Link to="/profile" className="navbar-link">Mi Perfil</Link>
              </>
            )}
            
            {user.type === 'helper' && (
              <>
                <Link to="/dashboard" className="navbar-link">Equipos</Link>
                <Link to="/votaciones" className="navbar-link">Votaciones</Link>
              </>
            )}
            
            {user.type === 'admin' && (
              <>
                <Link to="/dashboard" className="navbar-link">Dashboard</Link>
                <Link to="/votaciones" className="navbar-link">Votaciones</Link>
              </>
            )}
            
            <button onClick={handleLogout} className="navbar-button">
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

