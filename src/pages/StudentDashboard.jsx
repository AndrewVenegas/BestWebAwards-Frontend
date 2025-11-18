import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';
import Countdown from '../components/Countdown';
import AppCard from '../components/AppCard';
import Podium from '../components/Podium';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [myVotes, setMyVotes] = useState([]);
  const [voteCounts, setVoteCounts] = useState([]);
  const [showCounts, setShowCounts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [votingOpen, setVotingOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterHelper, setFilterHelper] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user && !user.hasSeenIntro) {
      navigate('/intro');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [teamsRes, votesRes, configRes] = await Promise.all([
        api.get('/teams'),
        api.get('/students/me/votes'),
        api.get('/config')
      ]);

      setTeams(teamsRes.data);
      setMyVotes(votesRes.data.map(v => v.teamId));
      setVotingOpen(configRes.data.isOpen);

      // Obtener conteos si el estudiante ya votó
      if (votesRes.data.length > 0) {
        const countsRes = await api.get('/votes/visible-counts');
        if (countsRes.data.showCounts) {
          setShowCounts(true);
          setVoteCounts(countsRes.data.counts);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteClick = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setSelectedTeam(team);
      setPasswordError('');
      setShowPasswordModal(true);
    }
  };

  const handlePasswordConfirm = async (password) => {
    if (!selectedTeam) return;

    setPasswordLoading(true);
    try {
      // Primero validar la contraseña
      // Agregar skipAuthRedirect para evitar que el interceptor redirija al login
      const verifyRes = await api.post('/students/me/verify-password', { password }, {
        skipAuthRedirect: true
      });
      
      if (verifyRes.data.valid) {
        // Si la contraseña es válida, proceder con el voto
        await api.post('/votes', { teamId: selectedTeam.id });
        await fetchData();
        
        // Mostrar mensaje de éxito con votos restantes
        const remainingVotes = verifyRes.data.remainingVotes - 1; // -1 porque acabamos de votar
        if (remainingVotes > 0) {
          success(`¡Voto registrado exitosamente! Te quedan ${remainingVotes} ${remainingVotes === 1 ? 'voto' : 'votos'} restantes.`);
        } else {
          success('¡Voto registrado exitosamente! Has usado todos tus votos.');
        }
        
        setShowPasswordModal(false);
        setSelectedTeam(null);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setPasswordError('Contraseña incorrecta. Por favor, inténtalo nuevamente.');
        error('Contraseña incorrecta. Por favor, inténtalo nuevamente.');
      } else {
        const errorMsg = err.response?.data?.error || 'Error al votar';
        setPasswordError(errorMsg);
        error(errorMsg);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedTeam(null);
    setPasswordLoading(false);
    setPasswordError('');
  };

  const getVoteCount = (teamId) => {
    const count = voteCounts.find(c => c.teamId === teamId);
    return count ? count.voteCount : 0;
  };

  const remainingVotes = 3 - myVotes.length;
  const canVote = remainingVotes > 0 && votingOpen;

  const filteredTeams = teams.filter(team => {
    const matchesSearch = 
      team.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.appName && team.appName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (team.displayName && team.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStudent = !filterStudent || 
      (team.students && team.students.some(s => s.id.toString() === filterStudent));
    
    const matchesHelper = !filterHelper || 
      (team.helper && team.helper.id.toString() === filterHelper);

    return matchesSearch && matchesStudent && matchesHelper;
  });

  const allStudents = teams.flatMap(t => t.students || []).filter((s, i, arr) => 
    arr.findIndex(st => st.id === s.id) === i
  );

  const allHelpers = teams.map(t => t.helper).filter((h, i, arr) => 
    h && arr.findIndex(hl => hl && hl.id === h.id) === i
  );

  if (loading) {
    return <div className="dashboard-loading">Cargando...</div>;
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-container">
        <h1 className="dashboard-title">Aplicaciones Participantes</h1>
        
        <Countdown />

        {!votingOpen && (
          <div className="voting-closed-message">
            <h2>Votaciones Cerradas</h2>
            <p>El período de votación ha finalizado. Revisa los resultados a continuación.</p>
          </div>
        )}

        {votingOpen && (
          <div className="votes-info">
            <p>Votos restantes: <strong>{remainingVotes}</strong> de 3</p>
            {remainingVotes === 0 && (
              <p className="no-votes-left">Ya has usado todos tus votos</p>
            )}
          </div>
        )}

        {votingOpen && (
          <div className="filters">
            <input
              type="text"
              placeholder="Buscar por nombre de equipo o aplicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <select
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los estudiantes</option>
              {allStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>

            <select
              value={filterHelper}
              onChange={(e) => setFilterHelper(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los ayudantes</option>
              {allHelpers.map(helper => (
                <option key={helper.id} value={helper.id}>
                  {helper.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!votingOpen ? (
          <Podium />
        ) : (
          <>
            <div className="teams-grid">
              {filteredTeams.map(team => (
                <AppCard
                  key={team.id}
                  team={team}
                  onVote={handleVoteClick}
                  hasVoted={myVotes.includes(team.id)}
                  canVote={canVote}
                  voteCount={showCounts ? getVoteCount(team.id) : undefined}
                  showCounts={showCounts}
                />
              ))}
            </div>
            {filteredTeams.length === 0 && (
              <div className="no-results">
                <p>No se encontraron equipos con los filtros seleccionados</p>
              </div>
            )}
          </>
        )}

      </div>

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={handleClosePasswordModal}
        onConfirm={handlePasswordConfirm}
        teamName={selectedTeam ? (selectedTeam.appName || selectedTeam.displayName || selectedTeam.groupName) : ''}
        loading={passwordLoading}
        errorMessage={passwordError}
      />
    </div>
  );
};

export default StudentDashboard;

