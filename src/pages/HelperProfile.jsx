import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';
import { capitalizeName } from '../utils/format';
import './StudentProfile.css';

const HelperProfile = () => {
  const { user, updateUser } = useAuth();
  const { success, error } = useNotification();
  const [helper, setHelper] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/helpers/me');
      setHelper(response.data);
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
      const response = await api.post('/upload/avatar', formData);

      await api.put('/helpers/me', { avatarUrl: response.data.url });
      await fetchProfile();
      
      // Actualizar usuario en contexto
      const updatedUser = { ...user, avatarUrl: response.data.url };
      updateUser(updatedUser);
      
      success('Foto actualizada exitosamente');
    } catch (err) {
      console.error('Error al subir imagen:', err);
      error('Error al subir la imagen');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/helpers/me', { name });
      await fetchProfile();
      
      // Actualizar usuario en contexto
      const updatedUser = { ...user, name };
      updateUser(updatedUser);
      
      success('Perfil actualizado exitosamente');
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Cargando...</div>;
  }

  if (!helper) {
    return <div className="profile-error">Error al cargar el perfil</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1 className="profile-title">Mi Perfil</h1>

        <div className="profile-section">
          <div className="profile-avatar-section">
            {helper.avatarUrl ? (
              <img src={helper.avatarUrl} alt={capitalizeName(helper.name)} className="profile-avatar" />
            ) : (
              <div className="profile-avatar placeholder">
                {helper.name.charAt(0).toUpperCase()}
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
                value={helper.email}
                disabled
                className="disabled"
              />
              <small>El email no se puede cambiar</small>
            </div>

            <button
              onClick={handleSave}
              className="profile-save-button"
              disabled={saving || name === helper.name}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelperProfile;

