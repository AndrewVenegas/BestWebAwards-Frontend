import React, { useState, useEffect, useRef } from 'react';
import './FilterDropdown.css';

const FilterDropdown = ({ children, onReset, resetLabel = '🗑️ Eliminar filtros' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ left: 'auto', right: 'auto', top: 'auto' });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Match CSS animation duration
  };

  const toggleDropdown = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
      setIsClosing(false);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  // Calcular posición del dropdown para que no se salga de la pantalla
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
      requestAnimationFrame(() => {
        if (containerRef.current && dropdownRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const dropdownRect = dropdownRef.current.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const padding = 16; // Padding desde los bordes de la pantalla
          
          const newPosition = { left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' };
          
          // Ajustar horizontalmente
          const spaceOnRight = viewportWidth - containerRect.right - padding;
          const spaceOnLeft = containerRect.left - padding;
          
          if (dropdownRect.width > spaceOnRight && spaceOnLeft > spaceOnRight) {
            // No hay suficiente espacio a la derecha, alinear a la derecha del botón
            newPosition.right = '0';
            newPosition.left = 'auto';
          } else {
            // Hay espacio a la derecha, alinear a la izquierda del botón
            newPosition.left = '0';
            newPosition.right = 'auto';
          }
          
          // Ajustar verticalmente si no hay espacio abajo
          const spaceBelow = viewportHeight - containerRect.bottom - padding;
          const spaceAbove = containerRect.top - padding;
          
          if (dropdownRect.height > spaceBelow && spaceAbove > spaceBelow) {
            // No hay suficiente espacio abajo, mostrar arriba del botón
            newPosition.bottom = 'calc(100% + 0.5rem)';
            newPosition.top = 'auto';
          } else {
            // Hay espacio abajo, mostrar abajo del botón (comportamiento por defecto)
            newPosition.top = 'calc(100% + 0.5rem)';
            newPosition.bottom = 'auto';
          }
          
          setPosition(newPosition);
        }
      });
    }
  }, [isOpen]);

  // Cerrar el dropdown solo cuando se hace clic fuera o cuando se redimensiona la ventana
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        handleClose();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
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
        <div 
          ref={dropdownRef}
          className={`filter-dropdown-content ${isClosing ? 'closing' : ''}`}
          style={{
            left: position.left,
            right: position.right,
            top: position.top,
            bottom: position.bottom
          }}
        >
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

