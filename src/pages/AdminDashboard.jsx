import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { capitalizeName } from '../utils/format';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import FilterDropdown from '../components/FilterDropdown';
import useAnimatedNumber from '../hooks/useAnimatedNumber';
import FileDropzone from '../components/FileDropzone';
import Switch from '../components/Switch';
import './AdminDashboard.css';

// Función helper para convertir fecha UTC a formato datetime-local (hora local)
const formatDateForInput = (dateString) => {
  const date = new Date(dateString);
  // Obtener año, mes, día, hora y minutos en hora local
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  
  // Valores animados para las estadísticas del dashboard (secuencial: 0s, 1s, 2s)
  const animatedTotalStudents = useAnimatedNumber(stats?.totalStudents || 0, 1000, 0);
  const animatedTotalVotes = useAnimatedNumber(stats?.totalVotes || 0, 1000, 1000);
  const animatedParticipatingTeams = useAnimatedNumber(stats?.participatingTeams || 0, 1000, 2000);
  
  const [votesSummary, setVotesSummary] = useState([]);
  const [votesByStudent, setVotesByStudent] = useState([]);
  const [votesByHelper, setVotesByHelper] = useState([]);
  const [votesByAdmin, setVotesByAdmin] = useState([]);
  const [showDeleteHelperVoteButtons, setShowDeleteHelperVoteButtons] = useState(false);
  const [showDeleteAdminVoteButtons, setShowDeleteAdminVoteButtons] = useState(false);
  
  // Estados para controlar cuántas filas mostrar en cada tabla
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [showAllHelpers, setShowAllHelpers] = useState(false);
  const [showAllAdmins, setShowAllAdmins] = useState(false);
  const [showAllVotesSummary, setShowAllVotesSummary] = useState(false);
  const [students, setStudents] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [teams, setTeams] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState({
    dashboard: false,
    students: false,
    helpers: false,
    admins: false,
    teams: false,
    config: false
  });
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
    helperId: '',
    tipoApp: '', // Filtro por tipo de aplicación
    sortBy: 'default' // 'default', 'asc', 'desc' - ordenar por votos
  });

  // Filtros para Estudiantes
  const [studentFilters, setStudentFilters] = useState({
    votingStatus: 'all', // 'all', 'complete', 'in-progress', 'not-voted'
    searchTerm: '',
    teamId: ''
  });

  // Filtros para Ayudantes
  const [helperFilters, setHelperFilters] = useState({
    searchTerm: ''
  });

  // Filtros para Administradores
  const [adminFilters, setAdminFilters] = useState({
    searchTerm: ''
  });

  // Estados para modales y formularios
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(null);
  const [clickStartedInModal, setClickStartedInModal] = useState(false);
  const [showCreateHelper, setShowCreateHelper] = useState(false);
  const [showEditHelper, setShowEditHelper] = useState(null);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showEditAdmin, setShowEditAdmin] = useState(null);
  const [showDeleteAdminModal, setShowDeleteAdminModal] = useState(null);
  const [showDeleteVoteButtons, setShowDeleteVoteButtons] = useState(false);
  const [deletePasswordLoading, setDeletePasswordLoading] = useState(false);
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Estado para el formulario de edición de equipo (igual que HelperDashboard)
  const [teamFormData, setTeamFormData] = useState({
    participates: false,
    displayName: '',
    appName: '',
    deployUrl: '',
    videoUrl: '',
    screenshotUrl: '',
    tipo_app: '',
    description: ''
  });

  useEffect(() => {
    // Solo cargar datos si no están cargados aún o si cambió la pestaña
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Cargar equipos y helpers cuando se necesiten para los filtros y modales
  useEffect(() => {
    if (activeTab === 'teams' || activeTab === 'students' || showCreateTeam || showEditTeam || showCreateHelper || showCreateStudent || showEditStudent) {
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
  }, [activeTab, showCreateTeam, showEditTeam, showCreateHelper, showCreateStudent, showEditStudent]);

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
      setLoading(prev => ({ ...prev, [activeTab]: true }));
      
      if (activeTab === 'dashboard') {
        const [summaryRes, byStudentRes, byHelperRes, byAdminRes] = await Promise.all([
          api.get('/admin/votes/summary'),
          api.get('/admin/votes/by-student'),
          api.get('/admin/votes/by-helper'),
          api.get('/admin/votes/by-admin')
        ]);
        setVotesSummary(summaryRes.data);
        setVotesByStudent(byStudentRes.data);
        setVotesByHelper(byHelperRes.data);
        setVotesByAdmin(byAdminRes.data);
        
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
      setLoading(prev => ({ ...prev, [activeTab]: false }));
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

  const handleDeleteAllVotes = async (studentId) => {
    const student = votesByStudent.find(s => s.studentId === studentId);
    const voteCount = student?.votes.length || 0;
    
    if (voteCount === 0) {
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar todos los votos (${voteCount}) de este estudiante?`)) return;
    
    try {
      // Eliminar todos los votos del estudiante uno por uno
      const deletePromises = student.votes.map(vote => 
        api.delete(`/admin/votes/${vote.voteId}`)
      );
      await Promise.all(deletePromises);
      success(`Se eliminaron ${voteCount} ${voteCount === 1 ? 'voto' : 'votos'} exitosamente`);
      fetchDashboardData();
    } catch (err) {
      error('Error al eliminar los votos');
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

  // Funciones CRUD para Equipos
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teamData = {
      groupName: formData.get('groupName'),
      displayName: formData.get('displayName') || null,
      appName: formData.get('appName') || null,
      helperId: formData.get('helperId') || null,
      participates: formData.get('participates') === 'true',
      tipo_app: formData.get('tipo_app') || null,
      description: formData.get('description') || null
    };

    try {
      setSaving(true);
      await api.post('/admin/teams', teamData);
      success('Equipo creado exitosamente');
      setShowCreateTeam(false);
      fetchDashboardData();
    } catch (err) {
      error(err.response?.data?.error || 'Error al crear el equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleEditTeamClick = (team) => {
    setShowEditTeam(team);
    // Precargar todos los datos del equipo, incluyendo valores existentes
    setTeamFormData({
      participates: team.participates ?? false,
      displayName: team.displayName ?? '',
      appName: team.appName ?? '',
      deployUrl: team.deployUrl ?? '',
      videoUrl: team.videoUrl ?? '',
      screenshotUrl: team.screenshotUrl ?? '',
      tipo_app: team.tipo_app ?? '',
      description: team.description ?? ''
    });
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

  const handleEditTeam = async (e) => {
    e.preventDefault();
    if (!showEditTeam) return;

    // Validar campos obligatorios - siempre validar todos los campos
    const errors = [];

    // Validar displayName
    if (!teamFormData.displayName || typeof teamFormData.displayName !== 'string' || teamFormData.displayName.trim() === '') {
      errors.push('El nombre del grupo (para mostrar) es obligatorio');
    }

    // Validar appName
    if (!teamFormData.appName || typeof teamFormData.appName !== 'string' || teamFormData.appName.trim() === '') {
      errors.push('El nombre de la aplicación es obligatorio');
    }

    // Validar deployUrl
    if (!teamFormData.deployUrl || typeof teamFormData.deployUrl !== 'string' || teamFormData.deployUrl.trim() === '') {
      errors.push('La URL de despliegue es obligatoria');
    } else {
      const trimmedUrl = teamFormData.deployUrl.trim();
      if (!validateUrl(trimmedUrl)) {
        errors.push('La URL de despliegue no tiene un formato válido (debe comenzar con http:// o https://)');
      }
    }

    // Validar videoUrl
    if (!teamFormData.videoUrl || typeof teamFormData.videoUrl !== 'string' || teamFormData.videoUrl.trim() === '') {
      errors.push('La URL del video es obligatoria');
    } else {
      const trimmedUrl = teamFormData.videoUrl.trim();
      if (!validateUrl(trimmedUrl)) {
        errors.push('La URL del video no tiene un formato válido (debe comenzar con http:// o https://)');
      }
    }

    // Validar screenshotUrl
    if (!teamFormData.screenshotUrl || typeof teamFormData.screenshotUrl !== 'string' || teamFormData.screenshotUrl.trim() === '') {
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
        displayName: teamFormData.displayName.trim(),
        appName: teamFormData.appName.trim(),
        deployUrl: teamFormData.deployUrl.trim(),
        videoUrl: teamFormData.videoUrl.trim(),
        screenshotUrl: teamFormData.screenshotUrl.trim(),
        participates: teamFormData.participates,
        helperId: showEditTeam.helperId || null,
        tipo_app: teamFormData.tipo_app || null,
        description: teamFormData.description.trim() || null
      };
      
      await api.put(`/admin/teams/${showEditTeam.id}`, cleanedData);
      success('Equipo actualizado exitosamente');
      setShowEditTeam(null);
      fetchDashboardData();
    } catch (err) {
      console.error('Error al actualizar equipo:', err);
      const errorMessage = err.response?.data?.error || 'Error al actualizar el equipo';
      error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTeamImageUpload = async (file) => {
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
      setImageLoading(true);
      
      const response = await api.post('/upload/screenshot', formData);

      if (response.data.url) {
        setTeamFormData(prev => ({ ...prev, screenshotUrl: response.data.url }));
        success('Imagen subida exitosamente');
      } else {
        throw new Error('No se recibió URL de la imagen');
      }
    } catch (err) {
      console.error('Error al subir imagen:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Error al subir la imagen';
      error(errorMessage);
    } finally {
      setImageLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('¿Estás seguro de eliminar este equipo? Esta acción no se puede deshacer.')) return;
    
    try {
      await api.delete(`/admin/teams/${teamId}`);
      success('Equipo eliminado exitosamente');
      fetchDashboardData();
    } catch (err) {
      error('Error al eliminar el equipo');
    }
  };

  const handleToggleParticipation = async (team) => {
    const newParticipationStatus = !team.participates;
    
    try {
      await api.put(`/admin/teams/${team.id}`, {
        participates: newParticipationStatus,
        displayName: team.displayName,
        appName: team.appName,
        deployUrl: team.deployUrl,
        videoUrl: team.videoUrl,
        screenshotUrl: team.screenshotUrl,
        helperId: team.helperId
      });
      success(`Equipo ${newParticipationStatus ? 'marcado como participante' : 'marcado como no participante'}`);
      fetchDashboardData();
    } catch (err) {
      error('Error al actualizar el estado de participación');
    }
  };

  // Funciones CRUD para Ayudantes
  const handleCreateHelper = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const helperData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password')
    };

    try {
      setSaving(true);
      await api.post('/admin/helpers', helperData);
      success('Ayudante creado exitosamente');
      setShowCreateHelper(false);
      fetchDashboardData();
    } catch (err) {
      error(err.response?.data?.error || 'Error al crear el ayudante');
    } finally {
      setSaving(false);
    }
  };

  const handleEditHelper = async (e) => {
    e.preventDefault();
    if (!showEditHelper) return;
    
    const formData = new FormData(e.target);
    const helperData = {
      name: formData.get('name'),
      email: formData.get('email')
    };

    try {
      setSaving(true);
      await api.put(`/admin/helpers/${showEditHelper.id}`, helperData);
      success('Ayudante actualizado exitosamente');
      setShowEditHelper(null);
      fetchDashboardData();
    } catch (err) {
      error(err.response?.data?.error || 'Error al actualizar el ayudante');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHelper = async (helperId) => {
    if (!window.confirm('¿Estás seguro de eliminar este ayudante? Esta acción no se puede deshacer.')) return;
    
    try {
      await api.delete(`/admin/helpers/${helperId}`);
      success('Ayudante eliminado exitosamente');
      fetchDashboardData();
    } catch (err) {
      error('Error al eliminar el ayudante');
    }
  };

  // Funciones CRUD para Estudiantes
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const studentData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      teamId: formData.get('teamId') || null
    };

    try {
      setSaving(true);
      await api.post('/admin/students', studentData);
      success('Estudiante creado exitosamente');
      setShowCreateStudent(false);
      fetchDashboardData();
    } catch (err) {
      error(err.response?.data?.error || 'Error al crear el estudiante');
    } finally {
      setSaving(false);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!showEditStudent) return;
    
    const formData = new FormData(e.target);
    const studentData = {
      name: formData.get('name'),
      email: formData.get('email'),
      teamId: formData.get('teamId') || null
    };

    try {
      setSaving(true);
      await api.put(`/admin/students/${showEditStudent.id}`, studentData);
      success('Estudiante actualizado exitosamente');
      setShowEditStudent(null);
      fetchDashboardData();
    } catch (err) {
      error(err.response?.data?.error || 'Error al actualizar el estudiante');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('¿Estás seguro de eliminar este estudiante? Esta acción no se puede deshacer.')) return;
    
    try {
      await api.delete(`/admin/students/${studentId}`);
      success('Estudiante eliminado exitosamente');
      fetchDashboardData();
    } catch (err) {
      error('Error al eliminar el estudiante');
    }
  };

  // Funciones CRUD para Administradores
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const adminData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password')
    };

    try {
      setSaving(true);
      await api.post('/admin/admins', adminData);
      success('Administrador creado exitosamente');
      setShowCreateAdmin(false);
      fetchDashboardData();
    } catch (err) {
      error(err.response?.data?.error || 'Error al crear el administrador');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    if (!showEditAdmin) return;
    
    const formData = new FormData(e.target);
    const adminData = {
      name: formData.get('name'),
      email: formData.get('email')
    };

    try {
      setSaving(true);
      await api.put(`/admin/admins/${showEditAdmin.id}`, adminData);
      success('Administrador actualizado exitosamente');
      setShowEditAdmin(null);
      fetchDashboardData();
    } catch (err) {
      error(err.response?.data?.error || 'Error al actualizar el administrador');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdminClick = (admin) => {
    setShowDeleteAdminModal(admin);
    setDeletePasswordError('');
  };

  const handleDeleteAdminConfirm = async (password) => {
    if (!showDeleteAdminModal) return;

    setDeletePasswordLoading(true);
    setDeletePasswordError('');
    
    try {
      // Enviar la contraseña en el body del DELETE
      await api.delete(`/admin/admins/${showDeleteAdminModal.id}`, {
        data: { password }
      });
      success('Administrador eliminado exitosamente');
      setShowDeleteAdminModal(null);
      fetchDashboardData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al eliminar el administrador';
      setDeletePasswordError(errorMsg);
      error(errorMsg);
    } finally {
      setDeletePasswordLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteAdminModal(null);
    setDeletePasswordError('');
    setDeletePasswordLoading(false);
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

    // Ordenar por defecto: primero completos (3 votos), luego en proceso (1-2 votos), luego sin votar (0 votos)
    filtered.sort((a, b) => {
      const countA = a.votes.length;
      const countB = b.votes.length;
      
      // Prioridad: 3 votos > 1-2 votos > 0 votos
      if (countA === 3 && countB < 3) return -1;
      if (countA < 3 && countB === 3) return 1;
      if (countA > 0 && countA < 3 && countB === 0) return -1;
      if (countA === 0 && countB > 0 && countB < 3) return 1;
      
      // Si ambos están en el mismo grupo, ordenar por cantidad descendente
      // (dentro de cada grupo: más votos primero)
      if (countA !== countB) {
        return countB - countA;
      }
      
      // Si tienen el mismo número de votos, ordenar alfabéticamente por nombre
      return a.studentName.localeCompare(b.studentName);
    });

    return filtered;
  };

  const getFilteredVotesByHelper = () => {
    let filtered = [...votesByHelper];

    // Filtro por búsqueda
    if (dashboardFilters.searchTerm) {
      const term = dashboardFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(helper => 
        helper.helperName.toLowerCase().includes(term) ||
        helper.helperEmail.toLowerCase().includes(term) ||
        helper.votes.some(vote => 
          (vote.displayName && vote.displayName.toLowerCase().includes(term)) ||
          (vote.teamName && vote.teamName.toLowerCase().includes(term))
        )
      );
    }

    // Ordenar por cantidad de votos descendente, luego alfabéticamente
    filtered.sort((a, b) => {
      const countA = a.votes.length;
      const countB = b.votes.length;
      
      if (countA !== countB) {
        return countB - countA;
      }
      
      return a.helperName.localeCompare(b.helperName);
    });

    return filtered;
  };

  const getFilteredVotesByAdmin = () => {
    let filtered = [...votesByAdmin];

    // Filtro por búsqueda
    if (dashboardFilters.searchTerm) {
      const term = dashboardFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(admin => 
        admin.adminName.toLowerCase().includes(term) ||
        admin.adminEmail.toLowerCase().includes(term) ||
        admin.votes.some(vote => 
          (vote.displayName && vote.displayName.toLowerCase().includes(term)) ||
          (vote.teamName && vote.teamName.toLowerCase().includes(term))
        )
      );
    }

    // Ordenar por cantidad de votos descendente, luego alfabéticamente
    filtered.sort((a, b) => {
      const countA = a.votes.length;
      const countB = b.votes.length;
      
      if (countA !== countB) {
        return countB - countA;
      }
      
      return a.adminName.localeCompare(b.adminName);
    });

    return filtered;
  };

  // Funciones para resetear filtros
  const resetDashboardFilters = () => {
    setDashboardFilters({
      teamParticipation: 'all',
      studentVotingStatus: 'all',
      searchTerm: ''
    });
  };

  const resetStudentFilters = () => {
    setStudentFilters({
      votingStatus: 'all',
      searchTerm: '',
      teamId: ''
    });
  };

  const resetTeamFilters = () => {
    setTeamFilters({
      participation: 'all',
      searchTerm: '',
      helperId: '',
      tipoApp: '',
      sortBy: 'default'
    });
  };

  const resetHelperFilters = () => {
    setHelperFilters({
      searchTerm: ''
    });
  };

  const resetAdminFilters = () => {
    setAdminFilters({
      searchTerm: ''
    });
  };

  const getFilteredHelpers = () => {
    let filtered = [...helpers];

    // Filtro por búsqueda
    if (helperFilters.searchTerm) {
      const term = helperFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(helper => 
        (helper.name && helper.name.toLowerCase().includes(term)) ||
        (helper.email && helper.email.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const getFilteredAdmins = () => {
    let filtered = [...admins];

    // Filtro por búsqueda
    if (adminFilters.searchTerm) {
      const term = adminFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(admin => 
        (admin.name && admin.name.toLowerCase().includes(term)) ||
        (admin.email && admin.email.toLowerCase().includes(term))
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

    // Filtro por tipo de aplicación
    if (teamFilters.tipoApp) {
      filtered = filtered.filter(team => team.tipo_app === teamFilters.tipoApp);
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

    // Ordenar por votos (solo si no es 'default')
    if (teamFilters.sortBy !== 'default') {
      filtered.sort((a, b) => {
        const voteCountA = votesSummary.find(v => v.teamId === a.id)?.voteCount || 0;
        const voteCountB = votesSummary.find(v => v.teamId === b.id)?.voteCount || 0;
        
        if (teamFilters.sortBy === 'asc') {
          return voteCountA - voteCountB;
        } else {
          return voteCountB - voteCountA;
        }
      });
    }

    return filtered;
  };

  const getFilteredStudents = () => {
    let filtered = [...students];

    // Crear mapa de conteo de votos para todos los estudiantes (necesario para ordenamiento y filtros)
    const studentVoteCounts = new Map();
    votesByStudent.forEach(s => {
      studentVoteCounts.set(s.studentId, s.votes.length);
    });

    // Filtro por equipo
    if (studentFilters.teamId) {
      filtered = filtered.filter(student => 
        student.team && student.team.id.toString() === studentFilters.teamId
      );
    }

    // Filtro por estado de votación
    if (studentFilters.votingStatus !== 'all') {
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

    // Ordenar por defecto: primero completos (3 votos), luego en proceso (1-2 votos), luego sin votar (0 votos)
    filtered.sort((a, b) => {
      const countA = studentVoteCounts.get(a.id) || 0;
      const countB = studentVoteCounts.get(b.id) || 0;
      
      // Prioridad: 3 votos > 1-2 votos > 0 votos
      if (countA === 3 && countB < 3) return -1;
      if (countA < 3 && countB === 3) return 1;
      if (countA > 0 && countA < 3 && countB === 0) return -1;
      if (countA === 0 && countB > 0 && countB < 3) return 1;
      
      // Si ambos están en el mismo grupo, ordenar por cantidad descendente
      // (dentro de cada grupo: más votos primero)
      if (countA !== countB) {
        return countB - countA;
      }
      
      // Si tienen el mismo número de votos, ordenar alfabéticamente por nombre
      return a.name.localeCompare(b.name);
    });

    return filtered;
  };


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
              {loading.dashboard && (
                <div className="section-loading">Cargando datos del dashboard...</div>
              )}
              {!loading.dashboard && (
              <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total de Alumnos</h3>
                  <p className="stat-value">{animatedTotalStudents}</p>
                </div>
                <div className="stat-card">
                  <h3>Total de Votos</h3>
                  <p className="stat-value">{animatedTotalVotes}</p>
                </div>
                <div className="stat-card">
                  <h3>Equipos Participantes</h3>
                  <p className="stat-value">{animatedParticipatingTeams}</p>
                </div>
              </div>

              {/* Filtros del Dashboard */}
              <div className="filters-top-section">
                <input
                  type="text"
                  placeholder="Buscar por nombre, grupo, aplicación..."
                  value={dashboardFilters.searchTerm}
                  onChange={(e) => setDashboardFilters({ ...dashboardFilters, searchTerm: e.target.value })}
                  className="search-input"
                />
                
                <FilterDropdown onReset={resetDashboardFilters}>
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
                </FilterDropdown>
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
                    {(showAllVotesSummary ? getFilteredVotesSummary() : getFilteredVotesSummary().slice(0, 20)).map(item => (
                      <tr key={item.teamId}>
                        <td>{capitalizeName(item.displayName || item.groupName)}</td>
                        <td>{item.appName ? capitalizeName(item.appName) : '-'}</td>
                        <td>{item.voteCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredVotesSummary().length > 20 && (
                  <button 
                    onClick={() => setShowAllVotesSummary(!showAllVotesSummary)}
                    className="show-more-button"
                  >
                    {showAllVotesSummary 
                      ? `Ver menos (mostrando ${getFilteredVotesSummary().length})` 
                      : `Ver más (${getFilteredVotesSummary().length - 20} más)`
                    }
                  </button>
                )}
                {getFilteredVotesSummary().length === 0 && (
                  <p className="no-results">No se encontraron equipos con los filtros seleccionados</p>
                )}
              </div>

              <div className="votes-by-admin">
                <div className="votes-by-student-header">
                  <h2>Votos por Administrador ({getFilteredVotesByAdmin().length})</h2>
                  <button
                    onClick={() => setShowDeleteAdminVoteButtons(!showDeleteAdminVoteButtons)}
                    className={`toggle-delete-buttons ${showDeleteAdminVoteButtons ? 'active' : ''}`}
                  >
                    {showDeleteAdminVoteButtons ? '👁️ Ocultar botones eliminar' : '👁️‍🗨️ Mostrar botones eliminar'}
                  </button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Administrador</th>
                      <th>Email</th>
                      <th>Votos</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllAdmins ? getFilteredVotesByAdmin() : getFilteredVotesByAdmin().slice(0, 20)).map(admin => (
                      <tr key={admin.adminId}>
                        <td>{capitalizeName(admin.adminName)}</td>
                        <td>{admin.adminEmail}</td>
                        <td>
                          {admin.votes.length > 0 ? (
                            <ul>
                              {admin.votes.map(vote => (
                                <li key={vote.voteId}>
                                  {capitalizeName(vote.displayName || vote.teamName)}
                                  {showDeleteAdminVoteButtons && (
                                    <button
                                      onClick={() => handleDeleteVote(vote.voteId)}
                                      className="delete-vote-button"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            'Sin votos'
                          )}
                        </td>
                        <td>
                          <span className={`vote-status-badge ${admin.votes.length === 3 ? 'complete' : admin.votes.length > 0 ? 'in-progress' : 'not-voted'}`}>
                            {admin.votes.length === 3 ? '✓ Completa' : admin.votes.length > 0 ? '⏳ En proceso' : '○ Sin votar'}
                          </span>
                        </td>
                        <td>
                          {admin.votes.length > 0 && (
                            <button
                              onClick={() => handleDeleteAllAdminVotes(admin.adminId)}
                              className="delete-all-votes-button"
                              title={`Eliminar todos los votos (${admin.votes.length})`}
                            >
                              🗑️ Eliminar votos
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredVotesByAdmin().length > 20 && (
                  <button 
                    onClick={() => setShowAllAdmins(!showAllAdmins)}
                    className="show-more-button"
                  >
                    {showAllAdmins 
                      ? `Ver menos (mostrando ${getFilteredVotesByAdmin().length})` 
                      : `Ver más (${getFilteredVotesByAdmin().length - 20} más)`
                    }
                  </button>
                )}
                {getFilteredVotesByAdmin().length === 0 && (
                  <p className="no-results">No se encontraron administradores con los filtros seleccionados</p>
                )}
              </div>

              <div className="votes-by-helper">
                <div className="votes-by-student-header">
                  <h2>Votos por Ayudante ({getFilteredVotesByHelper().length})</h2>
                  <button
                    onClick={() => setShowDeleteHelperVoteButtons(!showDeleteHelperVoteButtons)}
                    className={`toggle-delete-buttons ${showDeleteHelperVoteButtons ? 'active' : ''}`}
                  >
                    {showDeleteHelperVoteButtons ? '👁️ Ocultar botones eliminar' : '👁️‍🗨️ Mostrar botones eliminar'}
                  </button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ayudante</th>
                      <th>Email</th>
                      <th>Votos</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllHelpers ? getFilteredVotesByHelper() : getFilteredVotesByHelper().slice(0, 20)).map(helper => (
                      <tr key={helper.helperId}>
                        <td>{capitalizeName(helper.helperName)}</td>
                        <td>{helper.helperEmail}</td>
                        <td>
                          {helper.votes.length > 0 ? (
                            <ul>
                              {helper.votes.map(vote => (
                                <li key={vote.voteId}>
                                  {capitalizeName(vote.displayName || vote.teamName)}
                                  {showDeleteHelperVoteButtons && (
                                    <button
                                      onClick={() => handleDeleteVote(vote.voteId)}
                                      className="delete-vote-button"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            'Sin votos'
                          )}
                        </td>
                        <td>
                          <span className={`vote-status-badge ${helper.votes.length === 3 ? 'complete' : helper.votes.length > 0 ? 'in-progress' : 'not-voted'}`}>
                            {helper.votes.length === 3 ? '✓ Completa' : helper.votes.length > 0 ? '⏳ En proceso' : '○ Sin votar'}
                          </span>
                        </td>
                        <td>
                          {helper.votes.length > 0 && (
                            <button
                              onClick={() => handleDeleteAllHelperVotes(helper.helperId)}
                              className="delete-all-votes-button"
                              title={`Eliminar todos los votos (${helper.votes.length})`}
                            >
                              🗑️ Eliminar votos
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredVotesByHelper().length > 20 && (
                  <button 
                    onClick={() => setShowAllHelpers(!showAllHelpers)}
                    className="show-more-button"
                  >
                    {showAllHelpers 
                      ? `Ver menos (mostrando ${getFilteredVotesByHelper().length})` 
                      : `Ver más (${getFilteredVotesByHelper().length - 20} más)`
                    }
                  </button>
                )}
                {getFilteredVotesByHelper().length === 0 && (
                  <p className="no-results">No se encontraron ayudantes con los filtros seleccionados</p>
                )}
              </div>

              <div className="votes-by-student">
                <div className="votes-by-student-header">
                  <h2>Votos por Estudiante ({getFilteredVotesByStudent().length})</h2>
                  <button
                    onClick={() => setShowDeleteVoteButtons(!showDeleteVoteButtons)}
                    className={`toggle-delete-buttons ${showDeleteVoteButtons ? 'active' : ''}`}
                  >
                    {showDeleteVoteButtons ? '👁️ Ocultar botones eliminar' : '👁️‍🗨️ Mostrar botones eliminar'}
                  </button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Email</th>
                      <th>Votos</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllStudents ? getFilteredVotesByStudent() : getFilteredVotesByStudent().slice(0, 20)).map(student => (
                      <tr key={student.studentId}>
                        <td>{capitalizeName(student.studentName)}</td>
                        <td>{student.studentEmail}</td>
                        <td>
                          {student.votes.length > 0 ? (
                            <ul>
                              {student.votes.map(vote => (
                                <li key={vote.voteId}>
                                  {capitalizeName(vote.displayName || vote.teamName)}
                                  {showDeleteVoteButtons && (
                                    <button
                                      onClick={() => handleDeleteVote(vote.voteId)}
                                      className="delete-vote-button"
                                    >
                                      Eliminar
                                    </button>
                                  )}
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
                        <td>
                          {student.votes.length > 0 && (
                            <button
                              onClick={() => handleDeleteAllVotes(student.studentId)}
                              className="delete-all-votes-button"
                              title={`Eliminar todos los votos (${student.votes.length})`}
                            >
                              🗑️ Eliminar votos
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredVotesByStudent().length > 20 && (
                  <button 
                    onClick={() => setShowAllStudents(!showAllStudents)}
                    className="show-more-button"
                  >
                    {showAllStudents 
                      ? `Ver menos (mostrando ${getFilteredVotesByStudent().length})` 
                      : `Ver más (${getFilteredVotesByStudent().length - 20} más)`
                    }
                  </button>
                )}
                {getFilteredVotesByStudent().length === 0 && (
                  <p className="no-results">No se encontraron estudiantes con los filtros seleccionados</p>
                )}
              </div>
              </>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <>
              {loading.config && (
                <div className="section-loading">Cargando configuración...</div>
              )}
              {!loading.config && config && (
                <div className="config-content">
                  <div className="config-header">
                    <h2>⚙️ Configuración de Votaciones</h2>
                    <p className="config-subtitle">Gestiona el período de votación del concurso</p>
                  </div>
                  
                  <div className="config-card">
                    <div className="config-status-section">
                      <h3>Estado Actual</h3>
                      <div className="status-badges">
                        <span className={`status-badge-large ${config.isOpen ? 'status-open' : 'status-closed'}`}>
                          {config.isOpen ? '✓ Abierta' : '✗ Cerrada'}
                        </span>
                      </div>
                      <div className="config-info-box">
                        <div className="info-item">
                          <span className="info-label">📅 Fecha de cierre actual:</span>
                          <span className="info-value">{new Date(config.votingDeadline).toLocaleString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="config-form-section">
                      <h3>Actualizar Fecha de Cierre</h3>
                      <form onSubmit={handleUpdateDeadline} className="config-form">
                        <div className="form-group">
                          <label>Nueva fecha de cierre</label>
                          <input
                            type="datetime-local"
                            name="deadline"
                            required
                            defaultValue={formatDateForInput(config.votingDeadline)}
                            className="config-input"
                          />
                        </div>
                        <button type="submit" className="config-submit-button">
                          💾 Actualizar Fecha
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'students' && (
            <>
              {loading.students && (
                <div className="section-loading">Cargando estudiantes...</div>
              )}
              {!loading.students && (
            <div className="table-content">
              <div className="section-header">
                <h2>Estudiantes</h2>
                <button 
                  className="create-button"
                  onClick={() => setShowCreateStudent(true)}
                >
                  + Crear Estudiante
                </button>
              </div>
              
              {/* Filtros para Estudiantes */}
              <div className="filters-top-section">
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o grupo..."
                  value={studentFilters.searchTerm}
                  onChange={(e) => setStudentFilters({ ...studentFilters, searchTerm: e.target.value })}
                  className="search-input"
                />
                
                <FilterDropdown onReset={resetStudentFilters}>
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
                </FilterDropdown>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Equipo</th>
                    <th>Estado Votación</th>
                    <th>Acciones</th>
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
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="edit-button-small"
                              onClick={() => setShowEditStudent(student)}
                            >
                              Editar
                            </button>
                            <button 
                              className="delete-button-small"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
                              Eliminar
                            </button>
                          </div>
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
            </>
          )}

          {activeTab === 'helpers' && (
            <>
              {loading.helpers && (
                <div className="section-loading">Cargando ayudantes...</div>
              )}
              {!loading.helpers && (
            <div className="table-content">
              <div className="section-header">
                <h2>Ayudantes</h2>
                <button 
                  className="create-button"
                  onClick={() => setShowCreateHelper(true)}
                >
                  + Crear Ayudante
                </button>
              </div>
              
              {/* Filtros para Ayudantes */}
              <div className="filters-top-section">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={helperFilters.searchTerm}
                  onChange={(e) => setHelperFilters({ ...helperFilters, searchTerm: e.target.value })}
                  className="search-input"
                />
              </div>
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredHelpers().map(helper => (
                    <tr key={helper.id}>
                      <td>{capitalizeName(helper.name)}</td>
                      <td>{helper.email}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="edit-button-small"
                            onClick={() => setShowEditHelper(helper)}
                          >
                            Editar
                          </button>
                          <button 
                            className="delete-button-small"
                            onClick={() => handleDeleteHelper(helper.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              )}
            </>
          )}

          {activeTab === 'admins' && (
            <>
              {loading.admins && (
                <div className="section-loading">Cargando administradores...</div>
              )}
              {!loading.admins && (
            <div className="table-content">
              <div className="section-header">
                <h2>Administradores</h2>
                <button 
                  className="create-button"
                  onClick={() => setShowCreateAdmin(true)}
                >
                  + Crear Administrador
                </button>
              </div>
              
              {/* Filtros para Administradores */}
              <div className="filters-top-section">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={adminFilters.searchTerm}
                  onChange={(e) => setAdminFilters({ ...adminFilters, searchTerm: e.target.value })}
                  className="search-input"
                />
              </div>
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAdmins().map(admin => (
                    <tr key={admin.id}>
                      <td>{capitalizeName(admin.name)}</td>
                      <td>{admin.email}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="edit-button-small"
                            onClick={() => setShowEditAdmin(admin)}
                          >
                            Editar
                          </button>
                          <button 
                            className="delete-button-small"
                            onClick={() => handleDeleteAdminClick(admin)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              )}
            </>
          )}

          {activeTab === 'teams' && (
            <>
              {loading.teams && (
                <div className="section-loading">Cargando equipos...</div>
              )}
              {!loading.teams && (
            <div className="table-content">
              <div className="section-header">
                <h2>Equipos</h2>
                <button 
                  className="create-button"
                  onClick={() => setShowCreateTeam(true)}
                >
                  + Crear Equipo
                </button>
              </div>
              
              {/* Filtros para Equipos */}
              <div className="filters-top-section">
                <input
                  type="text"
                  placeholder="Buscar por nombre equipo, aplicación o ayudante..."
                  value={teamFilters.searchTerm}
                  onChange={(e) => setTeamFilters({ ...teamFilters, searchTerm: e.target.value })}
                  className="search-input"
                />
                
                <FilterDropdown onReset={resetTeamFilters}>
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
                    <label>Tipo de aplicación:</label>
                    <select
                      value={teamFilters.tipoApp}
                      onChange={(e) => setTeamFilters({ ...teamFilters, tipoApp: e.target.value })}
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

                  <div className="filter-group">
                    <label>Ordenar por votos:</label>
                    <select
                      value={teamFilters.sortBy}
                      onChange={(e) => setTeamFilters({ ...teamFilters, sortBy: e.target.value })}
                      className="filter-select"
                    >
                      <option value="default">Por defecto</option>
                      <option value="desc">Mayor a menor</option>
                      <option value="asc">Menor a mayor</option>
                    </select>
                  </div>
                </FilterDropdown>
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
                    <th>Acciones</th>
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
                          <label className="participation-switch">
                            <input
                              type="checkbox"
                              checked={team.participates}
                              onChange={() => handleToggleParticipation(team)}
                            />
                            <span className="switch-slider"></span>
                          </label>
                        </td>
                        <td>{team.helper?.name ? capitalizeName(team.helper.name) : '-'}</td>
                        <td>{voteCount}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="edit-button-small"
                              onClick={() => handleEditTeamClick(team)}
                            >
                              Editar
                            </button>
                            <button 
                              className="delete-button-small"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
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
            </>
          )}
        </div>
      </div>

      {/* Modal Crear Equipo */}
      {showCreateTeam && (
        <div className="modal-overlay" onClick={() => setShowCreateTeam(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Equipo</h2>
              <button className="modal-close" onClick={() => setShowCreateTeam(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>Nombre del Grupo <span className="required">*</span></label>
                <input type="text" name="groupName" required />
              </div>
              <div className="form-group">
                <label>Nombre para Mostrar</label>
                <input type="text" name="displayName" />
              </div>
              <div className="form-group">
                <label>Nombre de la Aplicación</label>
                <input type="text" name="appName" />
              </div>
              <div className="form-group">
                <label>Tipo de aplicación</label>
                <select name="tipo_app">
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
                <label>Descripción (máximo 300 caracteres)</label>
                <textarea
                  name="description"
                  placeholder="Descripción de la aplicación..."
                  rows={4}
                  maxLength={300}
                  onChange={(e) => {
                    setCreateDescriptionLength(e.target.value.length);
                  }}
                  style={{
                    padding: '0.75rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    resize: 'vertical',
                    width: '100%'
                  }}
                />
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  {createDescriptionLength}/300 caracteres
                </p>
              </div>
              <div className="form-group">
                <label>Ayudante</label>
                <select name="helperId">
                  <option value="">Sin ayudante</option>
                  {helpers.map(helper => (
                    <option key={helper.id} value={helper.id}>
                      {capitalizeName(helper.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" name="participates" value="true" />
                  Participa en el concurso
                </label>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowCreateTeam(false)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Equipo */}
      {showEditTeam && (
        <div 
          className="edit-modal-overlay" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setClickStartedInModal(false);
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !clickStartedInModal) {
              setShowEditTeam(null);
            }
            setClickStartedInModal(false);
          }}
        >
          <div 
            className="edit-modal" 
            onMouseDown={(e) => {
              setClickStartedInModal(true);
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="edit-modal-close" 
              onClick={() => setShowEditTeam(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="edit-modal-header">
              <h2>Editar Equipo</h2>
              <Switch
                checked={teamFormData.participates}
                onChange={(e) => setTeamFormData(prev => ({ ...prev, participates: e.target.checked }))}
                label="Participa en el concurso"
                disabled={saving}
              />
            </div>

            <form onSubmit={handleEditTeam}>
              <div className="form-group">
                <label>Nombre oficial del grupo</label>
                <input
                  type="text"
                  value={showEditTeam.groupName}
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
                  value={teamFormData.displayName}
                  onChange={(e) => setTeamFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Nombre visible del equipo"
                />
              </div>

              <div className="form-group">
                <label>
                  Nombre de la aplicación <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={teamFormData.appName}
                  onChange={(e) => setTeamFormData(prev => ({ ...prev, appName: e.target.value }))}
                  placeholder="Nombre de la app"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Tipo de aplicación
                </label>
                <select
                  value={teamFormData.tipo_app}
                  onChange={(e) => setTeamFormData(prev => ({ ...prev, tipo_app: e.target.value }))}
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
                <label>Descripción (máximo 300 caracteres)</label>
                <textarea
                  value={teamFormData.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 300) {
                      setTeamFormData(prev => ({ ...prev, description: value }));
                    }
                  }}
                  placeholder="Descripción de la aplicación..."
                  rows={4}
                  maxLength={300}
                  style={{
                    padding: '0.75rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    resize: 'vertical',
                    width: '100%'
                  }}
                />
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  {teamFormData.description.length}/300 caracteres
                </p>
              </div>

              <div className="form-group">
                <label>
                  URL de despliegue <span className="required">*</span>
                </label>
                <input
                  type="url"
                  value={teamFormData.deployUrl}
                  onChange={(e) => setTeamFormData(prev => ({ ...prev, deployUrl: e.target.value }))}
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
                  value={teamFormData.videoUrl}
                  onChange={(e) => setTeamFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/..."
                  required
                />
              </div>

              <div className="form-group">
                <FileDropzone
                  onFileSelect={handleTeamImageUpload}
                  currentImageUrl={teamFormData.screenshotUrl}
                  disabled={imageLoading || saving}
                  label="Imagen de Portada"
                />
                {imageLoading && (
                  <p style={{ textAlign: 'center', color: '#667eea', marginTop: '0.5rem', fontWeight: 500 }}>
                    Subiendo imagen...
                  </p>
                )}
              </div>

              <div className="modal-buttons">
                <button 
                  type="button"
                  onClick={() => setShowEditTeam(null)} 
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

      {/* Modal Crear Ayudante */}
      {showCreateHelper && (
        <div className="modal-overlay" onClick={() => setShowCreateHelper(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Ayudante</h2>
              <button className="modal-close" onClick={() => setShowCreateHelper(false)}>×</button>
            </div>
            <form onSubmit={handleCreateHelper}>
              <div className="form-group">
                <label>Nombre <span className="required">*</span></label>
                <input type="text" name="name" required />
              </div>
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input type="email" name="email" required />
              </div>
              <div className="form-group">
                <label>Contraseña <span className="required">*</span></label>
                <input type="password" name="password" required minLength="6" />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowCreateHelper(false)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Ayudante */}
      {showEditHelper && (
        <div className="modal-overlay" onClick={() => setShowEditHelper(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Ayudante</h2>
              <button className="modal-close" onClick={() => setShowEditHelper(null)}>×</button>
            </div>
            <form onSubmit={handleEditHelper}>
              <div className="form-group">
                <label>Nombre <span className="required">*</span></label>
                <input type="text" name="name" defaultValue={showEditHelper.name} required />
              </div>
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input type="email" name="email" defaultValue={showEditHelper.email} required />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowEditHelper(null)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Estudiante */}
      {showCreateStudent && (
        <div className="modal-overlay" onClick={() => setShowCreateStudent(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Estudiante</h2>
              <button className="modal-close" onClick={() => setShowCreateStudent(false)}>×</button>
            </div>
            <form onSubmit={handleCreateStudent}>
              <div className="form-group">
                <label>Nombre <span className="required">*</span></label>
                <input type="text" name="name" required />
              </div>
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input type="email" name="email" required />
              </div>
              <div className="form-group">
                <label>Contraseña <span className="required">*</span></label>
                <input type="password" name="password" required minLength="6" />
              </div>
              <div className="form-group">
                <label>Equipo</label>
                <select name="teamId">
                  <option value="">Sin equipo</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {capitalizeName(team.groupName)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowCreateStudent(false)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Estudiante */}
      {showEditStudent && (
        <div className="modal-overlay" onClick={() => setShowEditStudent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Estudiante</h2>
              <button className="modal-close" onClick={() => setShowEditStudent(null)}>×</button>
            </div>
            <form onSubmit={handleEditStudent}>
              <div className="form-group">
                <label>Nombre <span className="required">*</span></label>
                <input type="text" name="name" defaultValue={showEditStudent.name} required />
              </div>
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input type="email" name="email" defaultValue={showEditStudent.email} required />
              </div>
              <div className="form-group">
                <label>Equipo</label>
                <select name="teamId" defaultValue={showEditStudent.teamId || ''}>
                  <option value="">Sin equipo</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {capitalizeName(team.groupName)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowEditStudent(null)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Administrador */}
      {showCreateAdmin && (
        <div className="modal-overlay" onClick={() => setShowCreateAdmin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Administrador</h2>
              <button className="modal-close" onClick={() => setShowCreateAdmin(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAdmin}>
              <div className="form-group">
                <label>Nombre <span className="required">*</span></label>
                <input type="text" name="name" required />
              </div>
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input type="email" name="email" required />
              </div>
              <div className="form-group">
                <label>Contraseña <span className="required">*</span></label>
                <input type="password" name="password" required minLength="6" />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowCreateAdmin(false)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Administrador */}
      {showEditAdmin && (
        <div className="modal-overlay" onClick={() => setShowEditAdmin(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Administrador</h2>
              <button className="modal-close" onClick={() => setShowEditAdmin(null)}>×</button>
            </div>
            <form onSubmit={handleEditAdmin}>
              <div className="form-group">
                <label>Nombre <span className="required">*</span></label>
                <input type="text" name="name" defaultValue={showEditAdmin.name} required />
              </div>
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input type="email" name="email" defaultValue={showEditAdmin.email} required />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowEditAdmin(null)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación de Administrador */}
      {showDeleteAdminModal && (
        <PasswordConfirmModal
          isOpen={!!showDeleteAdminModal}
          onClose={handleCloseDeleteModal}
          onConfirm={handleDeleteAdminConfirm}
          teamName={capitalizeName(showDeleteAdminModal.name)}
          loading={deletePasswordLoading}
          errorMessage={deletePasswordError}
          isDeleteAction={true}
        />
      )}
    </div>
  );
};

export default AdminDashboard;

