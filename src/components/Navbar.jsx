import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { capitalizeName } from '../utils/format';
import { FiLogOut, FiUser } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';
  const navRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate('/');
  };

  const handleProfileClick = () => {
    setShowDropdown(false);
    navigate('/profile');
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const getUserInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
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
              <Link 
                to="/dashboard" 
                className={`navbar-link ${location.pathname === '/dashboard' || location.pathname === '/votaciones' ? 'active' : ''}`}
              >
                Votaciones
              </Link>
            )}
            
            {user.type === 'helper' && (
              <>
                <Link 
                  to="/dashboard" 
                  className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                >
                  Equipos
                </Link>
                <Link 
                  to="/votaciones" 
                  className={`navbar-link ${location.pathname === '/votaciones' ? 'active' : ''}`}
                >
                  Votaciones
                </Link>
              </>
            )}
            
            {user.type === 'admin' && (
              <>
                <Link 
                  to="/dashboard" 
                  className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/votaciones" 
                  className={`navbar-link ${location.pathname === '/votaciones' ? 'active' : ''}`}
                >
                  Votaciones
                </Link>
              </>
            )}
            
            <div className="navbar-user-menu" ref={dropdownRef}>
              <button 
                className="navbar-avatar-button"
                onClick={toggleDropdown}
                aria-label="Menú de usuario"
              >
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={capitalizeName(user.name || user.email)} 
                    className="navbar-avatar"
                  />
                ) : (
                  <div className="navbar-avatar placeholder">
                    {getUserInitial()}
                  </div>
                )}
              </button>
              
              {showDropdown && (
                <div className="navbar-dropdown">
                  <button 
                    className="navbar-dropdown-item"
                    onClick={handleProfileClick}
                  >
                    <FiUser className="profile-icon" />
                    Mi Perfil
                  </button>
                  <button 
                    className="navbar-dropdown-item"
                    onClick={handleLogout}
                  >
                    <FiLogOut className="logout-icon" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

