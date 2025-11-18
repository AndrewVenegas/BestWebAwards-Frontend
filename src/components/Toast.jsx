import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import './Toast.css';

const Toast = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="toast-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`toast toast-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="toast-icon">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'warning' && '⚠'}
            {notification.type === 'info' && 'ℹ'}
          </div>
          <div className="toast-message">{notification.message}</div>
          <button 
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;

