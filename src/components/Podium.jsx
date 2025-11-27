import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { capitalizeName } from '../utils/format';
import Fireworks from './Fireworks';
import './Podium.css';

const Podium = () => {
  const [podium, setPodium] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVideoModal, setShowVideoModal] = useState(null); // Almacena el teamId del video a mostrar
  const [showPlayOverlay, setShowPlayOverlay] = useState({});
  const [flippedItems, setFlippedItems] = useState({}); // Estado para manejar qué items están flipped
  const [carouselIndex, setCarouselIndex] = useState(0); // Estado para el índice del carrusel
  const [fireworksInstances, setFireworksInstances] = useState([]); // Array de instancias activas de fuegos artificiales
  const hoverTimeoutRef = useRef({});
  const hasShownInitialFireworks = useRef(false); // Ref para controlar que solo se muestre una vez al inicio

  useEffect(() => {
    fetchPodium();
  }, []);

  // Reiniciar el carrusel cuando cambien los datos del podio
  useEffect(() => {
    setCarouselIndex(0);
  }, [podium.length]);

  // Separar los primeros 3 lugares del resto (antes de los returns condicionales)
  const topThree = podium.filter(entry => entry.position <= 3);
  const rest = podium.filter(entry => entry.position > 3);

  // Agrupar top 3 por posición para el carrusel
  const firstPlace = topThree.filter(entry => entry.position === 1);
  const secondPlace = topThree.filter(entry => entry.position === 2);
  const thirdPlace = topThree.filter(entry => entry.position === 3);

  // Crear slides del carrusel: primero, segundo, tercero, y podio completo
  const carouselSlides = [];
  if (firstPlace.length > 0) {
    const label = firstPlace.length === 1 ? 'Primer Lugar' : 'Primeros Lugares';
    carouselSlides.push({ type: 'position', position: 1, entries: firstPlace, label });
  }
  if (secondPlace.length > 0) {
    const label = secondPlace.length === 1 ? 'Segundo Lugar' : 'Segundos Lugares';
    carouselSlides.push({ type: 'position', position: 2, entries: secondPlace, label });
  }
  if (thirdPlace.length > 0) {
    const label = thirdPlace.length === 1 ? 'Tercer Lugar' : 'Terceros Lugares';
    carouselSlides.push({ type: 'position', position: 3, entries: thirdPlace, label });
  }
  if (topThree.length > 0) carouselSlides.push({ type: 'full', entries: topThree, label: '🏆 Podio Completo 🏆' });

  // Función para activar fuegos artificiales (permite múltiples instancias)
  const triggerFireworks = useCallback(() => {
    const instanceId = Date.now() + Math.random();
    setFireworksInstances(prev => [...prev, instanceId]);
  }, []);

  // Función para remover una instancia cuando completa
  const handleFireworksComplete = useCallback((instanceId) => {
    setFireworksInstances(prev => prev.filter(id => id !== instanceId));
  }, []);

  // Mostrar fuegos artificiales la primera vez que se monta el carrusel
  useEffect(() => {
    if (!loading && topThree.length > 0 && !hasShownInitialFireworks.current) {
      hasShownInitialFireworks.current = true;
      // Pequeño delay para que se vea mejor cuando aparece el carrusel
      const timeoutId = setTimeout(() => {
        triggerFireworks();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [loading, topThree.length, triggerFireworks]);

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

  const handlePodiumItemClick = useCallback((teamId, hasDescription) => {
    if (!hasDescription) return;
    setFlippedItems(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  }, []);

  // Función para renderizar una tarjeta del podio
  const renderPodiumCard = useCallback((entry, showPosition = true) => {
    const isFirst = entry.position === 1;
    const isSecond = entry.position === 2;
    const isThird = entry.position === 3;
    const isFlipped = flippedItems[entry.teamId] || false;
    const hasDescription = entry.description && entry.description.trim() !== '';

    return (
      <div
        key={entry.teamId}
        className={`podium-item-top ${isFirst ? 'first' : ''} ${isSecond ? 'second' : ''} ${isThird ? 'third' : ''} ${isFlipped ? 'flipped' : ''}`}
        onClick={() => hasDescription && handlePodiumItemClick(entry.teamId, hasDescription)}
        style={{ cursor: hasDescription ? 'pointer' : 'default' }}
      >
        <div className="podium-card-inner">
          {/* Front side */}
          <div className="podium-card-front">
            <div className="podium-rank-badge">
              {entry.position === 1 && <span className="medal">🥇</span>}
              {entry.position === 2 && <span className="medal">🥈</span>}
              {entry.position === 3 && <span className="medal">🥉</span>}
              {showPosition && <span className="rank-number">#{entry.position}</span>}
            </div>
            
            {entry.screenshotUrl && (
              <div 
                className={`podium-screenshot ${entry.videoUrl && !isFlipped ? 'clickable' : ''}`}
                style={{ backgroundImage: `url(${entry.screenshotUrl})` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (entry.videoUrl && !isFlipped) {
                    handleScreenshotClick(entry);
                  }
                }}
                onMouseEnter={() => entry.videoUrl && !isFlipped && handleMouseEnter(entry.teamId)}
                onMouseLeave={() => entry.videoUrl && !isFlipped && handleMouseLeave(entry.teamId)}
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
                  onClick={(e) => e.stopPropagation()}
                >
                  Probar Aplicación
                </a>
              )}
            </div>
          </div>

          {/* Back side */}
          {hasDescription && (
            <div className="podium-card-back">
              <div className="podium-rank-badge">
                {entry.position === 1 && <span className="medal">🥇</span>}
                {entry.position === 2 && <span className="medal">🥈</span>}
                {entry.position === 3 && <span className="medal">🥉</span>}
              </div>
              
              <div className="podium-back-header">
                <h3 className="podium-back-team-name">{capitalizeName(entry.displayName || entry.groupName)}</h3>
                {entry.appName && (
                  <p className="podium-back-app-name">{capitalizeName(entry.appName)}</p>
                )}
                {entry.tipo_app && (
                  <p className="podium-back-type">{entry.tipo_app}</p>
                )}
              </div>

              <div className="podium-description-content">
                <div className="podium-description-card">
                  <div className="quote-mark quote-mark-top">"</div>
                  <p className="podium-description-text">
                    {entry.description.length > 300 
                      ? `${entry.description.substring(0, 300)}...` 
                      : entry.description}
                  </p>
                  <div className="quote-mark quote-mark-bottom">"</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [flippedItems, handlePodiumItemClick, handleScreenshotClick, handleMouseEnter, handleMouseLeave, showPlayOverlay, showVideoModal]);

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

  const currentSlide = carouselSlides[carouselIndex] || null;
  const hasMultipleSlides = carouselSlides.length > 1;

  if (podium.length === 0) {
    return (
      <div className="podium-empty">
        <p>Aún no hay resultados disponibles</p>
      </div>
    );
  }

  const handleNextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % carouselSlides.length);
    triggerFireworks();
  };

  const handlePrevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
    triggerFireworks();
  };

  return (
    <div className="podium-container">
      {/* <div className="podium-header">
        <h2 className="podium-title">🏆 Podio de Ganadores 🏆</h2>
        <p className="podium-subtitle">Los 5 mejores proyectos del concurso</p>
      </div> */}
      
      {/* Carrusel del Top 3 */}
      {topThree.length > 0 && currentSlide && (
        <div className="podium-carousel-wrapper">
          {hasMultipleSlides && (
            <button 
              className="podium-carousel-arrow podium-carousel-arrow-left"
              onClick={handlePrevSlide}
              aria-label="Slide anterior"
            >
              ‹
            </button>
          )}
          
          <div className="podium-carousel">
            <h1 className="podium-carousel-slide-label">
              {currentSlide.label}
            </h1>
            <div className={`podium-top-three ${currentSlide.type === 'full' ? 'podium-full' : 'podium-single-position'}`}>
              {currentSlide.entries.map((entry, index) => {
                const card = renderPodiumCard(entry, currentSlide.type === 'full');
                return (
                  <div key={entry.teamId} className={`podium-carousel-card-wrapper podium-animate-${currentSlide.type === 'full' ? entry.position : currentSlide.position}`}>
                    {card}
                  </div>
                );
              })}
            </div>
          </div>

          {hasMultipleSlides && (
            <button 
              className="podium-carousel-arrow podium-carousel-arrow-right"
              onClick={handleNextSlide}
              aria-label="Slide siguiente"
            >
              ›
            </button>
          )}

          {hasMultipleSlides && (
            <div className="podium-carousel-dots">
              {carouselSlides.map((_, index) => (
                <button
                  key={index}
                  className={`podium-carousel-dot ${index === carouselIndex ? 'active' : ''}`}
                  onClick={() => {
                    setCarouselIndex(index);
                    triggerFireworks();
                  }}
                  aria-label={`Ir al slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lugares 4 y 5 */}
      {rest.length > 0 && (
        <div className="podium-rest">
          <h3 className="podium-rest-title">Otros Finalistas</h3>
          <div className="podium-rest-grid">
            {rest.map((entry, index) => {
              const isFlipped = flippedItems[entry.teamId] || false;
              const hasDescription = entry.description && entry.description.trim() !== '';

              return (
                <div
                  key={entry.teamId}
                  className={`podium-item-rest podium-animate-rest-${index} ${isFlipped ? 'flipped' : ''}`}
                  onClick={() => hasDescription && handlePodiumItemClick(entry.teamId, hasDescription)}
                  style={{ cursor: hasDescription ? 'pointer' : 'default' }}
                >
                  <div className="podium-card-inner-rest">
                    {/* Front side */}
                    <div className="podium-card-front-rest">
                      <div className="podium-rank-badge-rest">
                        <span className="rank-number">#{entry.position}</span>
                      </div>
                      
                      {entry.screenshotUrl && (
                        <div 
                          className={`podium-screenshot-rest ${entry.videoUrl && !isFlipped ? 'clickable' : ''}`}
                          style={{ backgroundImage: `url(${entry.screenshotUrl})` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (entry.videoUrl && !isFlipped) {
                              handleScreenshotClick(entry);
                            }
                          }}
                          onMouseEnter={() => entry.videoUrl && !isFlipped && handleMouseEnter(entry.teamId)}
                          onMouseLeave={() => entry.videoUrl && !isFlipped && handleMouseLeave(entry.teamId)}
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            Probar Aplicación
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Back side */}
                    {hasDescription && (
                      <div className="podium-card-back-rest">
                        <div className="podium-rank-badge-rest">
                        </div>
                        
                        <div className="podium-back-header">
                          <h3 className="podium-back-team-name">{capitalizeName(entry.displayName || entry.groupName)}</h3>
                          {entry.appName && (
                            <p className="podium-back-app-name">{capitalizeName(entry.appName)}</p>
                          )}
                          {entry.tipo_app && (
                            <p className="podium-back-type">{entry.tipo_app}</p>
                          )}
                        </div>

                        <div className="podium-description-content">
                          <div className="podium-description-card">
                            <div className="quote-mark quote-mark-top">"</div>
                            <p className="podium-description-text">
                              {entry.description.length > 300 
                                ? `${entry.description.substring(0, 300)}...` 
                                : entry.description}
                            </p>
                            <div className="quote-mark quote-mark-bottom">"</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
      {fireworksInstances.map(instanceId => (
        <Fireworks 
          key={instanceId} 
          onComplete={() => handleFireworksComplete(instanceId)} 
        />
      ))}
    </div>
  );
};

export default Podium;

