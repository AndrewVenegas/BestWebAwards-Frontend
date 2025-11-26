import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Seleccionar...',
  className = '',
  label = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-wrapper ${className}`} ref={selectRef}>
      {label && (
        <label className="custom-select-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      <div 
        className={`custom-select ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`custom-select-arrow ${isOpen ? 'open' : ''}`}
          width="14" 
          height="14" 
          viewBox="0 0 14 14" 
          fill="none"
        >
          <path d="M7 10L2 5h10z" fill="#667eea"/>
        </svg>
      </div>
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {value === option.value && (
                <svg 
                  className="custom-select-checkmark"
                  width="16" 
                  height="16" 
                  viewBox="0 0 16 16" 
                  fill="none"
                >
                  <path 
                    d="M13.3333 4L6 11.3333L2.66667 8" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;

