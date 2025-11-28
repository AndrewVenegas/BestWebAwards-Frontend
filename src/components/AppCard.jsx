import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { capitalizeName } from '../utils/format';
import useScrollAnimation from '../hooks/useScrollAnimation';
import './AppCard.css';

const AppCard = ({ team, onVote, hasVoted, canVote, voteCount, showCounts, isFavorite, onToggleFavorite, index = 0, onEdit, showParticipates }) => {
  const [elementRef, isVisible] = useScrollAnimation({ threshold: 0.1, once: false });
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // Convertir URL de YouTube a formato embed
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    
    // Si ya es un embed URL, devolverlo
    if (url.includes('youtube.com/embed')) {
      return url;
    }
    
    // Extraer ID del video de diferentes formatos de YouTube
    let videoId = null;
    
    // Formato: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
    }
    
    // Formato: https://www.youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/youtube\.com\/embed\/([^&\n?#]+)/);
    if (embedMatch) {
      videoId = embedMatch[1];
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return null;
  };

  const handleScreenshotClick = useCallback((e) => {
    if (!team.videoUrl || showVideoModal) return;
    e.preventDefault();
    e.stopPropagation();
    setShowPlayOverlay(false);
    setShowVideoModal(true);
  }, [team.videoUrl, showVideoModal]);

  const handleCloseModal = useCallback(() => {
    setShowVideoModal(false);
    setShowPlayOverlay(false);
  }, []);

  const handleOverlayClick = useCallback((e) => {
    e.stopPropagation();
    handleCloseModal();
  }, [handleCloseModal]);

  const handleMouseEnter = useCallback(() => {
    if (!team.videoUrl || showVideoModal) return;
    // Limpiar timeout anterior si existe
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = null;
    setShowPlayOverlay(true);
  }, [team.videoUrl, showVideoModal]);

  const handleMouseLeave = useCallback(() => {
    // Limpiar timeout anterior
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Delay para evitar parpadeo cuando el mouse pasa sobre el overlay
    hoverTimeoutRef.current = setTimeout(() => {
      if (!showVideoModal) {
        setShowPlayOverlay(false);
      }
      hoverTimeoutRef.current = null;
    }, 200);
  }, [showVideoModal]);

  const embedUrl = getYouTubeEmbedUrl(team.videoUrl);

  // Limpiar timeout al desmontar y cuando el modal se abre
  useEffect(() => {
    if (showVideoModal) {
      setShowPlayOverlay(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }
  }, [showVideoModal]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(team.id);
    }
  };

  // NO aplicar disabled a toda la tarjeta - solo deshabilitar el botón de votar
  // Esto permite que los usuarios que han completado sus votos puedan seguir viendo videos, usar favoritos, etc.
  
  return (
    <div 
      ref={elementRef}
      className={`app-card ${hasVoted ? 'voted' : ''} ${isFavorite ? 'favorite' : ''} ${isVisible ? 'scroll-visible' : 'scroll-hidden'} ${isFlipped ? 'flipped' : ''}`}
      style={isVisible ? { transitionDelay: `${Math.min(index * 0.1, 0.5)}s` } : {}}
    >
      <div className="card-inner">
        {/* Front side */}
        <div className="card-front">
          {onToggleFavorite && (
            <button 
              className={`favorite-button ${isFavorite ? 'active' : ''}`}
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          )}
          {showParticipates !== undefined && (
            <div className={`app-participates-badge ${team.participates ? 'participating' : 'not-participating'}`}>
              {team.participates ? '✓ Participa' : '✗ No participa'}
            </div>
          )}
          {team.screenshotUrl && (
            <div 
              className="app-screenshot" 
              onClick={handleScreenshotClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{ backgroundImage: `url(${team.screenshotUrl})` }}
            >
              {team.videoUrl && showPlayOverlay && !showVideoModal && (
                <div 
                  className="play-overlay"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="play-icon">▶</span>
                </div>
              )}
            </div>
          )}
          
          <div 
            className="app-content"
            onClick={(e) => {
              // Solo ejecutar si el clic no fue en un botón o enlace
              const target = e.target;
              const isButton = target.tagName === 'BUTTON' || target.closest('button');
              const isLink = target.tagName === 'A' || target.closest('a');
              
              if (!isButton && !isLink && team.description) {
                e.stopPropagation();
                setIsFlipped(true);
              }
            }}
            style={{ cursor: team.description ? 'pointer' : 'default' }}
          >
            <div className="app-header-section">
              <div>
                <h3 className="app-name">{capitalizeName(team.appName || team.displayName || team.groupName)}</h3>
                <p className="app-team">by: {capitalizeName(team.displayName || team.groupName)}</p>
              </div>
              {team.description && (
                <button 
                  className="view-description-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                >
                  Ver descripción
                </button>
              )}
            </div>
            
            {team.students && team.students.length > 0 && (
              <div className="app-members">
                <h4>Integrantes:</h4>
                <div className="members-list">
                  {team.students.map((student) => (
                    <div key={student.id} className="member-item">
                      {student.avatarUrl ? (
                        <img src={student.avatarUrl} alt={capitalizeName(student.name)} className="member-avatar" />
                      ) : (
                        <div className="member-avatar placeholder">{student.name.charAt(0).toUpperCase()}</div>
                      )}
                      <span className="member-name">{capitalizeName(student.name)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showCounts && voteCount !== undefined && (
              <div className="app-vote-count">
                <strong>{voteCount}</strong> {voteCount === 1 ? 'voto' : 'votos'}
              </div>
            )}

            <div className="app-actions">
              {team.deployUrl && (
                <a 
                  href={team.deployUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="app-link"
                >
                  Probar Aplicación
                </a>
              )}
              
              {onEdit ? (
                <button 
                  className={`app-button edit-button ${team.deployUrl ? '' : 'full-width'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(team);
                  }}
                >
                  Editar
                </button>
              ) : hasVoted ? (
                <button className="app-button voted-button" disabled>
                  ✓ Ya votaste
                </button>
              ) : onVote && canVote ? (
                <button 
                  className="app-button vote-button vote-button-with-tooltip" 
                  onClick={() => onVote(team.id)}
                  title="Se pedirá confirmación"
                >
                  Votar
                </button>
              ) : onVote ? (
                <button 
                  className="app-button vote-button" 
                  disabled
                >
                  Votar
                </button>
              ) : (
                <button className="app-button vote-button" disabled>
                  {onToggleFavorite === null ? 'Solo lectura' : 'Votaciones cerradas'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Back side */}
        {team.description && (
          <div className="card-back">
            {onToggleFavorite && (
              <button 
                className={`favorite-button ${isFavorite ? 'active' : ''}`}
                onClick={handleFavoriteClick}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                {isFavorite ? '❤️' : '🤍'}
              </button>
            )}
            <div className="app-back-header">
              <h3 className="app-back-name">{capitalizeName(team.appName || team.displayName || team.groupName)}</h3>
              {team.tipo_app && (
                <p className="app-back-type">{team.tipo_app}</p>
              )}
            </div>
            <div className="app-content app-content-back">
              <div className="app-description-card">
                <div className="quote-mark quote-mark-top">"</div>
                <p 
                  className="app-description-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {team.description.length > 300 
                    ? `${team.description.substring(0, 300)}...` 
                    : team.description}
                </p>
                <div className="quote-mark quote-mark-bottom">"</div>
              </div>

              <button 
                className="view-description-button back-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
              >
                Ver datos generales
              </button>
            </div>
          </div>
        )}
      </div>

      {showVideoModal && createPortal(
        <div 
          className="video-modal-overlay" 
          onClick={handleOverlayClick}
        >
          <div 
            className="video-modal" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="video-modal-close" 
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
                className="video-iframe"
              ></iframe>
            ) : (
              <div className="video-error">
                <p>No se pudo cargar el video. URL no válida.</p>
                {team.videoUrl && (
                  <a href={team.videoUrl} target="_blank" rel="noopener noreferrer">
                    Abrir en YouTube
                  </a>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AppCard;

