import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { capitalizeName } from '../utils/format';
import './Podium.css';

const Podium = () => {
  const [podium, setPodium] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVideoModal, setShowVideoModal] = useState(null); // Almacena el teamId del video a mostrar
  const [showPlayOverlay, setShowPlayOverlay] = useState({});
  const hoverTimeoutRef = useRef({});

  useEffect(() => {
    fetchPodium();
  }, []);

  // Convertir URL de YouTube a formato embed
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    
    if (url.includes('youtube.com/embed')) {
      return url;
    }
    
    let videoId = null;
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
    }
    
    const embedMatch = url.match(/youtube\.com\/embed\/([^&\n?#]+)/);
    if (embedMatch) {
      videoId = embedMatch[1];
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return null;
  };

  const handleScreenshotClick = useCallback((entry) => {
    if (!entry.videoUrl || showVideoModal === entry.teamId) return;
    setShowPlayOverlay(prev => ({ ...prev, [entry.teamId]: false }));
    setShowVideoModal(entry.teamId);
  }, [showVideoModal]);

  const handleCloseModal = useCallback(() => {
    setShowVideoModal(null);
    setShowPlayOverlay({});
  }, []);

  const handleOverlayClick = useCallback((e) => {
    e.stopPropagation();
    handleCloseModal();
  }, [handleCloseModal]);

  const handleMouseEnter = useCallback((teamId) => {
    if (showVideoModal === teamId) return;
    if (hoverTimeoutRef.current[teamId]) {
      clearTimeout(hoverTimeoutRef.current[teamId]);
    }
    hoverTimeoutRef.current[teamId] = null;
    setShowPlayOverlay(prev => ({ ...prev, [teamId]: true }));
  }, [showVideoModal]);

  const handleMouseLeave = useCallback((teamId) => {
    if (hoverTimeoutRef.current[teamId]) {
      clearTimeout(hoverTimeoutRef.current[teamId]);
    }
    hoverTimeoutRef.current[teamId] = setTimeout(() => {
      if (showVideoModal !== teamId) {
        setShowPlayOverlay(prev => ({ ...prev, [teamId]: false }));
      }
      hoverTimeoutRef.current[teamId] = null;
    }, 200);
  }, [showVideoModal]);

  const fetchPodium = async () => {
    try {
      const response = await api.get('/results/podium');
      console.log('Podium data received:', response.data);
      setPodium(response.data || []);
    } catch (error) {
      console.error('Error al cargar podio:', error);
      console.error('Error details:', error.response?.data);
      setPodium([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="podium-loading">Cargando resultados...</div>;
  }

  if (podium.length === 0) {
    return (
      <div className="podium-empty">
        <p>Aún no hay resultados disponibles</p>
      </div>
    );
  }

  // Separar los primeros 3 lugares del resto
  const topThree = podium.filter(entry => entry.position <= 3);
  const rest = podium.filter(entry => entry.position > 3);

  return (
    <div className="podium-container">
      <div className="podium-header">
        <h2 className="podium-title">🏆 Podio de Ganadores 🏆</h2>
        <p className="podium-subtitle">Los 5 mejores proyectos del concurso</p>
      </div>
      
      {/* Top 3 en formato podio olímpico */}
      {topThree.length > 0 && (
        <div className="podium-top-three">
          {topThree.map((entry) => {
            const isFirst = entry.position === 1;
            const isSecond = entry.position === 2;
            const isThird = entry.position === 3;

            return (
              <div
                key={entry.teamId}
                className={`podium-item-top ${isFirst ? 'first' : ''} ${isSecond ? 'second' : ''} ${isThird ? 'third' : ''} podium-animate-${entry.position}`}
              >
                <div className="podium-rank-badge">
                  {entry.position === 1 && <span className="medal">🥇</span>}
                  {entry.position === 2 && <span className="medal">🥈</span>}
                  {entry.position === 3 && <span className="medal">🥉</span>}
                  <span className="rank-number">#{entry.position}</span>
                </div>
                
                {entry.screenshotUrl && (
                  <div 
                    className={`podium-screenshot ${entry.videoUrl ? 'clickable' : ''}`}
                    style={{ backgroundImage: `url(${entry.screenshotUrl})` }}
                    onClick={() => entry.videoUrl && handleScreenshotClick(entry)}
                    onMouseEnter={() => entry.videoUrl && handleMouseEnter(entry.teamId)}
                    onMouseLeave={() => entry.videoUrl && handleMouseLeave(entry.teamId)}
                  >
                    {/* Avatares de estudiantes y ayudante sobre la imagen */}
                    <div className="podium-avatars-overlay">
                      {entry.students && entry.students.map((student) => (
                        <div key={student.id} className="podium-avatar-wrapper">
                          {student.avatarUrl ? (
                            <img 
                              src={student.avatarUrl} 
                              alt={capitalizeName(student.name)}
                              className="podium-avatar"
                            />
                          ) : (
                            <div className="podium-avatar placeholder">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="podium-avatar-tooltip">
                            <span className="tooltip-name">{capitalizeName(student.name)}</span>
                          </div>
                        </div>
                      ))}
                      {entry.helper && (
                        <div className="podium-avatar-wrapper helper-avatar">
                          {entry.helper.avatarUrl ? (
                            <img 
                              src={entry.helper.avatarUrl} 
                              alt={capitalizeName(entry.helper.name)}
                              className="podium-avatar"
                            />
                          ) : (
                            <div className="podium-avatar placeholder">
                              {entry.helper.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="podium-avatar-tooltip">
                            <span className="tooltip-label">Ayudante:</span>
                            <span className="tooltip-name">{capitalizeName(entry.helper.name)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {entry.videoUrl && showPlayOverlay[entry.teamId] && !showVideoModal && (
                      <div 
                        className="podium-play-overlay"
                        onMouseEnter={() => handleMouseEnter(entry.teamId)}
                        onMouseLeave={() => handleMouseLeave(entry.teamId)}
                      >
                        <span className="podium-play-icon">▶</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="podium-info-top">
                  <h3 className="podium-team-name">{capitalizeName(entry.displayName || entry.groupName)}</h3>
                  {entry.appName && (
                    <p className="podium-app-name">{capitalizeName(entry.appName)}</p>
                  )}
                  
                  <div className="podium-votes-top">
                    <span className="votes-label">Votos:</span>
                    <span className="votes-count">{entry.voteCount}</span>
                  </div>

                  {entry.deployUrl && (
                    <a 
                      href={entry.deployUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="podium-deploy-link"
                    >
                      Probar Aplicación
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lugares 4 y 5 */}
      {rest.length > 0 && (
        <div className="podium-rest">
          <h3 className="podium-rest-title">Otros Finalistas</h3>
          <div className="podium-rest-grid">
            {rest.map((entry, index) => (
              <div
                key={entry.teamId}
                className={`podium-item-rest podium-animate-rest-${index}`}
              >
                <div className="podium-rank-badge-rest">
                  <span className="rank-number">#{entry.position}</span>
                </div>
                
                {entry.screenshotUrl && (
                  <div 
                    className={`podium-screenshot-rest ${entry.videoUrl ? 'clickable' : ''}`}
                    style={{ backgroundImage: `url(${entry.screenshotUrl})` }}
                    onClick={() => entry.videoUrl && handleScreenshotClick(entry)}
                    onMouseEnter={() => entry.videoUrl && handleMouseEnter(entry.teamId)}
                    onMouseLeave={() => entry.videoUrl && handleMouseLeave(entry.teamId)}
                  >
                    {/* Avatares de estudiantes y ayudante sobre la imagen */}
                    <div className="podium-avatars-overlay">
                      {entry.students && entry.students.map((student) => (
                        <div key={student.id} className="podium-avatar-wrapper">
                          {student.avatarUrl ? (
                            <img 
                              src={student.avatarUrl} 
                              alt={capitalizeName(student.name)}
                              className="podium-avatar"
                            />
                          ) : (
                            <div className="podium-avatar placeholder">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="podium-avatar-tooltip">
                            <span className="tooltip-name">{capitalizeName(student.name)}</span>
                          </div>
                        </div>
                      ))}
                      {entry.helper && (
                        <div className="podium-avatar-wrapper helper-avatar">
                          {entry.helper.avatarUrl ? (
                            <img 
                              src={entry.helper.avatarUrl} 
                              alt={capitalizeName(entry.helper.name)}
                              className="podium-avatar"
                            />
                          ) : (
                            <div className="podium-avatar placeholder">
                              {entry.helper.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="podium-avatar-tooltip">
                            <span className="tooltip-label">Ayudante:</span>
                            <span className="tooltip-name">{capitalizeName(entry.helper.name)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {entry.videoUrl && showPlayOverlay[entry.teamId] && !showVideoModal && (
                      <div 
                        className="podium-play-overlay"
                        onMouseEnter={() => handleMouseEnter(entry.teamId)}
                        onMouseLeave={() => handleMouseLeave(entry.teamId)}
                      >
                        <span className="podium-play-icon">▶</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="podium-info-rest">
                  <h3 className="podium-team-name">{capitalizeName(entry.displayName || entry.groupName)}</h3>
                  {entry.appName && (
                    <p className="podium-app-name">{capitalizeName(entry.appName)}</p>
                  )}
                  
                  <div className="podium-votes-rest">
                    <span className="votes-count">{entry.voteCount}</span>
                    <span className="votes-label"> {entry.voteCount === 1 ? 'voto' : 'votos'}</span>
                  </div>

                  {entry.deployUrl && (
                    <a 
                      href={entry.deployUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="podium-deploy-link"
                    >
                      Probar Aplicación
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de video */}
      {showVideoModal && (() => {
        const entry = podium.find(e => e.teamId === showVideoModal);
        if (!entry || !entry.videoUrl) return null;
        const embedUrl = getYouTubeEmbedUrl(entry.videoUrl);
        
        return createPortal(
          <div 
            className="podium-video-modal-overlay" 
            onClick={handleOverlayClick}
          >
            <div 
              className="podium-video-modal" 
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="podium-video-modal-close" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseModal();
                }}
                type="button"
                aria-label="Cerrar video"
              >
                ×
              </button>
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Video de la aplicación"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="podium-video-iframe"
                ></iframe>
              ) : (
                <div className="podium-video-error">
                  <p>No se pudo cargar el video. URL no válida.</p>
                  {entry.videoUrl && (
                    <a href={entry.videoUrl} target="_blank" rel="noopener noreferrer">
                      Abrir en YouTube
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

export default Podium;

