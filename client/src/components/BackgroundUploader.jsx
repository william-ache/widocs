import { useState, useRef, useCallback } from 'react';
import { IconImage, IconX, IconTrash } from './Icons';

export default function BackgroundUploader({ background, onBackgroundChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'url'
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      onBackgroundChange(base64);
      setPreviewUrl(base64);
    };
    reader.readAsDataURL(file);
  }, [onBackgroundChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleUrlChange = (e) => {
    const url = e.target.value;
    onBackgroundChange(url);
    setPreviewUrl(url);
  };

  const clearBackground = () => {
    onBackgroundChange('');
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <label className="label">
        <span className="inline-flex items-center gap-1.5">
          <IconImage className="w-3.5 h-3.5 text-neon-purple" />
          Imagen de Plantilla
        </span>
      </label>

      {/* ── Mode toggle ── */}
      <div className="flex rounded-lg bg-surface-800/60 border border-surface-700/30 p-0.5">
        <button
          onClick={() => setInputMode('upload')}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            inputMode === 'upload'
              ? 'bg-accent-600/30 text-accent-300 shadow-sm'
              : 'text-surface-400 hover:text-surface-300'
          }`}
          id="mode-upload-btn"
        >
          Subir archivo
        </button>
        <button
          onClick={() => setInputMode('url')}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            inputMode === 'url'
              ? 'bg-accent-600/30 text-accent-300 shadow-sm'
              : 'text-surface-400 hover:text-surface-300'
          }`}
          id="mode-url-btn"
        >
          URL externa
        </button>
      </div>

      {/* ── Upload mode ── */}
      {inputMode === 'upload' && !previewUrl && (
        <div
          className={`dropzone !min-h-[120px] !p-5 group ${isDragging ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onClick={() => fileInputRef.current?.click()}
          id="background-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files[0])}
            className="hidden"
            id="bg-file-input"
          />
          <IconImage className="w-8 h-8 text-surface-500 group-hover:text-neon-purple/70 transition-colors mb-2" />
          <p className="text-xs text-surface-400 text-center">
            Arrastra una imagen o haz clic
          </p>
          <p className="text-[10px] text-surface-600 mt-1">
            PNG, JPG, SVG, WebP
          </p>
        </div>
      )}

      {/* ── URL mode ── */}
      {inputMode === 'url' && !previewUrl && (
        <input
          type="url"
          placeholder="https://ejemplo.com/fondo.png"
          onChange={handleUrlChange}
          className="w-full px-3 py-2.5 bg-surface-900/50 border border-surface-700/40
                     rounded-xl text-sm text-surface-200 font-mono
                     placeholder:text-surface-600
                     focus:border-accent-500/40 focus:outline-none transition-colors"
          id="bg-url-input"
        />
      )}

      {/* ── Preview ── */}
      {previewUrl && (
        <div className="relative group animate-slide-up">
          <div className="relative overflow-hidden rounded-xl border border-surface-700/40">
            <img
              src={previewUrl}
              alt="Fondo de plantilla"
              className="w-full h-32 object-cover"
              onError={() => {
                setPreviewUrl('');
                alert('Error cargando la imagen. Verifica la URL.');
              }}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-surface-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={clearBackground}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
                id="clear-bg-btn"
              >
                <IconTrash className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
          {/* Label */}
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-surface-400">Fondo cargado</span>
          </div>
        </div>
      )}
    </div>
  );
}
