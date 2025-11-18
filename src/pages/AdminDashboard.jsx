import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { capitalizeName } from '../utils/format';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [votesSummary, setVotesSummary] = useState([]);
  const [votesByStudent, setVotesByStudent] = useState([]);
  const [students, setStudents] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [teams, setTeams] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const { success, error, warning } = useNotification();

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'dashboard') {
        const [summaryRes, byStudentRes] = await Promise.all([
          api.get('/admin/votes/summary'),
          api.get('/admin/votes/by-student')
        ]);
        setVotesSummary(summaryRes.data);
        setVotesByStudent(byStudentRes.data);
        
        // Calcular estadísticas
        const totalStudents = byStudentRes.data.length;
        const totalVotes = byStudentRes.data.reduce((sum, s) => sum + s.votes.length, 0);
        const participatingTeams = summaryRes.data.length;
        
        setStats({
          totalStudents,
          totalVotes,
          participatingTeams
        });
      } else if (activeTab === 'students') {
        const response = await api.get('/admin/students');
        setStudents(response.data);
      } else if (activeTab === 'helpers') {
        const response = await api.get('/admin/helpers');
        setHelpers(response.data);
      } else if (activeTab === 'admins') {
        const response = await api.get('/admin/admins');
        setAdmins(response.data);
      } else if (activeTab === 'teams') {
        const response = await api.get('/admin/teams');
        setTeams(response.data);
      } else if (activeTab === 'config') {
        const response = await api.get('/config');
        setConfig(response.data);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVote = async (voteId) => {
    if (!window.confirm('¿Estás seguro de eliminar este voto?')) return;
    
    try {
      await api.delete(`/admin/votes/${voteId}`);
      success('Voto eliminado exitosamente');
      fetchDashboardData();
    } catch (err) {
      error('Error al eliminar el voto');
    }
  };

  const handleUpdateDeadline = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const deadline = formData.get('deadline');
    
    try {
      await api.put('/admin/config/voting-deadline', { votingDeadline: deadline });
      success('Fecha de cierre actualizada exitosamente');
      fetchDashboardData();
    } catch (err) {
      error('Error al actualizar la fecha');
    }
  };

  if (loading) {
    return <div className="admin-loading">Cargando...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <h1 className="admin-title">Panel de Administración</h1>

        <div className="admin-tabs">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeTab === 'students' ? 'active' : ''}
            onClick={() => setActiveTab('students')}
          >
            Estudiantes
          </button>
          <button
            className={activeTab === 'helpers' ? 'active' : ''}
            onClick={() => setActiveTab('helpers')}
          >
            Ayudantes
          </button>
          <button
            className={activeTab === 'admins' ? 'active' : ''}
            onClick={() => setActiveTab('admins')}
          >
            Administradores
          </button>
          <button
            className={activeTab === 'teams' ? 'active' : ''}
            onClick={() => setActiveTab('teams')}
          >
            Equipos
          </button>
          <button
            className={activeTab === 'config' ? 'active' : ''}
            onClick={() => setActiveTab('config')}
          >
            Configuración
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total de Alumnos</h3>
                  <p className="stat-value">{stats?.totalStudents || 0}</p>
                </div>
                <div className="stat-card">
                  <h3>Total de Votos</h3>
                  <p className="stat-value">{stats?.totalVotes || 0}</p>
                </div>
                <div className="stat-card">
                  <h3>Equipos Participantes</h3>
                  <p className="stat-value">{stats?.participatingTeams || 0}</p>
                </div>
              </div>

              <div className="votes-summary">
                <h2>Votos por Equipo</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Aplicación</th>
                      <th>Votos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {votesSummary.map(item => (
                      <tr key={item.teamId}>
                        <td>{capitalizeName(item.displayName || item.groupName)}</td>
                        <td>{item.appName ? capitalizeName(item.appName) : '-'}</td>
                        <td>{item.voteCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="votes-by-student">
                <h2>Votos por Estudiante</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Email</th>
                      <th>Votos</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {votesByStudent.map(student => (
                      <tr key={student.studentId}>
                        <td>{capitalizeName(student.studentName)}</td>
                        <td>{student.studentEmail}</td>
                        <td>
                          {student.votes.length > 0 ? (
                            <ul>
                              {student.votes.map(vote => (
                                <li key={vote.voteId}>
                                  {capitalizeName(vote.displayName || vote.teamName)}
                                  <button
                                    onClick={() => handleDeleteVote(vote.voteId)}
                                    className="delete-vote-button"
                                  >
                                    Eliminar
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            'Sin votos'
                          )}
                        </td>
                        <td>{student.votes.length} votos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'config' && config && (
            <div className="config-content">
              <h2>Configuración de Votaciones</h2>
              <div className="config-info">
                <p><strong>Estado:</strong> {config.isOpen ? 'Abierta' : 'Cerrada'}</p>
                <p><strong>Fecha de cierre actual:</strong> {new Date(config.votingDeadline).toLocaleString()}</p>
              </div>
              
              <form onSubmit={handleUpdateDeadline} className="config-form">
                <div className="form-group">
                  <label>Nueva fecha de cierre</label>
                  <input
                    type="datetime-local"
                    name="deadline"
                    required
                    defaultValue={new Date(config.votingDeadline).toISOString().slice(0, 16)}
                  />
                </div>
                <button type="submit" className="save-button">Actualizar Fecha</button>
              </form>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="table-content">
              <h2>Estudiantes</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Equipo</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id}>
                      <td>{capitalizeName(student.name)}</td>
                      <td>{student.email}</td>
                      <td>{student.team?.groupName ? capitalizeName(student.team.groupName) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'helpers' && (
            <div className="table-content">
              <h2>Ayudantes</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {helpers.map(helper => (
                    <tr key={helper.id}>
                      <td>{capitalizeName(helper.name)}</td>
                      <td>{helper.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="table-content">
              <h2>Administradores</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin.id}>
                      <td>{capitalizeName(admin.name)}</td>
                      <td>{admin.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="table-content">
              <h2>Equipos</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Display Name</th>
                    <th>Aplicación</th>
                    <th>Participa</th>
                    <th>Ayudante</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(team => (
                    <tr key={team.id}>
                      <td>{capitalizeName(team.groupName)}</td>
                      <td>{team.displayName ? capitalizeName(team.displayName) : '-'}</td>
                      <td>{team.appName ? capitalizeName(team.appName) : '-'}</td>
                      <td>{team.participates ? 'Sí' : 'No'}</td>
                      <td>{team.helper?.name ? capitalizeName(team.helper.name) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

