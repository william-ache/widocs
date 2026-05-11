import { useMemo, useState, useEffect, useRef } from 'react';
import { IconEye } from './Icons';

/**
 * LivePreview — Renders an A4-proportioned preview that 
 * PHYSICALLY splits content into vertical sheets.
 */
export default function LivePreview({ content, background, isHtml, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize }) {
  const [zoom, setZoom] = useState(0.6);
  const [pages, setPages] = useState([]);
  const hiddenRenderRef = useRef(null);

  const escapedBg = useMemo(() => background?.replace(/"/g, '\\"') || '', [background]);

  useEffect(() => {
    if (!content) {
      setPages([]);
      return;
    }

    const timer = setTimeout(() => {
      if (!hiddenRenderRef.current) return;

      const htmlContent = isHtml ? content : simpleMarkdownToHtml(content);
      hiddenRenderRef.current.innerHTML = htmlContent;

      // Force a slight reflow check
      const children = Array.from(hiddenRenderRef.current.children);
      const PX_PER_MM = 3.78; 
      const CONTENT_MAX_HEIGHT_PX = (paperHeight - marginTop - marginBottom) * PX_PER_MM;

      const newPages = [[]];
      let currentPageHeight = 0;

      children.forEach((child) => {
        const childHeight = child.getBoundingClientRect().height || child.offsetHeight;
        
        // If an element is taller than the entire page, we force it in and then break
        if (currentPageHeight + childHeight > CONTENT_MAX_HEIGHT_PX && newPages[newPages.length - 1].length > 0) {
          newPages.push([child.outerHTML]);
          currentPageHeight = childHeight;
        } else {
          newPages[newPages.length - 1].push(child.outerHTML);
          currentPageHeight += childHeight;
        }
      });

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
            Vista Previa de Hojas Verticales
          </span>
        </label>
        
        <div className="flex items-center gap-1 bg-surface-900/80 border border-surface-700/40 p-1 rounded-lg backdrop-blur-sm shadow-xl">
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

      <div 
        ref={hiddenRenderRef} 
        className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none" 
        style={{ 
          width: `${(paperWidth - marginX * 2)}mm`, 
          fontSize: `${fontSize}pt`, 
          lineHeight: '1.6', 
          fontFamily: 'Inter, sans-serif',
          visibility: 'visible',
          display: 'block'
        }}
      />

      <div className="relative flex-1 rounded-2xl overflow-hidden border border-surface-700/30 bg-surface-950/50">
        <div className="w-full h-full p-8 overflow-auto flex flex-col items-center gap-8 scrollbar-thin">
          {pages.length > 0 ? (
            pages.map((pageHtml, idx) => (
              <div 
                key={idx}
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
                
                <div 
                  className="relative z-10 w-full h-full text-justify"
                  style={{ 
                    paddingTop: `${marginTop}mm`,
                    paddingBottom: `${marginBottom}mm`,
                    paddingLeft: `${marginX}mm`,
                    paddingRight: `${marginX}mm`,
                    fontSize: `${fontSize}pt`,
                    fontFamily: 'Inter, sans-serif',
                    color: '#1a1a2e',
                    backgroundColor: contentColor || 'transparent',
                    backgroundClip: 'content-box',
                    lineHeight: '1.6'
                  }}
                  dangerouslySetInnerHTML={{ __html: pageHtml.join('') }}
                />
                
                <div className="absolute bottom-4 right-6 text-[10px] text-surface-400 font-mono italic">
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

function simpleMarkdownToHtml(md) {
  if (!md) return '';
  return md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .split('\n')
    .map(line => {
       const trimmed = line.trim();
       if (!trimmed) return '<div style="height: 1em"></div>';
       if (trimmed.startsWith('<h')) return trimmed;
       return `<p>${trimmed}</p>`;
    })
    .join('');
}
