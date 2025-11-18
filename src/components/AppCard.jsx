import React, { useState } from 'react';
import './AppCard.css';

const AppCard = ({ team, onVote, hasVoted, canVote, voteCount, showCounts }) => {
  const [showVideoModal, setShowVideoModal] = useState(false);

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

  const handleScreenshotClick = () => {
    if (team.videoUrl) {
      setShowVideoModal(true);
    }
  };

  const embedUrl = getYouTubeEmbedUrl(team.videoUrl);

  return (
    <div className={`app-card ${hasVoted ? 'voted' : ''} ${!canVote ? 'disabled' : ''}`}>
      {team.screenshotUrl && (
        <div 
          className="app-screenshot" 
          onClick={handleScreenshotClick}
          style={{ backgroundImage: `url(${team.screenshotUrl})` }}
        >
          {team.videoUrl && (
            <div className="play-overlay">
              <span className="play-icon">▶</span>
            </div>
          )}
        </div>
      )}
      
      <div className="app-content">
        <h3 className="app-name">{team.appName || team.displayName || team.groupName}</h3>
        <p className="app-team">{team.displayName || team.groupName}</p>
        
        {team.students && team.students.length > 0 && (
          <div className="app-members">
            <h4>Integrantes:</h4>
            <div className="members-list">
              {team.students.map((student) => (
                <div key={student.id} className="member-item">
                  {student.avatarUrl ? (
                    <img src={student.avatarUrl} alt={student.name} className="member-avatar" />
                  ) : (
                    <div className="member-avatar placeholder">{student.name.charAt(0)}</div>
                  )}
                  <span className="member-name">{student.name}</span>
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
          
          {hasVoted ? (
            <button className="app-button voted-button" disabled>
              ✓ Ya votaste
            </button>
          ) : (
            <button 
              className="app-button vote-button" 
              onClick={() => onVote(team.id)}
              disabled={!canVote}
            >
              Votar
            </button>
          )}
        </div>
      </div>

      {showVideoModal && embedUrl && (
        <div className="video-modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal-close" onClick={() => setShowVideoModal(false)}>×</button>
            <iframe
              src={embedUrl}
              title="Video de la aplicación"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="video-iframe"
            ></iframe>
          </div>
        </div>
      )}

      {showVideoModal && !embedUrl && (
        <div className="video-modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal-close" onClick={() => setShowVideoModal(false)}>×</button>
            <div className="video-error">
              <p>No se pudo cargar el video. URL no válida.</p>
              {team.videoUrl && (
                <a href={team.videoUrl} target="_blank" rel="noopener noreferrer">
                  Abrir en YouTube
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppCard;

