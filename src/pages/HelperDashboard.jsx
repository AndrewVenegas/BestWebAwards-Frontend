import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { capitalizeName } from '../utils/format';
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
    screenshotUrl: '',
    tipo_app: ''
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
      screenshotUrl: team.screenshotUrl ?? '',
      tipo_app: team.tipo_app ?? ''
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

  const validateUrl = (url) => {
    if (!url || url.trim() === '') return false;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
    }
    if (!selectedTeam) return;

    // Validar campos obligatorios - siempre validar todos los campos
    const errors = [];

    // Validar displayName
    if (!formData.displayName || typeof formData.displayName !== 'string' || formData.displayName.trim() === '') {
      errors.push('El nombre del grupo (para mostrar) es obligatorio');
    }

    // Validar appName
    if (!formData.appName || typeof formData.appName !== 'string' || formData.appName.trim() === '') {
      errors.push('El nombre de la aplicación es obligatorio');
    }

    // Validar deployUrl
    if (!formData.deployUrl || typeof formData.deployUrl !== 'string' || formData.deployUrl.trim() === '') {
      errors.push('La URL de despliegue es obligatoria');
    } else {
      const trimmedUrl = formData.deployUrl.trim();
      if (!validateUrl(trimmedUrl)) {
        errors.push('La URL de despliegue no tiene un formato válido (debe comenzar con http:// o https://)');
      }
    }

    // Validar videoUrl
    if (!formData.videoUrl || typeof formData.videoUrl !== 'string' || formData.videoUrl.trim() === '') {
      errors.push('La URL del video es obligatoria');
    } else {
      const trimmedUrl = formData.videoUrl.trim();
      if (!validateUrl(trimmedUrl)) {
        errors.push('La URL del video no tiene un formato válido (debe comenzar con http:// o https://)');
      }
    }

    // Validar screenshotUrl
    if (!formData.screenshotUrl || typeof formData.screenshotUrl !== 'string' || formData.screenshotUrl.trim() === '') {
      errors.push('La imagen de portada es obligatoria');
    }

    // Mostrar todos los errores
    if (errors.length > 0) {
      // Mostrar el primer error inmediatamente, luego los demás con un pequeño delay
      error(errors[0]);
      if (errors.length > 1) {
        errors.slice(1).forEach((err, index) => {
          setTimeout(() => error(err), (index + 1) * 500);
        });
      }
      return;
    }

    try {
      setSaving(true);
      // Limpiar espacios en blanco de los campos antes de enviar
      const cleanedData = {
        ...formData,
        displayName: formData.displayName.trim(),
        appName: formData.appName.trim(),
        deployUrl: formData.deployUrl.trim(),
        videoUrl: formData.videoUrl.trim(),
        screenshotUrl: formData.screenshotUrl.trim(),
        tipo_app: formData.tipo_app || null
      };
      
      await api.put(`/helpers/teams/${selectedTeam.id}`, cleanedData);
      await fetchTeams();
      setSelectedTeam(null);
      success('Equipo actualizado exitosamente');
    } catch (err) {
      console.error('Error al actualizar equipo:', err);
      const errorMessage = err.response?.data?.error || 'Error al actualizar el equipo';
      error(errorMessage);
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
                <h3>{capitalizeName(team.groupName)}</h3>
                <div className={`team-status ${team.participates ? 'participating' : 'not-participating'}`}>
                  {team.participates ? '✓ Participa' : '✗ No participa'}
                </div>
              </div>
              
              {team.displayName && <p className="team-display-name">{capitalizeName(team.displayName)}</p>}
              {team.appName && <p className="team-app-name">App: {capitalizeName(team.appName)}</p>}
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
              <h2 style={{ marginRight: '2.5rem' }}>Editar Equipo</h2>

              <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nombre oficial del grupo</label>
                <input
                  type="text"
                  value={selectedTeam.groupName}
                  disabled
                  className="disabled-input"
                  readOnly
                />
                <p className="field-help">Este campo no se puede editar</p>
              </div>

              <div className="form-group">
                <label>
                  Nombre grupo (para mostrar) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Nombre visible del equipo"
                />
              </div>

              <div className="form-group">
                <label>
                  Nombre de la aplicación <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.appName}
                  onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
                  placeholder="Nombre de la app"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Tipo de aplicación
                </label>
                <select
                  value={formData.tipo_app}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo_app: e.target.value }))}
                >
                  <option value="">Seleccionar tipo...</option>
                  <option value="Chat">Chat</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Juego">Juego</option>
                  <option value="Planificador">Planificador</option>
                  <option value="Red Social">Red Social</option>
                  <option value="Mix">Mix</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  URL de despliegue <span className="required">*</span>
                </label>
                <input
                  type="url"
                  value={formData.deployUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, deployUrl: e.target.value }))}
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  URL del video (YouTube) <span className="required">*</span>
                </label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/..."
                  required
                />
              </div>

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
                <label>
                  Imagen de Portada <span className="required">*</span>
                </label>
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
                <button 
                  type="button"
                  onClick={() => setSelectedTeam(null)} 
                  className="cancel-button"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="save-button" 
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelperDashboard;


