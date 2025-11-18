import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';
import { capitalizeName } from '../utils/format';
import Countdown from '../components/Countdown';
import AppCard from '../components/AppCard';
import Podium from '../components/Podium';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import InstructionsButton from '../components/InstructionsButton';
import FilterDropdown from '../components/FilterDropdown';
import './StudentDashboard.css';

const StudentDashboard = ({ readOnly = false }) => {
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
  const [filterTipoApp, setFilterTipoApp] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAllTeams, setShowAllTeams] = useState(false); // false = podio, true = todos los grupos
  const [allTeamsWithVotes, setAllTeamsWithVotes] = useState([]);
  const [visibleTeamsCount, setVisibleTeamsCount] = useState(0);
  const [visibleAllTeamsCount, setVisibleAllTeamsCount] = useState(0);
  const [countdownReady, setCountdownReady] = useState(false);

  // Si es modo readOnly (admin/helper), no verificar hasSeenIntro
  const isReadOnly = readOnly || (user && user.type !== 'student');

  useEffect(() => {
    if (!isReadOnly && user && !user.hasSeenIntro) {
      navigate('/intro');
      return;
    }
    fetchData();
  }, [user, navigate, isReadOnly]);

  // Función para resetear todos los filtros
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStudent('');
    setFilterHelper('');
    setFilterTipoApp('');
    setShowFavoritesOnly(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Si es readOnly, no intentar obtener votos ni favoritos del estudiante
      const promises = [
        api.get('/teams'),
        api.get('/config')
      ];
      
      if (!isReadOnly) {
        promises.push(api.get('/students/me/votes'));
        promises.push(api.get('/favorites'));
      } else {
        promises.push(Promise.resolve({ data: [] })); // votes
        promises.push(Promise.resolve({ data: { favorites: [] } })); // favorites
      }
      
      const [teamsRes, configRes, votesRes, favoritesRes] = await Promise.all(promises);

      setTeams(teamsRes.data);
      setMyVotes(isReadOnly ? [] : votesRes.data.map(v => v.teamId));
      setVotingOpen(configRes.data.isOpen);
      
      // Iniciar la aparición gradual de proyectos
      setVisibleTeamsCount(0);
      
      // Obtener favoritos del endpoint o de los teams (si incluyen isFavorite)
      const favoriteTeamIds = isReadOnly ? [] : (favoritesRes.data.favorites || []);
      // También usar isFavorite de teams si está disponible
      const favoritesFromTeams = teamsRes.data
        .filter(team => team.isFavorite)
        .map(team => team.id);
      // Combinar ambos (sin duplicados)
      const allFavorites = [...new Set([...favoriteTeamIds, ...favoritesFromTeams])];
      setFavorites(allFavorites);

      // Solo obtener conteos si las votaciones están cerradas
      if (!configRes.data.isOpen) {
        const countsRes = await api.get('/votes/visible-counts');
        if (countsRes.data.showCounts) {
          setShowCounts(true);
          setVoteCounts(countsRes.data.counts);
          
          // Preparar todos los equipos con votos para la vista de "Todos los Grupos"
          const teamsWithVotes = teamsRes.data.map(team => {
            const voteData = countsRes.data.counts.find(c => c.teamId === team.id);
            return {
              ...team,
              voteCount: voteData ? voteData.voteCount : 0
            };
          }).sort((a, b) => b.voteCount - a.voteCount);
          
          setAllTeamsWithVotes(teamsWithVotes);
          // Iniciar la aparición gradual de todos los equipos
          setVisibleAllTeamsCount(0);
        }
      } else {
        // Si las votaciones están abiertas, no mostrar conteos
        setShowCounts(false);
        setVoteCounts([]);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleVoteClick = (teamId) => {
    if (isReadOnly) {
      return; // No permitir votar en modo readOnly
    }
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

  const handleToggleFavorite = async (teamId) => {
    if (isReadOnly) {
      return; // No permitir cambiar favoritos en modo readOnly
    }
    try {
      const response = await api.post('/favorites', { teamId });
      
      // Actualizar estado local inmediatamente
      if (response.data.isFavorite) {
        setFavorites(prev => [...prev, teamId]);
      } else {
        setFavorites(prev => prev.filter(id => id !== teamId));
      }
    } catch (err) {
      error(err.response?.data?.error || 'Error al actualizar favoritos');
    }
  };

  const handleVotingClosed = async () => {
    console.log('handleVotingClosed llamado - cargando podio');
    
    // Asegurar que se muestre el podio, no todos los grupos
    setShowAllTeams(false);
    
    // Forzar que las votaciones estén cerradas inmediatamente
    setVotingOpen(false);
    
    // Recargar datos para mostrar el podio automáticamente
    try {
      await fetchData();
      
      // Asegurar que se obtengan los conteos de votos
      const countsRes = await api.get('/votes/visible-counts');
      if (countsRes.data.showCounts) {
        setShowCounts(true);
        setVoteCounts(countsRes.data.counts);
        
        // Preparar todos los equipos con votos para la vista de "Todos los Grupos"
        const teamsWithVotes = teams.map(team => {
          const voteData = countsRes.data.counts.find(c => c.teamId === team.id);
          return {
            ...team,
            voteCount: voteData ? voteData.voteCount : 0
          };
        }).sort((a, b) => b.voteCount - a.voteCount);
        
        setAllTeamsWithVotes(teamsWithVotes);
      }
      
      // Forzar nuevamente que las votaciones estén cerradas después de fetchData
      setVotingOpen(false);
      console.log('Podio cargado correctamente');
    } catch (error) {
      console.error('Error al cargar podio:', error);
      // Aún así, forzar que las votaciones estén cerradas
      setVotingOpen(false);
    }
  };

  const getVoteCount = (teamId) => {
    const count = voteCounts.find(c => c.teamId === teamId);
    return count ? count.voteCount : 0;
  };

  const remainingVotes = isReadOnly ? 0 : (3 - myVotes.length);
  const canVote = !isReadOnly && remainingVotes > 0 && votingOpen;

  const filteredTeams = teams.filter(team => {
    // Filtro de favoritos
    if (showFavoritesOnly && !favorites.includes(team.id)) {
      return false;
    }

    const matchesSearch = 
      team.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.appName && team.appName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (team.displayName && team.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStudent = !filterStudent || 
      (team.students && team.students.some(s => s.id.toString() === filterStudent));
    
    const matchesHelper = !filterHelper || 
      (team.helper && team.helper.id.toString() === filterHelper);

    const matchesTipoApp = !filterTipoApp || team.tipo_app === filterTipoApp;

    return matchesSearch && matchesStudent && matchesHelper && matchesTipoApp;
  });

  // Filtrar equipos en la vista de "Todos los Grupos" cuando las votaciones están cerradas
  const filteredAllTeams = allTeamsWithVotes.filter(team => {
    // Filtro de favoritos
    if (showFavoritesOnly && !favorites.includes(team.id)) {
      return false;
    }

    // Filtro de búsqueda
    const matchesSearch = 
      team.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.appName && team.appName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (team.displayName && team.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) {
      return false;
    }

    // Filtro por estudiante
    const matchesStudent = !filterStudent || 
      (team.students && team.students.some(s => s.id.toString() === filterStudent));
    
    if (!matchesStudent) {
      return false;
    }

    // Filtro por ayudante
    const matchesHelper = !filterHelper || 
      (team.helper && team.helper.id.toString() === filterHelper);

    // Filtro por tipo de aplicación
    const matchesTipoApp = !filterTipoApp || team.tipo_app === filterTipoApp;

    return matchesHelper && matchesTipoApp;
  });

  const allStudents = teams.flatMap(t => t.students || []).filter((s, i, arr) => 
    arr.findIndex(st => st.id === s.id) === i
  );

  const allHelpers = teams.map(t => t.helper).filter((h, i, arr) => 
    h && arr.findIndex(hl => hl && hl.id === h.id) === i
  );

  // Para la vista de todos los grupos, también necesitamos estudiantes y ayudantes de allTeamsWithVotes
  const allStudentsFromAllTeams = allTeamsWithVotes.flatMap(t => t.students || []).filter((s, i, arr) => 
    arr.findIndex(st => st.id === s.id) === i
  );

  const allHelpersFromAllTeams = allTeamsWithVotes.map(t => t.helper).filter((h, i, arr) => 
    h && arr.findIndex(hl => hl && hl.id === h.id) === i
  );

  // Combinar ambas listas para tener todos los estudiantes y ayudantes disponibles
  const combinedStudents = [...allStudents, ...allStudentsFromAllTeams].filter((s, i, arr) => 
    arr.findIndex(st => st.id === s.id) === i
  );

  const combinedHelpers = [...allHelpers, ...allHelpersFromAllTeams].filter((h, i, arr) => 
    h && arr.findIndex(hl => hl && hl.id === h.id) === i
  );

  // Efecto para mostrar proyectos gradualmente (solo después de que el countdown esté listo)
  useEffect(() => {
    if (loading || filteredTeams.length === 0 || !countdownReady) {
      setVisibleTeamsCount(0);
      return;
    }
    
    // Resetear contador cuando cambian los filtros
    setVisibleTeamsCount(0);
    
    // Mostrar proyectos gradualmente: 3 cada 100ms
    const interval = setInterval(() => {
      setVisibleTeamsCount(prev => {
        if (prev >= filteredTeams.length) {
          clearInterval(interval);
          return prev;
        }
        return Math.min(prev + 3, filteredTeams.length);
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [loading, filteredTeams.length, countdownReady, searchTerm, filterStudent, filterHelper, filterTipoApp, showFavoritesOnly]);

  // Efecto para mostrar todos los equipos gradualmente cuando las votaciones están cerradas (solo después de que el countdown esté listo)
  useEffect(() => {
    if (loading || !showAllTeams || filteredAllTeams.length === 0 || !countdownReady) {
      setVisibleAllTeamsCount(0);
      return;
    }
    
    // Resetear contador cuando cambian los filtros o se cambia de vista
    setVisibleAllTeamsCount(0);
    
    // Mostrar proyectos gradualmente: 3 cada 100ms
    const interval = setInterval(() => {
      setVisibleAllTeamsCount(prev => {
        if (prev >= filteredAllTeams.length) {
          clearInterval(interval);
          return prev;
        }
        return Math.min(prev + 3, filteredAllTeams.length);
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [loading, showAllTeams, filteredAllTeams.length, countdownReady, searchTerm, filterStudent, filterHelper, filterTipoApp, showFavoritesOnly]);

  if (loading) {
    return <div className="dashboard-loading">Cargando...</div>;
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Aplicaciones Participantes</h1>
          {!votingOpen && (
            <div className="voting-status-badge">
              Estado votaciones: cerradas
            </div>
          )}
        </div>
        
        <Countdown 
          onVotingClosed={handleVotingClosed} 
          onInitialized={() => setCountdownReady(true)}
        />

        {/* Switch para alternar entre podio y todos los grupos cuando las votaciones están cerradas */}
        {!votingOpen && (
          <div className="view-toggle-container">
            <div className="view-toggle">
              <button
                className={`toggle-option ${!showAllTeams ? 'active' : ''}`}
                onClick={() => setShowAllTeams(false)}
              >
                Podio
              </button>
              <button
                className={`toggle-option ${showAllTeams ? 'active' : ''}`}
                onClick={() => setShowAllTeams(true)}
              >
                Todos los Grupos
              </button>
            </div>
          </div>
        )}

        {/* Mostrar podio o todos los grupos según el toggle */}
        {!votingOpen && !showAllTeams && <Podium />}

        {votingOpen && (
          <div className="votes-info">
            {isReadOnly ? (
              <p className="read-only-notice">👁️ Modo de solo lectura - No puedes votar</p>
            ) : (
              <>
                <p>Votos restantes: <strong>{remainingVotes}</strong> de 3</p>
                {remainingVotes === 0 && (
                  <p className="no-votes-left">Ya has usado todos tus votos</p>
                )}
              </>
            )}
          </div>
        )}

        {votingOpen && (
          <div className="filters-top-section">
            {!isReadOnly && (
              <button
                className={`favorites-filter-button ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                {showFavoritesOnly ? '❤️ Ver todos' : '🤍 Ver mis favoritos'}
              </button>
            )}
            
            <input
              type="text"
              placeholder="Buscar por equipo o aplicación"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <FilterDropdown onReset={resetFilters}>
              <div className="filter-group">
                <label>Estudiante:</label>
                <select
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los estudiantes</option>
                  {allStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {capitalizeName(student.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Ayudante:</label>
                <select
                  value={filterHelper}
                  onChange={(e) => setFilterHelper(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los ayudantes</option>
                  {allHelpers.map(helper => (
                    <option key={helper.id} value={helper.id}>
                      {capitalizeName(helper.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Tipo de aplicación:</label>
                <select
                  value={filterTipoApp}
                  onChange={(e) => setFilterTipoApp(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los tipos</option>
                  <option value="Chat">Chat</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Juego">Juego</option>
                  <option value="Planificador">Planificador</option>
                  <option value="Red Social">Red Social</option>
                  <option value="Mix">Mix</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </FilterDropdown>
          </div>
        )}

        {/* Vista de votación activa */}
        {votingOpen && (
          <>
            <div className="teams-grid">
              {filteredTeams.slice(0, visibleTeamsCount).map((team, index) => (
                <AppCard
                  key={team.id}
                  team={team}
                  onVote={isReadOnly ? null : handleVoteClick}
                  hasVoted={myVotes.includes(team.id)}
                  canVote={canVote}
                  voteCount={showCounts ? getVoteCount(team.id) : undefined}
                  showCounts={showCounts}
                  isFavorite={favorites.includes(team.id) || team.isFavorite}
                  onToggleFavorite={isReadOnly ? null : handleToggleFavorite}
                  index={index}
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

        {/* Filtros para la vista de todos los grupos */}
        {!votingOpen && showAllTeams && (
          <div className="filters-top-section">
            {!isReadOnly && (
              <button
                className={`favorites-filter-button ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                {showFavoritesOnly ? '❤️ Ver todos' : '🤍 Ver mis favoritos'}
              </button>
            )}
            
            <input
              type="text"
              placeholder="Buscar por equipo o aplicación"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <FilterDropdown onReset={resetFilters}>
              <div className="filter-group">
                <label>Estudiante:</label>
                <select
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los estudiantes</option>
                  {combinedStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {capitalizeName(student.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Ayudante:</label>
                <select
                  value={filterHelper}
                  onChange={(e) => setFilterHelper(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los ayudantes</option>
                  {combinedHelpers.map(helper => (
                    <option key={helper.id} value={helper.id}>
                      {capitalizeName(helper.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Tipo de aplicación:</label>
                <select
                  value={filterTipoApp}
                  onChange={(e) => setFilterTipoApp(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los tipos</option>
                  <option value="Chat">Chat</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Juego">Juego</option>
                  <option value="Planificador">Planificador</option>
                  <option value="Red Social">Red Social</option>
                  <option value="Mix">Mix</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </FilterDropdown>
          </div>
        )}

        {/* Vista de todos los grupos cuando las votaciones están cerradas */}
        {!votingOpen && showAllTeams && (
          <div className="all-teams-section">
            <div className="teams-grid">
              {filteredAllTeams.slice(0, visibleAllTeamsCount).map((team, index) => (
                  <AppCard
                    key={team.id}
                    team={team}
                    onVote={null}
                    hasVoted={myVotes.includes(team.id)}
                    canVote={false}
                    voteCount={team.voteCount || 0}
                    showCounts={true}
                    isFavorite={favorites.includes(team.id) || team.isFavorite}
                    onToggleFavorite={isReadOnly ? null : handleToggleFavorite}
                    index={index}
                  />
              ))}
            </div>
            {filteredAllTeams.length === 0 && (
              <div className="no-results">
                <p>No se encontraron equipos con los filtros seleccionados</p>
              </div>
            )}
          </div>
        )}

      </div>

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={handleClosePasswordModal}
        onConfirm={handlePasswordConfirm}
        teamName={selectedTeam ? capitalizeName(selectedTeam.appName || selectedTeam.displayName || selectedTeam.groupName) : ''}
        loading={passwordLoading}
        errorMessage={passwordError}
      />

      {/* Botón flotante de instrucciones */}
      {!isReadOnly && <InstructionsButton />}
    </div>
  );
};

export default StudentDashboard;

