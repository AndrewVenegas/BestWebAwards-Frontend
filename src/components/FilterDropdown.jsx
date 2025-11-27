import React, { useState, useEffect, useRef } from 'react';
import './FilterDropdown.css';

const FilterDropdown = ({ children, onReset, resetLabel = '🗑️ Eliminar filtros' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  // Cerrar el dropdown cuando se hace clic fuera o cuando se hace scroll
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <div className="filter-dropdown-container" ref={containerRef}>
      <button 
        className={`filter-dropdown-button ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
      >
        <span>🔍 Filtros</span>
        <span className={`filter-dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="filter-dropdown-content">
          <div className="filter-dropdown-header">
            <h3>Filtros</h3>
            <button
              onClick={handleReset}
              className="filter-reset-button"
            >
              {resetLabel}
            </button>
          </div>
          <div className="filter-dropdown-body">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;

