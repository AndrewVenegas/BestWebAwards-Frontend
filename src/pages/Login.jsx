import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { error: showError } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica antes de enviar
    if (!email || !password) {
      showError('Por favor completa todos los campos');
      return;
    }
    
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        const user = result.user;
        
        // Redirigir según el tipo de usuario
        if (user.type === 'student') {
          if (!user.hasSeenIntro) {
            navigate('/intro');
          } else {
            navigate('/dashboard');
          }
        } else if (user.type === 'helper') {
          navigate('/dashboard');
        } else if (user.type === 'admin') {
          navigate('/dashboard');
        }
      } else {
        // Si hay error, solo mostrar el pop-up y NO navegar
        // Asegurarse de que el mensaje de error se muestre
        const errorMessage = result.error || 'Credenciales incorrectas. Por favor intenta nuevamente.';
        showError(errorMessage);
        setLoading(false);
      }
    } catch (error) {
      // Manejar cualquier error inesperado
      console.error('Error en login:', error);
      showError('Error al iniciar sesión. Por favor intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Iniciar Sesión</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

