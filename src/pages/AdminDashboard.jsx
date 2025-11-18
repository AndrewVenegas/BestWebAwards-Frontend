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

  // Filtros para Dashboard
  const [dashboardFilters, setDashboardFilters] = useState({
    teamParticipation: 'all', // 'all', 'participating', 'not-participating'
    studentVotingStatus: 'all', // 'all', 'complete', 'in-progress', 'not-voted'
    searchTerm: ''
  });

  // Filtros para Equipos
  const [teamFilters, setTeamFilters] = useState({
    participation: 'all', // 'all', 'participating', 'not-participating'
    searchTerm: '',
    helperId: ''
  });

  // Filtros para Estudiantes
  const [studentFilters, setStudentFilters] = useState({
    votingStatus: 'all', // 'all', 'complete', 'in-progress', 'not-voted'
    searchTerm: '',
    teamId: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  // Cargar equipos y helpers cuando se necesiten para los filtros
  useEffect(() => {
    if (activeTab === 'teams' || activeTab === 'students') {
      Promise.all([
        api.get('/admin/teams'),
        api.get('/admin/helpers')
      ]).then(([teamsRes, helpersRes]) => {
        setTeams(teamsRes.data);
        setHelpers(helpersRes.data);
      }).catch(err => {
        console.error('Error al cargar datos para filtros:', err);
      });
    }
  }, [activeTab]);

  // Cargar datos necesarios para filtros del dashboard
  useEffect(() => {
    if (activeTab === 'dashboard' && teams.length === 0) {
      api.get('/admin/teams').then(res => {
        setTeams(res.data);
      }).catch(err => {
        console.error('Error al cargar equipos para filtros:', err);
      });
    }
  }, [activeTab, teams.length]);

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

  // Funciones de filtrado
  const getFilteredVotesSummary = () => {
    let filtered = [...votesSummary];

    // Filtro por participación
    if (dashboardFilters.teamParticipation === 'participating') {
      filtered = filtered.filter(item => item.voteCount > 0);
    } else if (dashboardFilters.teamParticipation === 'not-participating') {
      filtered = filtered.filter(item => item.voteCount === 0);
    }

    // Filtro por búsqueda
    if (dashboardFilters.searchTerm) {
      const term = dashboardFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.groupName && item.groupName.toLowerCase().includes(term)) ||
        (item.displayName && item.displayName.toLowerCase().includes(term)) ||
        (item.appName && item.appName.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const getFilteredVotesByStudent = () => {
    let filtered = [...votesByStudent];

    // Filtro por estado de votación
    if (dashboardFilters.studentVotingStatus === 'complete') {
      filtered = filtered.filter(student => student.votes.length === 3);
    } else if (dashboardFilters.studentVotingStatus === 'in-progress') {
      filtered = filtered.filter(student => student.votes.length > 0 && student.votes.length < 3);
    } else if (dashboardFilters.studentVotingStatus === 'not-voted') {
      filtered = filtered.filter(student => student.votes.length === 0);
    }

    // Filtro por búsqueda
    if (dashboardFilters.searchTerm) {
      const term = dashboardFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.studentName.toLowerCase().includes(term) ||
        student.studentEmail.toLowerCase().includes(term) ||
        student.votes.some(vote => 
          (vote.displayName && vote.displayName.toLowerCase().includes(term)) ||
          (vote.teamName && vote.teamName.toLowerCase().includes(term))
        )
      );
    }

    return filtered;
  };

  const getFilteredTeams = () => {
    let filtered = [...teams];

    // Filtro por participación
    if (teamFilters.participation === 'participating') {
      filtered = filtered.filter(team => team.participates === true);
    } else if (teamFilters.participation === 'not-participating') {
      filtered = filtered.filter(team => team.participates === false);
    }

    // Filtro por ayudante
    if (teamFilters.helperId) {
      filtered = filtered.filter(team => team.helperId && team.helperId.toString() === teamFilters.helperId);
    }

    // Filtro por búsqueda
    if (teamFilters.searchTerm) {
      const term = teamFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(team => 
        (team.groupName && team.groupName.toLowerCase().includes(term)) ||
        (team.displayName && team.displayName.toLowerCase().includes(term)) ||
        (team.appName && team.appName.toLowerCase().includes(term)) ||
        (team.helper && team.helper.name && team.helper.name.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const getFilteredStudents = () => {
    let filtered = [...students];

    // Filtro por equipo
    if (studentFilters.teamId) {
      filtered = filtered.filter(student => 
        student.team && student.team.id.toString() === studentFilters.teamId
      );
    }

    // Filtro por estado de votación (necesitamos obtener los votos)
    if (studentFilters.votingStatus !== 'all') {
      const studentVoteCounts = new Map();
      votesByStudent.forEach(s => {
        studentVoteCounts.set(s.studentId, s.votes.length);
      });

      if (studentFilters.votingStatus === 'complete') {
        filtered = filtered.filter(student => studentVoteCounts.get(student.id) === 3);
      } else if (studentFilters.votingStatus === 'in-progress') {
        filtered = filtered.filter(student => {
          const count = studentVoteCounts.get(student.id) || 0;
          return count > 0 && count < 3;
        });
      } else if (studentFilters.votingStatus === 'not-voted') {
        filtered = filtered.filter(student => (studentVoteCounts.get(student.id) || 0) === 0);
      }
    }

    // Filtro por búsqueda
    if (studentFilters.searchTerm) {
      const term = studentFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        (student.team && student.team.groupName && student.team.groupName.toLowerCase().includes(term))
      );
    }

    return filtered;
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

              {/* Filtros del Dashboard */}
              <div className="filters-section">
                <h3>Filtros</h3>
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>Equipos:</label>
                    <select
                      value={dashboardFilters.teamParticipation}
                      onChange={(e) => setDashboardFilters({ ...dashboardFilters, teamParticipation: e.target.value })}
                      className="filter-select"
                    >
                      <option value="all">Todos</option>
                      <option value="participating">Con votos</option>
                      <option value="not-participating">Sin votos</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Estado de Votación:</label>
                    <select
                      value={dashboardFilters.studentVotingStatus}
                      onChange={(e) => setDashboardFilters({ ...dashboardFilters, studentVotingStatus: e.target.value })}
                      className="filter-select"
                    >
                      <option value="all">Todos</option>
                      <option value="complete">Votación completa (3 votos)</option>
                      <option value="in-progress">En proceso (1-2 votos)</option>
                      <option value="not-voted">Sin votar</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Buscar:</label>
                    <input
                      type="text"
                      placeholder="Nombre, grupo, aplicación..."
                      value={dashboardFilters.searchTerm}
                      onChange={(e) => setDashboardFilters({ ...dashboardFilters, searchTerm: e.target.value })}
                      className="filter-input"
                    />
                  </div>
                </div>
              </div>

              <div className="votes-summary">
                <h2>Votos por Equipo ({getFilteredVotesSummary().length})</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Aplicación</th>
                      <th>Votos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredVotesSummary().map(item => (
                      <tr key={item.teamId}>
                        <td>{capitalizeName(item.displayName || item.groupName)}</td>
                        <td>{item.appName ? capitalizeName(item.appName) : '-'}</td>
                        <td>{item.voteCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredVotesSummary().length === 0 && (
                  <p className="no-results">No se encontraron equipos con los filtros seleccionados</p>
                )}
              </div>

              <div className="votes-by-student">
                <h2>Votos por Estudiante ({getFilteredVotesByStudent().length})</h2>
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
                    {getFilteredVotesByStudent().map(student => (
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
                        <td>
                          <span className={`vote-status-badge ${student.votes.length === 3 ? 'complete' : student.votes.length > 0 ? 'in-progress' : 'not-voted'}`}>
                            {student.votes.length === 3 ? '✓ Completa' : student.votes.length > 0 ? '⏳ En proceso' : '○ Sin votar'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredVotesByStudent().length === 0 && (
                  <p className="no-results">No se encontraron estudiantes con los filtros seleccionados</p>
                )}
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
              
              {/* Filtros para Estudiantes */}
              <div className="filters-section">
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>Estado de Votación:</label>
                    <select
                      value={studentFilters.votingStatus}
                      onChange={(e) => setStudentFilters({ ...studentFilters, votingStatus: e.target.value })}
                      className="filter-select"
                    >
                      <option value="all">Todos</option>
                      <option value="complete">Votación completa (3 votos)</option>
                      <option value="in-progress">En proceso (1-2 votos)</option>
                      <option value="not-voted">Sin votar</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Equipo:</label>
                    <select
                      value={studentFilters.teamId}
                      onChange={(e) => setStudentFilters({ ...studentFilters, teamId: e.target.value })}
                      className="filter-select"
                    >
                      <option value="">Todos los equipos</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {capitalizeName(team.groupName)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Buscar:</label>
                    <input
                      type="text"
                      placeholder="Nombre, email..."
                      value={studentFilters.searchTerm}
                      onChange={(e) => setStudentFilters({ ...studentFilters, searchTerm: e.target.value })}
                      className="filter-input"
                    />
                  </div>
                </div>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Equipo</th>
                    <th>Estado Votación</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredStudents().map(student => {
                    const voteCount = votesByStudent.find(s => s.studentId === student.id)?.votes.length || 0;
                    return (
                      <tr key={student.id}>
                        <td>{capitalizeName(student.name)}</td>
                        <td>{student.email}</td>
                        <td>{student.team?.groupName ? capitalizeName(student.team.groupName) : '-'}</td>
                        <td>
                          <span className={`vote-status-badge ${voteCount === 3 ? 'complete' : voteCount > 0 ? 'in-progress' : 'not-voted'}`}>
                            {voteCount === 3 ? '✓ Completa' : voteCount > 0 ? `⏳ ${voteCount}/3` : '○ Sin votar'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {getFilteredStudents().length === 0 && (
                <p className="no-results">No se encontraron estudiantes con los filtros seleccionados</p>
              )}
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
              
              {/* Filtros para Equipos */}
              <div className="filters-section">
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>Participación:</label>
                    <select
                      value={teamFilters.participation}
                      onChange={(e) => setTeamFilters({ ...teamFilters, participation: e.target.value })}
                      className="filter-select"
                    >
                      <option value="all">Todos</option>
                      <option value="participating">Participantes</option>
                      <option value="not-participating">No participantes</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Ayudante:</label>
                    <select
                      value={teamFilters.helperId}
                      onChange={(e) => setTeamFilters({ ...teamFilters, helperId: e.target.value })}
                      className="filter-select"
                    >
                      <option value="">Todos los ayudantes</option>
                      {helpers.map(helper => (
                        <option key={helper.id} value={helper.id}>
                          {capitalizeName(helper.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Buscar:</label>
                    <input
                      type="text"
                      placeholder="Nombre equipo, aplicación, ayudante..."
                      value={teamFilters.searchTerm}
                      onChange={(e) => setTeamFilters({ ...teamFilters, searchTerm: e.target.value })}
                      className="filter-input"
                    />
                  </div>
                </div>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Display Name</th>
                    <th>Aplicación</th>
                    <th>Participa</th>
                    <th>Ayudante</th>
                    <th>Votos</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTeams().map(team => {
                    const voteCount = votesSummary.find(v => v.teamId === team.id)?.voteCount || 0;
                    return (
                      <tr key={team.id}>
                        <td>{capitalizeName(team.groupName)}</td>
                        <td>{team.displayName ? capitalizeName(team.displayName) : '-'}</td>
                        <td>{team.appName ? capitalizeName(team.appName) : '-'}</td>
                        <td>
                          <span className={team.participates ? 'status-badge participating' : 'status-badge not-participating'}>
                            {team.participates ? '✓ Sí' : '✗ No'}
                          </span>
                        </td>
                        <td>{team.helper?.name ? capitalizeName(team.helper.name) : '-'}</td>
                        <td>{voteCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {getFilteredTeams().length === 0 && (
                <p className="no-results">No se encontraron equipos con los filtros seleccionados</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

