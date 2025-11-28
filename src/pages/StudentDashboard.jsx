import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';
import { capitalizeName } from '../utils/format';
import consoleDebug from '../utils/debug';
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
  const [dataLoadingPeriod, setDataLoadingPeriod] = useState(false);
  const [votingPaused, setVotingPaused] = useState(false);
  const [countdownTimeLeft, setCountdownTimeLeft] = useState(null);
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
  const [alphabeticalOrder, setAlphabeticalOrder] = useState(null); // null | 'asc' | 'desc'
  const hasInitialRevealRun = useRef(false);
  const hasAllTeamsRevealRun = useRef(false);

  // Solo para verificación de intro - helpers y admins no necesitan ver intro
  const isReadOnly = readOnly || (user && user.type !== 'student');
  // Para votación, todos los usuarios autenticados pueden votar
  const canUserVote = user && (user.type === 'student' || user.type === 'helper' || user.type === 'admin');

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
    setAlphabeticalOrder(null);
  };

  const cycleAlphabeticalOrder = () => {
    setAlphabeticalOrder((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null; // 'desc' -> null
    });
    // Scroll suave hasta que la sección de filtros quede visible justo debajo de la navbar
    setTimeout(() => {
      const filtersSection = votingOpen 
        ? document.getElementById('filters-section')
        : document.getElementById('filters-section-closed');
      const navbar = document.querySelector('.navbar');
      if (filtersSection && navbar) {
        const navbarHeight = navbar.offsetHeight;
        const sectionTop = filtersSection.getBoundingClientRect().top + window.scrollY;
        // Hacer scroll hasta que la sección quede justo debajo de la navbar
        window.scrollTo({ top: sectionTop - navbarHeight - 10, behavior: 'smooth' });
      }
    }, 500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Todos los usuarios autenticados pueden obtener sus votos y favoritos
      const promises = [
        api.get('/teams'),
        api.get('/config')
      ];
      
      if (canUserVote) {
        promises.push(api.get('/votes/me'));
        promises.push(api.get('/favorites'));
      } else {
        promises.push(Promise.resolve({ data: [] })); // votes
        promises.push(api.get('/favorites'));
      }
      
      const [teamsRes, configRes, votesRes, favoritesRes] = await Promise.all(promises);

      setTeams(teamsRes.data);
      setMyVotes(canUserVote ? votesRes.data.map(v => v.teamId) : []);
      // Guardar el estado del periodo de carga de datos y pausadas
      setDataLoadingPeriod(configRes.data.isInDataLoadingPeriod || false);
      setVotingPaused(configRes.data.votingPaused || false);
      // Las votaciones están abiertas solo si isOpen es true (ya considera periodo de carga y pausadas)
      setVotingOpen(configRes.data.isOpen);
      
      // Iniciar la aparición gradual de proyectos
      setVisibleTeamsCount(0);
      
      // Obtener favoritos del endpoint o de los teams (si incluyen isFavorite)
      // Ahora también funciona para helpers y admins
      const favoriteTeamIds = favoritesRes.data.favorites || [];
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
      consoleDebug('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleVoteClick = (teamId) => {
    if (!canUserVote) {
      return; // Solo usuarios autenticados pueden votar
    }
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setSelectedTeam(team);
      setPasswordError('');
      // Todos los usuarios deben confirmar con contraseña antes de votar
      setShowPasswordModal(true);
    }
  };

  const handlePasswordConfirm = async (password) => {
    if (!selectedTeam) return;

    setPasswordLoading(true);
    try {
      // Determinar el endpoint de verificación según el tipo de usuario
      let verifyEndpoint = '';
      if (user.type === 'student') {
        verifyEndpoint = '/students/me/verify-password';
      } else if (user.type === 'helper') {
        verifyEndpoint = '/helpers/me/verify-password';
      } else if (user.type === 'admin') {
        verifyEndpoint = '/admin/admins/verify-password';
      } else {
        error('Tipo de usuario no válido');
        setPasswordLoading(false);
        return;
      }

      // Primero validar la contraseña
      // Agregar skipAuthRedirect para evitar que el interceptor redirija al login
      const verifyRes = await api.post(verifyEndpoint, { password }, {
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
    // Ahora helpers y admins también pueden usar favoritos
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
    consoleDebug('handleVotingClosed llamado - cargando podio');
    
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
      consoleDebug('Podio cargado correctamente');
    } catch (error) {
      consoleDebug('Error al cargar podio:', error);
      // Aún así, forzar que las votaciones estén cerradas
      setVotingOpen(false);
    }
  };

  const getVoteCount = (teamId) => {
    const count = voteCounts.find(c => c.teamId === teamId);
    return count ? count.voteCount : 0;
  };

  const remainingVotes = canUserVote ? (3 - myVotes.length) : 0;
  // Permitir votar solo si las votaciones están abiertas y no estamos en periodo de carga ni pausadas
  const canVote = canUserVote && remainingVotes > 0 && votingOpen && !dataLoadingPeriod && !votingPaused;

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
  }).sort((a, b) => {
    if (alphabeticalOrder) {
      const nameA = (a.appName || a.groupName || '').toLowerCase();
      const nameB = (b.appName || b.groupName || '').toLowerCase();

      if (nameA < nameB) return alphabeticalOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return alphabeticalOrder === 'asc' ? 1 : -1;
      return 0;
    }

    // Ordenar: primero los equipos por los que ya votó, luego los demás
    const aVoted = myVotes.includes(a.id);
    const bVoted = myVotes.includes(b.id);
    
    if (aVoted && !bVoted) return -1; // a primero
    if (!aVoted && bVoted) return 1;  // b primero
    return 0; // mantener orden original si ambos tienen el mismo estado
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
  }).sort((a, b) => {
    if (alphabeticalOrder) {
      const nameA = (a.appName || a.groupName || '').toLowerCase();
      const nameB = (b.appName || b.groupName || '').toLowerCase();

      if (nameA < nameB) return alphabeticalOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return alphabeticalOrder === 'asc' ? 1 : -1;
      return 0;
    }

    // Ordenar por cantidad de votos (de mayor a menor)
    const aVotes = a.voteCount || 0;
    const bVotes = b.voteCount || 0;
    
    if (aVotes > bVotes) return -1; // a primero (más votos)
    if (aVotes < bVotes) return 1;  // b primero (más votos)
    return 0; // mantener orden original si tienen la misma cantidad de votos
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
      hasInitialRevealRun.current = false;
      return;
    }

    // Resetear cuando cambia cualquier filtro, incluyendo el orden alfabético
    hasInitialRevealRun.current = false;
    setVisibleTeamsCount(0);
    
    const interval = setInterval(() => {
      setVisibleTeamsCount(prev => {
        if (prev >= filteredTeams.length) {
          clearInterval(interval);
          hasInitialRevealRun.current = true;
          return prev;
        }
        return Math.min(prev + 3, filteredTeams.length);
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [loading, filteredTeams.length, countdownReady, searchTerm, filterStudent, filterHelper, filterTipoApp, showFavoritesOnly, alphabeticalOrder]);

  // Efecto para mostrar todos los equipos gradualmente cuando las votaciones están cerradas (solo después de que el countdown esté listo)
  useEffect(() => {
    if (loading || !showAllTeams || filteredAllTeams.length === 0 || !countdownReady) {
      setVisibleAllTeamsCount(0);
      hasAllTeamsRevealRun.current = false;
      return;
    }

    // Resetear cuando cambia cualquier filtro, incluyendo el orden alfabético
    hasAllTeamsRevealRun.current = false;
    setVisibleAllTeamsCount(0);
    
    const interval = setInterval(() => {
      setVisibleAllTeamsCount(prev => {
        if (prev >= filteredAllTeams.length) {
          clearInterval(interval);
          hasAllTeamsRevealRun.current = true;
          return prev;
        }
        return Math.min(prev + 3, filteredAllTeams.length);
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [loading, showAllTeams, filteredAllTeams.length, countdownReady, searchTerm, filterStudent, filterHelper, filterTipoApp, showFavoritesOnly, alphabeticalOrder]);


  if (loading) {
    return <div className="dashboard-loading">Cargando...</div>;
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Aplicaciones Participantes</h1>
          {votingOpen && !dataLoadingPeriod && !votingPaused && countdownTimeLeft && (countdownTimeLeft.days > 0 || countdownTimeLeft.hours > 0 || countdownTimeLeft.minutes > 0 || countdownTimeLeft.seconds > 0) && (
            <div className="voting-status-badge">
              <span className="status-dot status-dot-open"></span>
              <span>Estado votaciones: abiertas</span>
            </div>
          )}
          {dataLoadingPeriod && (
            <div className="voting-status-badge voting-status-badge-with-tooltip">
              <span className="status-dot status-dot-closed"></span>
              <span>Periodo de carga de datos - Las votaciones comenzarán pronto</span>
              <span className="voting-status-tooltip-icon" title="Los ayudantes y administradores están cargando información de los equipos participantes. Las votaciones comenzarán cuando finalice este periodo.">ℹ️</span>
            </div>
          )}
          {votingPaused && !dataLoadingPeriod && (
            <div className="voting-status-badge voting-status-badge-with-tooltip">
              <span className="status-dot status-dot-closed"></span>
              <span>Votaciones pausadas</span>
              <span className="voting-status-tooltip-icon" title="Las votaciones están temporalmente pausadas por el administrador. Puedes ver los equipos pero no puedes votar en este momento.">ℹ️</span>
            </div>
          )}
          {(!votingOpen || (countdownTimeLeft && countdownTimeLeft.days === 0 && countdownTimeLeft.hours === 0 && countdownTimeLeft.minutes === 0 && countdownTimeLeft.seconds === 0)) && !dataLoadingPeriod && !votingPaused && (
            <div className="voting-status-badge">
              <span className="status-dot status-dot-closed"></span>
              <span>Estado votaciones: cerradas</span>
            </div>
          )}
        </div>
        
        <Countdown
          onVotingClosed={handleVotingClosed}
          onInitialized={() => setCountdownReady(true)}
          onTimeUpdate={setCountdownTimeLeft}
          remainingVotes={remainingVotes}
          canUserVote={canUserVote}
        />

        {/* Switch para alternar entre podio y todos los grupos cuando las votaciones están cerradas (pero no en periodo de carga ni pausadas) */}
        {!votingOpen && !dataLoadingPeriod && !votingPaused && (
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

        {/* Mostrar podio o todos los grupos según el toggle (solo si no está en periodo de carga ni pausadas) */}
        {!votingOpen && !dataLoadingPeriod && !votingPaused && !showAllTeams && <Podium />}




        {/* votes-info ahora está integrado en el countdown */}

        {(votingOpen || dataLoadingPeriod || votingPaused) && (
          <div className="filters-top-section" id="filters-section">
            <button
              className={`favorites-filter-button ${showFavoritesOnly ? 'active' : ''}`}
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                // Scroll suave hasta que el botón quede visible justo debajo de la navbar
                setTimeout(() => {
                  const filtersSection = document.getElementById('filters-section');
                  const navbar = document.querySelector('.navbar');
                  if (filtersSection && navbar) {
                    const navbarHeight = navbar.offsetHeight;
                    const sectionTop = filtersSection.getBoundingClientRect().top + window.scrollY;
                    // Hacer scroll hasta que el botón quede justo debajo de la navbar
                    window.scrollTo({ top: sectionTop - navbarHeight - 10, behavior: 'smooth' });
                  }
                }, 500);
              }}
            >
              {showFavoritesOnly ? '❤️ Ver todos' : '🤍 Ver mis favoritos'}
            </button>
            
            <input
              type="text"
              placeholder="Buscar por equipo o aplicación"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <FilterDropdown onReset={resetFilters}>
              <div className="filter-group alphabetical-sort-control">
                <label>Orden:</label>
                <button
                  type="button"
                  className={`alphabetical-order-button ${alphabeticalOrder || 'none'}`}
                  onClick={cycleAlphabeticalOrder}
                >
                  {alphabeticalOrder === 'asc' && '↑ A-Z'}
                  {alphabeticalOrder === 'desc' && '↓ Z-A'}
                  {!alphabeticalOrder && 'Sin orden'}
                </button>
              </div>

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

        {/* Vista de votación activa o periodo de carga/pausadas (mostrar equipos pero sin votar) */}
        {(votingOpen || dataLoadingPeriod || votingPaused) && (
          <>
            <div className="teams-grid">
              {filteredTeams.slice(0, visibleTeamsCount).map((team, index) => (
                <AppCard
                  key={team.id}
                  team={team}
                  onVote={canUserVote && !dataLoadingPeriod && !votingPaused ? handleVoteClick : null}
                  hasVoted={myVotes.includes(team.id)}
                  canVote={canVote}
                  voteCount={showCounts ? getVoteCount(team.id) : undefined}
                  showCounts={showCounts}
                  isFavorite={favorites.includes(team.id) || team.isFavorite}
                  onToggleFavorite={handleToggleFavorite}
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
          <div className="filters-top-section" id="filters-section-closed">
            <button
              className={`favorites-filter-button ${showFavoritesOnly ? 'active' : ''}`}
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                // Scroll suave hasta que el botón quede visible justo debajo de la navbar
                setTimeout(() => {
                  const filtersSection = document.getElementById('filters-section-closed');
                  const navbar = document.querySelector('.navbar');
                  if (filtersSection && navbar) {
                    const navbarHeight = navbar.offsetHeight;
                    const sectionTop = filtersSection.getBoundingClientRect().top + window.scrollY;
                    // Hacer scroll hasta que el botón quede justo debajo de la navbar
                    window.scrollTo({ top: sectionTop - navbarHeight - 10, behavior: 'smooth' });
                  }
                }, 500);
              }}
            >
              {showFavoritesOnly ? '❤️ Ver todos' : '🤍 Ver mis favoritos'}
            </button>
            
            <input
              type="text"
              placeholder="Buscar por equipo o aplicación"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <FilterDropdown onReset={resetFilters}>
              <div className="filter-group alphabetical-sort-control">
                <label>Orden:</label>
                <button
                  type="button"
                  className={`alphabetical-order-button ${alphabeticalOrder || 'none'}`}
                  onClick={cycleAlphabeticalOrder}
                >
                  {alphabeticalOrder === 'asc' && '↑ A-Z'}
                  {alphabeticalOrder === 'desc' && '↓ Z-A'}
                  {!alphabeticalOrder && 'Sin orden'}
                </button>
              </div>

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
        {!votingOpen && showAllTeams && !dataLoadingPeriod && !votingPaused && (
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
                    onToggleFavorite={handleToggleFavorite}
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

