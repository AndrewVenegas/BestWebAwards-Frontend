import React, { useState, useRef } from 'react';
import './FileDropzone.css';

const FileDropzone = ({ onFileSelect, currentImageUrl, disabled = false, label = 'Imagen de Portada' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Llamar al callback
    onFileSelect(file);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const displayImage = preview || currentImageUrl;

  return (
    <div className="file-dropzone-container">
      {label && (
        <label className="file-dropzone-label">
          {label} <span className="required">*</span>
        </label>
      )}
      
      <div
        className={`file-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${displayImage ? 'has-image' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {displayImage ? (
          <div className="file-dropzone-preview">
            <img src={displayImage} alt="Preview" className="file-dropzone-image" />
            <div className="file-dropzone-overlay">
              <div className="file-dropzone-overlay-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p className="file-dropzone-text">Haz clic o arrastra para cambiar</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="file-dropzone-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p className="file-dropzone-text">Arrastra una imagen aquí</p>
            <p className="file-dropzone-subtext">o haz clic para seleccionar</p>
            <p className="file-dropzone-hint">PNG, JPG hasta 5MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDropzone;

