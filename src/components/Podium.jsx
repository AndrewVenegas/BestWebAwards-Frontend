import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Podium.css';

const Podium = () => {
  const [podium, setPodium] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPodium();
  }, []);

  const fetchPodium = async () => {
    try {
      const response = await api.get('/results/podium');
      setPodium(response.data);
    } catch (error) {
      console.error('Error al cargar podio:', error);
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

  return (
    <div className="podium-container">
      <h2 className="podium-title">🏆 Podio de Ganadores 🏆</h2>
      <div className="podium-grid">
        {podium.map((entry, index) => {
          const isFirst = entry.position === 1;
          const isSecond = entry.position === 2;
          const isThird = entry.position === 3;
          const isTopThree = entry.position <= 3;

          return (
            <div
              key={entry.teamId}
              className={`podium-item ${isFirst ? 'first' : ''} ${isSecond ? 'second' : ''} ${isThird ? 'third' : ''}`}
            >
              <div className="podium-position">
                {entry.position === 1 && '🥇'}
                {entry.position === 2 && '🥈'}
                {entry.position === 3 && '🥉'}
                {entry.position > 3 && `#${entry.position}`}
              </div>
              
              {entry.screenshotUrl && (
                <div 
                  className="podium-screenshot"
                  style={{ backgroundImage: `url(${entry.screenshotUrl})` }}
                />
              )}
              
              <div className="podium-info">
                <h3 className="podium-team-name">{entry.displayName || entry.groupName}</h3>
                {entry.appName && (
                  <p className="podium-app-name">{entry.appName}</p>
                )}
                <div className="podium-votes">
                  <strong>{entry.voteCount}</strong> {entry.voteCount === 1 ? 'voto' : 'votos'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Podium;

