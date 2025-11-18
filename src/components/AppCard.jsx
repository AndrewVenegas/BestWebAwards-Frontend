import React from 'react';
import './AppCard.css';

const AppCard = ({ team, onVote, hasVoted, canVote, voteCount, showCounts }) => {
  const handleScreenshotClick = () => {
    if (team.videoUrl) {
      window.open(team.videoUrl, '_blank');
    }
  };

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
              Ver Aplicación
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
    </div>
  );
};

export default AppCard;

