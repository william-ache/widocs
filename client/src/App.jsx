import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Dropzone from './components/Dropzone';
import BackgroundUploader from './components/BackgroundUploader';
import LivePreview from './components/LivePreview';
import { IconSparkles, IconLoader, IconDownload, IconCheck, IconFile, IconDocument } from './components/Icons';

export default function App() {
  const [content, setContent] = useState('');
  const [isHtml, setIsHtml] = useState(false);
  const [fileName, setFileName] = useState('');
  const [background, setBackground] = useState('');
  const [paperType, setPaperType] = useState('A4');
  const [paperWidth, setPaperWidth] = useState(210);
  const [paperHeight, setPaperHeight] = useState(297);
  const [marginTop, setMarginTop] = useState(40);
  const [marginBottom, setMarginBottom] = useState(30);
  const [marginX, setMarginX] = useState(25);
  const [pageColor, setPageColor] = useState('#ffffff');
  const [contentColor, setContentColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [paginatedPages, setPaginatedPages] = useState([]);

  // ── Undo / Redo History ──
  const historyRef = useRef([{ content: '', isHtml: false }]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback((newContent, newIsHtml) => {
    if (skipHistoryRef.current) return;
    const idx = historyIndexRef.current;
    // Trim future states
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push({ content: newContent, isHtml: newIsHtml });
    // Limit to 50 entries
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    setContent(state.content);
    setIsHtml(state.isHtml);
    skipHistoryRef.current = false;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    setContent(state.content);
    setIsHtml(state.isHtml);
    skipHistoryRef.current = false;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // Wrapped setContent that also pushes to history
  const updateContent = useCallback((val, html) => {
    setContent(val);
    setIsHtml(!!html);
    pushHistory(val, !!html);
  }, [pushHistory]);

  const canGenerate = content.trim().length > 0 && background.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return;

    setIsGenerating(true);
    setStatus('generating');
    setErrorMsg('');

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: paginatedPages.length > 0 ? paginatedPages : content, 
          background, 
          isHtml: paginatedPages.length > 0 ? true : isHtml, 
          marginTop, 
          marginBottom, 
          marginX,
          paperWidth,
          paperHeight,
          pageColor,
          contentColor,
          fontSize
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error ${response.status}`);
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName
        ? fileName.replace(/\.(md|txt|docx)$/i, '.pdf')
        : 'widocs-document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setErrorMsg(err.message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-950">
      {/* ── Ambient background glow ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-neon-purple/6 rounded-full blur-3xl" />
      </div>

      <Header />

      {/* ── Main Grid ── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">

        {/* ── LEFT PANEL: Inputs ── */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col border-r border-surface-800/50 overflow-y-auto">
          <div className="flex flex-col gap-6 p-5">
            {/* Background uploader */}
            <BackgroundUploader
              background={background}
              onBackgroundChange={setBackground}
            />

            <div className="h-px bg-surface-800/50" />

            {/* ── Precision Margins ── */}
            <div className="flex flex-col gap-4 animate-fade-in px-1">
              <label className="label !mb-0 text-surface-200 font-bold flex items-center gap-2">
                <div className="w-1 h-3.5 bg-accent-500 rounded-full" />
                Tipografía y Estilo
              </label>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-surface-500 font-bold uppercase">Tamaño de Fuente (pt)</span>
                    <span className="text-xs font-mono text-accent-400 font-bold">{fontSize}pt</span>
                  </div>
                  <input 
                    type="range" 
                    min="8" 
                    max="24" 
                    step="1"
                    className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-accent-500" 
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-surface-800/50" />

            {/* ── Paper Size Selection ── */}
            <div className="flex flex-col gap-4 animate-fade-in px-1">
              <label className="label !mb-0 text-surface-200 font-bold flex items-center gap-2">
                <div className="w-1 h-3.5 bg-accent-500 rounded-full" />
                Tamaño del Papel
              </label>

              <select 
                className="input-field py-2 text-xs"
                value={paperType}
                onChange={(e) => {
                  const type = e.target.value;
                  setPaperType(type);
                  if (type !== 'custom') {
                    const [w, h] = PAPER_SIZES[type];
                    setPaperWidth(w);
                    setPaperHeight(h);
                  }
                }}
              >
                {Object.keys(PAPER_SIZES).map(key => (
                  <option key={key} value={key}>{key} ({PAPER_SIZES[key][0]}x{PAPER_SIZES[key][1]} mm)</option>
                ))}
                <option value="custom">Personalizado...</option>
              </select>

              {paperType === 'custom' && (
                <div className="grid grid-cols-2 gap-3 animate-slide-up">
                  <div className="space-y-1">
                    <span className="text-[10px] text-surface-500 font-bold uppercase">Ancho (mm)</span>
                    <input 
                      type="number" 
                      className="input-field py-1.5 text-center text-xs" 
                      value={paperWidth}
                      onChange={(e) => setPaperWidth(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-surface-500 font-bold uppercase">Alto (mm)</span>
                    <input 
                      type="number" 
                      className="input-field py-1.5 text-center text-xs" 
                      value={paperHeight}
                      onChange={(e) => setPaperHeight(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-surface-800/50" />

            {/* ── Precision Margins ── */}
            <div className="flex flex-col gap-4 animate-fade-in px-1">
              <label className="label !mb-0 text-surface-200 font-bold flex items-center gap-2">
                <div className="w-1 h-3.5 bg-accent-500 rounded-full" />
                Colores del Documento
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-surface-500 font-bold uppercase block">Color de Hoja</span>
                  <div className="flex items-center gap-2 bg-surface-900/50 p-1.5 rounded-lg border border-surface-700/30">
                    <input 
                      type="color" 
                      value={pageColor} 
                      onChange={(e) => setPageColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer flex-shrink-0"
                    />
                    <input 
                      type="text" 
                      value={pageColor} 
                      onChange={(e) => {
                        const v = e.target.value;
                        setPageColor(v.startsWith('#') ? v : '#' + v);
                      }}
                      maxLength={7}
                      className="w-full bg-transparent text-[10px] font-mono text-surface-300 uppercase outline-none border-none"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-surface-500 font-bold uppercase block">Color Contenido</span>
                  <div className="flex items-center gap-2 bg-surface-900/50 p-1.5 rounded-lg border border-surface-700/30">
                    <input 
                      type="color" 
                      value={contentColor} 
                      onChange={(e) => setContentColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer flex-shrink-0"
                    />
                    <input 
                      type="text" 
                      value={contentColor} 
                      onChange={(e) => {
                        const v = e.target.value;
                        setContentColor(v.startsWith('#') ? v : '#' + v);
                      }}
                      maxLength={7}
                      className="w-full bg-transparent text-[10px] font-mono text-surface-300 uppercase outline-none border-none"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-surface-800/50" />

            {/* ── Precision Margins ── */}
            <div className="flex flex-col gap-4 animate-fade-in px-1">
              <label className="label !mb-0 text-surface-200 font-bold flex items-center gap-2">
                <div className="w-1 h-3.5 bg-accent-500 rounded-full" />
                Ajuste de Plantilla
              </label>

              {/* Top Margin */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-surface-500 font-bold">
                  <span>Margen Superior</span>
                  <span className="text-accent-400">{marginTop}mm</span>
                </div>
                <input
                  type="range" min="0" max="150" step="1"
                  value={marginTop}
                  onChange={(e) => setMarginTop(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-accent-500"
                />
              </div>

              {/* Side Margin */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-surface-500 font-bold">
                  <span>Márgenes Laterales</span>
                  <span className="text-accent-400">{marginX}mm</span>
                </div>
                <input
                  type="range" min="0" max="80" step="1"
                  value={marginX}
                  onChange={(e) => setMarginX(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-accent-500"
                />
              </div>

              {/* Bottom Margin */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-surface-500 font-bold">
                  <span>Margen Inferior</span>
                  <span className="text-accent-400">{marginBottom}mm</span>
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-accent-500"
                />
              </div>
            </div>

            <div className="h-px bg-surface-800/50" />

            {/* Markdown dropzone */}
            <Dropzone
              content={content}
              onContentChange={(val, html) => updateContent(val, html)}
              fileName={fileName}
              onFileNameChange={setFileName}
            />
          </div>

          {/* ── Generate Button (sticky bottom) ── */}
          <div className="mt-auto p-5 border-t border-surface-800/50 bg-surface-950/80 backdrop-blur-sm">
            {/* Status messages */}
            {status === 'error' && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 animate-slide-up">
                ⚠️ {errorMsg}
              </div>
            )}
            {status === 'success' && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 animate-slide-up flex items-center gap-2">
                <IconCheck className="w-3.5 h-3.5" />
                Archivo generado con éxito
              </div>
            )}


            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="btn-primary w-full text-base"
              id="generate-btn"
            >
              {isGenerating ? (
                <>
                  <IconLoader className="w-5 h-5" />
                  Generando PDF...
                </>
              ) : status === 'success' ? (
                <>
                  <IconCheck className="w-5 h-5" />
                  ¡Listo!
                </>
              ) : (
                <>
                  <IconSparkles className="w-5 h-5" />
                  Generar PDF
                </>
              )}
            </button>

            {/* Helper text */}
            {!canGenerate && (
              <p className="mt-2.5 text-center text-[11px] text-surface-500">
                {!content.trim() && !background
                  ? 'Sube contenido Markdown y una imagen de fondo'
                  : !content.trim()
                  ? 'Falta el contenido Markdown'
                  : 'Falta la imagen de fondo'}
              </p>
            )}
          </div>
        </aside>

        {/* ── RIGHT PANEL: Live Preview ── */}
        <section className="lg:col-span-8 xl:col-span-9 flex flex-col overflow-hidden p-5">
          <LivePreview 
            content={content} 
            background={background} 
            isHtml={isHtml} 
            marginTop={marginTop}
            marginBottom={marginBottom}
            marginX={marginX}
            paperWidth={paperWidth}
            paperHeight={paperHeight}
            pageColor={pageColor}
            contentColor={contentColor}
            fontSize={fontSize}
            onContentChange={(newContent, html) => updateContent(newContent, html)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onPagesChange={setPaginatedPages}
          />
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between px-6 py-2.5 border-t border-surface-800/50 text-[11px] text-surface-600">
        <span>WiDocs v1.0.0</span>
        <span className="font-mono">
          {content.length > 0 ? (
            <>
              {paginatedPages.length > 0 && `${paginatedPages.length} páginas · `}
              {content.split('\n').length} líneas · {content.length.toLocaleString()} chars
            </>
          ) : 'Sin contenido'}
        </span>
      </footer>
    </div>
  );
}

const PAPER_SIZES = {
  'A4': [210, 297],
  'Carta': [216, 279],
  'Oficio': [216, 356],
  'Legal': [216, 356],
  'Declaración': [140, 216],
  'Ejecutivo': [184, 267],
  'Folio': [216, 330],
  'Tabloide': [279, 432],
  'A3': [297, 420],
  'A5': [148, 210],
  'B4': [250, 353],
  'B5': [176, 250],
};
