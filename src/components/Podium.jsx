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
                
                {entry.helper && (
                  <div className="podium-helper">
                    <span className="podium-helper-label">Ayudante:</span>
                    <span className="podium-helper-name">{entry.helper.name}</span>
                  </div>
                )}
                
                {entry.students && entry.students.length > 0 && (
                  <div className="podium-students">
                    <h4 className="podium-students-title">Integrantes:</h4>
                    <div className="podium-students-list">
                      {entry.students.map((student) => (
                        <div key={student.id} className="podium-student-item">
                          {student.avatarUrl ? (
                            <img 
                              src={student.avatarUrl} 
                              alt={student.name} 
                              className="podium-student-avatar" 
                            />
                          ) : (
                            <div className="podium-student-avatar placeholder">
                              {student.name.charAt(0)}
                            </div>
                          )}
                          <span className="podium-student-name">{student.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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

