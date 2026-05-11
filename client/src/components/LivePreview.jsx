import { useMemo, useState, useEffect, useRef } from 'react';
import { IconEye } from './Icons';
import MarkdownIt from 'markdown-it';

// Same markdown-it config as the backend server.js
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// CSS that mirrors EXACTLY the backend buildHtmlDocument styles
const getDocumentStyles = (fontSize) => `
  h1, h2, h3, h4, h5, h6 {
    color: #0f0f23;
    margin-top: 1.4em;
    margin-bottom: 0.6em;
    font-weight: 700;
    line-height: 1.3;
  }
  h1 { font-size: 2em; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #e8e8e8; padding-bottom: 0.25em; }
  h3 { font-size: 1.25em; }
  p { margin: 0.8em 0; text-align: justify; }
  a { color: #2563eb; text-decoration: none; }
  code {
    background: rgba(99, 102, 241, 0.08);
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'Fira Code', 'Consolas', monospace;
  }
  pre {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 1em 1.2em;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.85em;
    line-height: 1.5;
    margin: 1em 0;
  }
  pre code { background: transparent; padding: 0; color: inherit; }
  ul, ol { padding-left: 1.8em; margin: 0.6em 0; }
  li { margin-bottom: 0.3em; }
  blockquote {
    margin: 1em 0;
    padding: 0.6em 1.2em;
    border-left: 4px solid #6366f1;
    background: rgba(99, 102, 241, 0.05);
    border-radius: 0 6px 6px 0;
    color: #374151;
  }
  blockquote p { margin: 0.3em 0; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.95em; }
  th, td { border: 1px solid #d1d5db; padding: 0.55em 0.8em; text-align: left; }
  th { background: #6366f1; color: #ffffff; font-weight: 600; }
  tr:nth-child(even) { background: rgba(99, 102, 241, 0.04); }
  hr { border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; }
  img { max-width: 100%; height: auto; border-radius: 6px; margin: 1em 0; }
`;

/**
 * LivePreview — Renders an A4-proportioned preview that 
 * PHYSICALLY splits content into vertical sheets.
 * Uses the same markdown-it parser and CSS as the backend.
 */
export default function LivePreview({ content, background, isHtml, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize, onContentChange, onUndo, onRedo, canUndo, canRedo }) {
  const [zoom, setZoom] = useState(0.6);
  const [pages, setPages] = useState([]);
  const hiddenRenderRef = useRef(null);
  const pageRefs = useRef([]);
  const isEditing = useRef(false);

  const escapedBg = useMemo(() => background?.replace(/"/g, '\\"') || '', [background]);

  // Sync edits from the preview back to parent
  const handlePageEdit = () => {
    if (!onContentChange || !pageRefs.current.length) return;
    
    const allHtml = pageRefs.current
      .filter(Boolean)
      .map(el => el.innerHTML)
      .join('');
    
    onContentChange(allHtml, true);
  };

  // Re-paginate on input with debounce
  const inputTimerRef = useRef(null);
  const handlePageInput = () => {
    if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
    inputTimerRef.current = setTimeout(() => {
      handlePageEdit();
      isEditing.current = false;
    }, 300);
  };

  useEffect(() => {
    if (isEditing.current) return;

    if (!content) {
      setPages([]);
      return;
    }

    const timer = setTimeout(() => {
      if (!hiddenRenderRef.current) return;

      // Use the SAME markdown-it renderer as the backend
      const htmlContent = isHtml ? content : md.render(content);
      
      // CRITICAL: Inject styles INTO the innerHTML so measurements are accurate
      // (setting innerHTML destroys any React-rendered <style> children)
      const stylesTag = `<style>${getDocumentStyles(fontSize)}</style>`;
      hiddenRenderRef.current.innerHTML = stylesTag + htmlContent;

      // Filter out the <style> element — only measure real content
      const children = Array.from(hiddenRenderRef.current.children)
        .filter(c => c.tagName !== 'STYLE');
      const PX_PER_MM = 3.78; 
      const CONTENT_MAX_HEIGHT_PX = (paperHeight - marginTop - marginBottom) * PX_PER_MM;

      const newPages = [[]];
      let currentPageHeight = 0;

      children.forEach((child) => {
        const style = window.getComputedStyle(child);
        const childHeight = child.getBoundingClientRect().height 
          + parseFloat(style.marginTop) 
          + parseFloat(style.marginBottom);
        
        if (currentPageHeight + childHeight > CONTENT_MAX_HEIGHT_PX && newPages[newPages.length - 1].length > 0) {
          newPages.push([child.outerHTML]);
          currentPageHeight = childHeight;
        } else {
          newPages[newPages.length - 1].push(child.outerHTML);
          currentPageHeight += childHeight;
        }
      });

      pageRefs.current = [];
      setPages(newPages);
    }, 100); 

    return () => clearTimeout(timer);
  }, [content, isHtml, marginTop, marginBottom, marginX, paperWidth, paperHeight, fontSize]);

  return (
    <div className="flex flex-col gap-3 h-full animate-fade-in relative">
      <div className="flex items-center justify-between">
        <label className="label">
          <span className="inline-flex items-center gap-1.5">
            <IconEye className="w-3.5 h-3.5 text-accent-400" />
            Vista Previa en Vivo
            <span className="text-[9px] text-surface-500 font-normal ml-1">(clic para editar)</span>
          </span>
        </label>
        
        <div className="flex items-center gap-1 bg-surface-900/80 border border-surface-700/40 p-1 rounded-lg backdrop-blur-sm shadow-xl">
          {/* Undo */}
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            className={`p-1.5 rounded transition-colors ${canUndo ? 'hover:bg-surface-800 text-surface-400 hover:text-accent-400' : 'text-surface-700 cursor-not-allowed'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10h10a5 5 0 0 1 0 10H9" /><path d="M3 10l4-4" /><path d="M3 10l4 4" />
            </svg>
          </button>
          {/* Redo */}
          <button 
            onClick={onRedo} 
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            className={`p-1.5 rounded transition-colors ${canRedo ? 'hover:bg-surface-800 text-surface-400 hover:text-accent-400' : 'text-surface-700 cursor-not-allowed'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10H11a5 5 0 0 0 0 10h4" /><path d="M21 10l-4-4" /><path d="M21 10l-4 4" />
            </svg>
          </button>

          <div className="w-px h-3 bg-surface-700 mx-1" />

          {/* Zoom controls */}
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-1.5 hover:bg-surface-800 rounded transition-colors text-surface-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 12H4" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <span className="text-[10px] font-mono text-surface-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 1.2))} className="p-1.5 hover:bg-surface-800 rounded transition-colors text-surface-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <div className="w-px h-3 bg-surface-700 mx-1" />
          <button onClick={() => setZoom(0.5)} className="px-2 py-1 text-[9px] font-bold uppercase text-accent-400">Ajustar</button>
        </div>
      </div>

      {/* Hidden renderer — uses SAME styles as backend for accurate measurement */}
      <div 
        ref={hiddenRenderRef} 
        className="fixed top-[-9999px] left-[-9999px] pointer-events-none" 
        style={{ 
          width: `${(paperWidth - marginX * 2)}mm`, 
          fontSize: `${fontSize}pt`, 
          lineHeight: '1.7', 
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          visibility: 'visible',
          display: 'block',
          color: '#1a1a2e'
        }}
      />

      <div className="relative flex-1 rounded-2xl overflow-hidden border border-surface-700/30 bg-surface-950/50">
        <div className="w-full h-full p-8 overflow-auto flex flex-col items-center gap-8 scrollbar-thin">
          {pages.length > 0 ? (
            pages.map((pageHtml, idx) => (
              <div 
                key={idx}
                className="flex-shrink-0 shadow-2xl relative transition-transform duration-300 origin-top"
                style={{ 
                  width: `${paperWidth}mm`, 
                  height: `${paperHeight}mm`, 
                  transform: `scale(${zoom})`,
                  marginBottom: `-${paperHeight * (1 - zoom)}mm`,
                  backgroundColor: pageColor || '#ffffff',
                  overflow: 'hidden'
                }}
              >
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ 
                    backgroundImage: `url("${escapedBg}")`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center',
                    zIndex: 0 
                  }}
                />
                
                <div 
                  ref={el => pageRefs.current[idx] = el}
                  className="preview-content relative z-10 w-full h-full text-justify focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:ring-inset transition-shadow"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handlePageInput}
                  onBlur={handlePageEdit}
                  style={{ 
                    paddingTop: `${marginTop}mm`,
                    paddingBottom: `${marginBottom}mm`,
                    paddingLeft: `${marginX}mm`,
                    paddingRight: `${marginX}mm`,
                    fontSize: `${fontSize}pt`,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: '#1a1a2e',
                    backgroundColor: contentColor || 'transparent',
                    backgroundClip: 'content-box',
                    lineHeight: '1.7',
                    cursor: 'text',
                    overflow: 'hidden',
                    maxHeight: `${paperHeight}mm`
                  }}
                  dangerouslySetInnerHTML={{ __html: `<style>${getDocumentStyles(fontSize)}</style>${pageHtml.join('')}` }}
                />
                
                <div className="absolute bottom-4 right-6 text-[10px] text-surface-400 font-mono italic pointer-events-none" style={{ zIndex: 20 }}>
                  Página {idx + 1} de {pages.length}
                </div>
              </div>
            ))

          ) : background ? (
            <div 
              className="flex-shrink-0 shadow-2xl relative overflow-hidden transition-transform duration-300 origin-top"
              style={{ 
                width: `${paperWidth}mm`, 
                height: `${paperHeight}mm`, 
                transform: `scale(${zoom})`,
                marginBottom: `-${paperHeight * (1 - zoom)}mm`,
                backgroundColor: pageColor || '#ffffff'
              }}
            >
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  backgroundImage: `url("${escapedBg}")`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  zIndex: 0 
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <p className="text-surface-300 font-mono text-[10px] opacity-20 uppercase tracking-[0.2em]">Vista Previa Vacía</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-surface-600 italic">
               Esperando contenido o plantilla para previsualizar...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
