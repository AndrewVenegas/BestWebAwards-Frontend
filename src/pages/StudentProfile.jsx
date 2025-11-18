import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './StudentProfile.css';

const StudentProfile = () => {
  const { user, updateUser } = useAuth();
  const [student, setStudent] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/students/me');
      setStudent(response.data);
      setName(response.data.name);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setSaving(true);
      const response = await api.post('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      await api.put('/students/me', { avatarUrl: response.data.url });
      await fetchProfile();
      
      // Actualizar usuario en contexto
      const updatedUser = { ...user, avatarUrl: response.data.url };
      updateUser(updatedUser);
      
      setMessage('Foto actualizada exitosamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error al subir imagen:', error);
      setMessage('Error al subir la imagen');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/students/me', { name });
      await fetchProfile();
      
      // Actualizar usuario en contexto
      const updatedUser = { ...user, name };
      updateUser(updatedUser);
      
      setMessage('Perfil actualizado exitosamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      setMessage('Error al actualizar el perfil');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Cargando...</div>;
  }

  if (!student) {
    return <div className="profile-error">Error al cargar el perfil</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1 className="profile-title">Mi Perfil</h1>

        {message && (
          <div className={`profile-message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="profile-section">
          <div className="profile-avatar-section">
            {student.avatarUrl ? (
              <img src={student.avatarUrl} alt={student.name} className="profile-avatar" />
            ) : (
              <div className="profile-avatar placeholder">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="avatar-upload-button">
              {saving ? 'Subiendo...' : 'Cambiar Foto'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={saving}
              />
            </label>
          </div>

          <div className="profile-info">
            <div className="profile-field">
              <label>Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>

            <div className="profile-field">
              <label>Email</label>
              <input
                type="email"
                value={student.email}
                disabled
                className="disabled"
              />
              <small>El email no se puede cambiar</small>
            </div>

            {student.team && (
              <div className="profile-field">
                <label>Equipo</label>
                <input
                  type="text"
                  value={student.team.groupName}
                  disabled
                  className="disabled"
                />
              </div>
            )}

            {student.team && student.team.participates && (
              <div className="profile-field">
                <label>Nombre de la Aplicación</label>
                <input
                  type="text"
                  value={student.team.appName || 'No definido'}
                  disabled
                  className="disabled"
                />
              </div>
            )}

            <button
              onClick={handleSave}
              className="profile-save-button"
              disabled={saving || name === student.name}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;

