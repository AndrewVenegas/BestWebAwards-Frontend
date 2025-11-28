import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';
import { capitalizeName } from '../utils/format';
import './StudentProfile.css';

const StudentProfile = () => {
  const { user, updateUser } = useAuth();
  const { success, error } = useNotification();
  const [student, setStudent] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      // No establecer Content-Type manualmente, axios lo maneja automáticamente para FormData
      const response = await api.post('/upload/avatar', formData);

      await api.put('/students/me', { avatarUrl: response.data.url });
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

  const handleDeleteAvatar = async () => {
    if (!student.avatarUrl) return;

    try {
      setSaving(true);
      await api.put('/students/me', { avatarUrl: null });
      await fetchProfile();
      
      // Actualizar usuario en contexto
      const updatedUser = { ...user, avatarUrl: null };
      updateUser(updatedUser);
      
      success('Foto eliminada exitosamente');
    } catch (err) {
      console.error('Error al eliminar foto:', err);
      error('Error al eliminar la foto');
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

  if (!student) {
    return <div className="profile-error">Error al cargar el perfil</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1 className="profile-title">Mi Perfil</h1>

        <div className="profile-section">
          <div className="profile-avatar-section">
            {student.avatarUrl ? (
              <img src={student.avatarUrl} alt={capitalizeName(student.name)} className="profile-avatar" />
            ) : (
              <div className="profile-avatar placeholder">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="avatar-buttons">
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
              {student.avatarUrl && (
                <button
                  className="avatar-delete-button"
                  onClick={handleDeleteAvatar}
                  disabled={saving}
                >
                  {saving ? 'Eliminando...' : 'Eliminar Foto'}
                </button>
              )}
            </div>
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
                  value={capitalizeName(student.team.groupName)}
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
                  value={student.team.appName ? capitalizeName(student.team.appName) : 'No definido'}
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

