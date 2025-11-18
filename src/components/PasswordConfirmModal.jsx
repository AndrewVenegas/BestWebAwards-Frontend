import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './PasswordConfirmModal.css';

const PasswordConfirmModal = ({ isOpen, onClose, onConfirm, teamName, loading, errorMessage, isDeleteAction = false }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Sincronizar error del padre
  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
    } else {
      setError('');
    }
  }, [errorMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    try {
      await onConfirm(password);
    } catch (err) {
      // El error se maneja en el componente padre
      setError('Error al verificar la contraseña');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="password-modal-overlay" onClick={handleClose}>
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="password-modal-close" 
          onClick={handleClose}
          type="button"
          aria-label="Cerrar"
        >
          ×
        </button>
        
        <h2>{isDeleteAction ? 'Confirmar Eliminación' : 'Confirmar Voto'}</h2>
        <p className="password-modal-message">
          {isDeleteAction ? (
            <>
              Estás a punto de eliminar al administrador <strong>{teamName}</strong>
            </>
          ) : (
            <>
              Estás a punto de votar por <strong>{teamName}</strong>
            </>
          )}
        </p>
        <p className="password-modal-subtitle">
          {isDeleteAction ? (
            'Por favor ingresa tu contraseña para confirmar la eliminación'
          ) : (
            'Por favor ingresa tu contraseña para confirmar tu voto'
          )}
        </p>

        <form onSubmit={handleSubmit} className="password-modal-form">
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
                if (errorMessage) {
                  // Limpiar error del padre cuando el usuario empiece a escribir
                  setError('');
                }
              }}
              placeholder="Ingresa tu contraseña"
              autoFocus
              disabled={loading}
            />
            {error && <span className="error-message">{error}</span>}
          </div>

          <div className="password-modal-actions">
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-confirm"
              disabled={loading || !password}
            >
              {loading ? 'Verificando...' : (isDeleteAction ? 'Confirmar Eliminación' : 'Confirmar Voto')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default PasswordConfirmModal;

