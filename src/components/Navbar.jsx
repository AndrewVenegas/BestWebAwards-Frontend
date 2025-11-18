import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          BestWebAwards
        </Link>
        
        {user && (
          <div className="navbar-menu">
            {user.type === 'student' && (
              <>
                <Link to="/dashboard" className="navbar-link">Inicio</Link>
                <Link to="/profile" className="navbar-link">Mi Perfil</Link>
              </>
            )}
            
            {user.type === 'helper' && (
              <Link to="/dashboard" className="navbar-link">Equipos</Link>
            )}
            
            {user.type === 'admin' && (
              <>
                <Link to="/dashboard" className="navbar-link">Dashboard</Link>
                <Link to="/admin" className="navbar-link">Gestión</Link>
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

