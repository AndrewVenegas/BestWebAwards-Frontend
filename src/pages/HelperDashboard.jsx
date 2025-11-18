import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import './HelperDashboard.css';

const HelperDashboard = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error, warning } = useNotification();

  const [formData, setFormData] = useState({
    participates: false,
    displayName: '',
    appName: '',
    deployUrl: '',
    videoUrl: '',
    screenshotUrl: ''
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/helpers/me/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Error al cargar equipos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team) => {
    setSelectedTeam(team);
    // Precargar todos los datos del equipo, incluyendo valores existentes
    setFormData({
      participates: team.participates ?? false,
      displayName: team.displayName ?? '',
      appName: team.appName ?? '',
      deployUrl: team.deployUrl ?? '',
      videoUrl: team.videoUrl ?? '',
      screenshotUrl: team.screenshotUrl ?? ''
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      error('El archivo debe ser una imagen');
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      error('La imagen es demasiado grande (máximo 5MB)');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setSaving(true);
      
      console.log('Subiendo imagen:', {
        nombre: file.name,
        tamaño: file.size,
        tipo: file.type
      });

      // No establecer Content-Type manualmente, axios lo maneja automáticamente para FormData
      const response = await api.post('/upload/screenshot', formData);

      console.log('Respuesta del servidor:', response.data);

      if (response.data.url) {
        setFormData(prev => ({ ...prev, screenshotUrl: response.data.url }));
        success('Imagen subida exitosamente');
      } else {
        throw new Error('No se recibió URL de la imagen');
      }
    } catch (err) {
      console.error('Error completo al subir imagen:', err);
      console.error('Respuesta del error:', err.response?.data);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Error al subir la imagen';
      error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTeam) return;

    try {
      setSaving(true);
      await api.put(`/helpers/teams/${selectedTeam.id}`, formData);
      await fetchTeams();
      setSelectedTeam(null);
      success('Equipo actualizado exitosamente');
    } catch (err) {
      console.error('Error al actualizar equipo:', err);
      error('Error al actualizar el equipo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="helper-loading">Cargando...</div>;
  }

  return (
    <div className="helper-dashboard">
      <div className="helper-container">
        <h1 className="helper-title">Mis Equipos</h1>

        <div className="teams-list">
          {teams.map(team => (
            <div key={team.id} className="team-card">
              <div className="team-header">
                <h3>{team.groupName}</h3>
                <div className={`team-status ${team.participates ? 'participating' : 'not-participating'}`}>
                  {team.participates ? '✓ Participa' : '✗ No participa'}
                </div>
              </div>
              
              {team.displayName && <p className="team-display-name">{team.displayName}</p>}
              {team.appName && <p className="team-app-name">App: {team.appName}</p>}
              <p className="team-students-count">
                {team.students?.length || 0} {team.students?.length === 1 ? 'estudiante' : 'estudiantes'}
              </p>

              <button onClick={() => handleEdit(team)} className="edit-button">
                Editar
              </button>
            </div>
          ))}
        </div>

        {selectedTeam && (
          <div className="edit-modal-overlay" onClick={() => setSelectedTeam(null)}>
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="edit-modal-close" 
                onClick={() => setSelectedTeam(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
              <h2 style={{ marginRight: '2.5rem' }}>Editar Equipo: {selectedTeam.groupName}</h2>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.participates}
                    onChange={(e) => setFormData(prev => ({ ...prev, participates: e.target.checked }))}
                  />
                  Participa en el concurso
                </label>
              </div>

              <div className="form-group">
                <label>Nombre para mostrar</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Nombre visible del equipo"
                />
              </div>

              <div className="form-group">
                <label>Nombre de la aplicación</label>
                <input
                  type="text"
                  value={formData.appName}
                  onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
                  placeholder="Nombre de la app"
                />
              </div>

              <div className="form-group">
                <label>URL de despliegue</label>
                <input
                  type="url"
                  value={formData.deployUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, deployUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label>URL del video (YouTube)</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="form-group">
                <label>Imagen de Portada</label>
                {formData.screenshotUrl ? (
                  <div className="screenshot-container">
                    <img src={formData.screenshotUrl} alt="Screenshot" className="screenshot-preview" />
                    <p className="screenshot-url">Imagen actual cargada</p>
                  </div>
                ) : (
                  <p className="no-screenshot">No hay imagen de portada cargada</p>
                )}
                <label className="upload-button">
                  {saving ? 'Subiendo...' : formData.screenshotUrl ? 'Cambiar Portada' : 'Subir Portada'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="modal-buttons">
                <button onClick={() => setSelectedTeam(null)} className="cancel-button">
                  Cancelar
                </button>
                <button onClick={handleSave} className="save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelperDashboard;

