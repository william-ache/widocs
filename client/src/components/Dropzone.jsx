import { useState, useRef, useCallback } from 'react';
import { IconUpload, IconFile, IconX } from './Icons';

export default function Dropzone({ content, onContentChange, fileName, onFileNameChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    const validExtensions = ['.md', '.txt', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      alert('Solo se permiten archivos .md, .txt o .docx');
      return;
    }

    onFileNameChange(file.name);
    setIsProcessing(true);

    try {
      if (ext === '.docx') {
        const { convertDocxToHtml } = await import('../utils/convertDocxToHtml');
        const { html } = await convertDocxToHtml(file);
        onContentChange(html, true); // true indicates it's already HTML
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          onContentChange(e.target.result, false); // false = Markdown/Txt
          setIsProcessing(false);
        };
        reader.readAsText(file);
        return; // Wait for reader.onload
      }
    } catch (err) {
      console.error('Error processing file:', err);
      alert('Error al procesar el archivo. Asegúrate de que es un archivo válido.');
    } finally {
      if (ext === '.docx') setIsProcessing(false);
    }
  }, [onContentChange, onFileNameChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => fileInputRef.current?.click();

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const clearFile = () => {
    onContentChange('', false);
    onFileNameChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-in relative">
      <label className="label">
        <span className="inline-flex items-center gap-1.5">
          <IconFile className="w-3.5 h-3.5 text-accent-400" />
          Contenido del Documento
        </span>
      </label>

      {/* ── Dropzone area ── */}
      {!content ? (
        <div
          className={`dropzone group ${isDragging ? 'drag-over' : ''} ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          id="markdown-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.docx"
            onChange={handleInputChange}
            className="hidden"
            id="file-input"
          />

          {/* Animated upload icon */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-accent-500/20 animate-pulse-slow blur-xl" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-800/80 border border-surface-700/50 group-hover:border-accent-500/40 transition-colors">
              {isProcessing ? (
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-accent-400"></div>
              ) : (
                <IconUpload className="w-7 h-7 text-surface-400 group-hover:text-accent-400 transition-colors" />
              )}
            </div>
          </div>

          <p className="text-sm font-medium text-surface-300 mb-1">
            {isProcessing ? 'Procesando archivo...' : 'Arrastra tu archivo aquí'}
          </p>
          <p className="text-xs text-surface-500">
            Soporta <span className="font-mono text-accent-400/80">.md</span>, <span className="font-mono text-accent-400/80">.txt</span> y <span className="font-mono text-accent-400/80">.docx</span>
          </p>
        </div>
      ) : (
        /* ── File loaded indicator ── */
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-500/10 border border-accent-500/20 animate-slide-up">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-500/20">
            <IconFile className="w-4 h-4 text-accent-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-200 truncate">
              {fileName || 'Contenido manual'}
            </p>
            <p className="text-xs text-surface-500">
              {content.length.toLocaleString()} caracteres
            </p>
          </div>
          <button
            onClick={clearFile}
            className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Eliminar archivo"
            id="clear-file-btn"
          >
            <IconX />
          </button>
        </div>
      )}

      {/* ── Textarea editor ── */}
      <textarea
        value={content}
        onChange={(e) => {
          onContentChange(e.target.value);
          if (!fileName) onFileNameChange('');
        }}
        placeholder="# Tu documento&#10;&#10;Escribe o pega tu contenido Markdown aquí...&#10;&#10;## Secciones&#10;- Elemento 1&#10;- Elemento 2&#10;&#10;> Cita de ejemplo"
        className="w-full min-h-[300px] max-h-[500px] resize-y px-4 py-3
                   bg-surface-900/50 border border-surface-700/40 rounded-xl
                   font-mono text-sm leading-relaxed text-surface-200
                   placeholder:text-surface-600
                   focus:border-accent-500/40 transition-colors"
        spellCheck="false"
        id="markdown-editor"
      />
    </div>
  );
}
