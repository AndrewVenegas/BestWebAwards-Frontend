import React from 'react';
import './Switch.css';

const Switch = ({ checked, onChange, label, disabled = false }) => {
  return (
    <div className={`switch-container ${disabled ? 'disabled' : ''}`}>
      {label && <span className="switch-label">{label}</span>}
      <label className={`switch ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="switch-slider"></span>
      </label>
    </div>
  );
};

export default Switch;

