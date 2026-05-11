import { useState } from 'react';
import Header from './components/Header';
import Dropzone from './components/Dropzone';
import BackgroundUploader from './components/BackgroundUploader';
import LivePreview from './components/LivePreview';
import { IconSparkles, IconLoader, IconDownload, IconCheck } from './components/Icons';

export default function App() {
  const [content, setContent] = useState('');
  const [isHtml, setIsHtml] = useState(false);
  const [fileName, setFileName] = useState('');
  const [background, setBackground] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'generating' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

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
        body: JSON.stringify({ content, background, isHtml }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error ${response.status}`);
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName
        ? fileName.replace(/\.(md|txt)$/i, '.pdf')
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

            {/* Markdown dropzone */}
            <Dropzone
              content={content}
              onContentChange={(val, html) => {
                setContent(val);
                setIsHtml(!!html);
              }}
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
                PDF generado y descargado
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
                  Generando PDF…
                </>
              ) : status === 'success' ? (
                <>
                  <IconCheck className="w-5 h-5" />
                  ¡PDF Generado!
                </>
              ) : (
                <>
                  <IconSparkles className="w-5 h-5" />
                  Generar Documentación
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
          <LivePreview content={content} background={background} isHtml={isHtml} />
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between px-6 py-2.5 border-t border-surface-800/50 text-[11px] text-surface-600">
        <span>WiDocs v1.0.0</span>
        <span className="font-mono">
          {content.length > 0 ? `${content.split('\n').length} líneas · ${content.length.toLocaleString()} chars` : 'Sin contenido'}
        </span>
      </footer>
    </div>
  );
}
