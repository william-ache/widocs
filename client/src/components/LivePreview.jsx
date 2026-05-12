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
  .preview-content h1, .preview-content h2, .preview-content h3, .preview-content h4, .preview-content h5, .preview-content h6 {
    color: #0f0f23;
    margin-top: 1.4em;
    margin-bottom: 0.6em;
    font-weight: 700;
    line-height: 1.3;
  }
  .preview-content h1 { font-size: 2em; }
  .preview-content h2 { font-size: 1.5em; }
  .preview-content h3 { font-size: 1.25em; }
  .preview-content p { margin: 0.8em 0; text-align: justify; }
  .preview-content a { color: #2563eb; text-decoration: none; }
  .preview-content code {
    background: rgba(99, 102, 241, 0.08);
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'Fira Code', 'Consolas', monospace;
  }
  .preview-content pre {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 1em 1.2em;
    border-radius: 8px;
    font-size: 0.85em;
    line-height: 1.5;
    margin: 1em 0;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-all;
  }
  .preview-content pre code { background: transparent; padding: 0; color: inherit; }
  .preview-content ul, .preview-content ol { padding-left: 1.8em; margin: 0.6em 0; }
  .preview-content li { margin-bottom: 0.3em; }
  .preview-content blockquote {
    margin: 1em 0;
    padding: 0.6em 1.2em;
    border-left: 4px solid #6366f1;
    background: rgba(99, 102, 241, 0.05);
    border-radius: 0 6px 6px 0;
    color: #374151;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }
  .preview-content blockquote p { margin: 0.3em 0; }
  .preview-content table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.95em; table-layout: fixed; max-width: 100%; box-sizing: border-box; }
  .preview-content th, .preview-content td { border: 1px solid #d1d5db; padding: 0.55em 0.8em; text-align: left; word-wrap: break-word; overflow-wrap: break-word; }
  .preview-content th { background: #6366f1; color: #ffffff; font-weight: 600; }
  .preview-content tr:nth-child(even) { background: rgba(99, 102, 241, 0.04); }
  .preview-content hr { border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; }
  .preview-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 1em 0; box-sizing: border-box; }

  /* Force all elements inside preview to respect container bounds */
  .preview-content * { box-sizing: border-box; max-width: 100%; }
`;

/**
 * LivePreview — Renders an A4-proportioned preview that 
 * PHYSICALLY splits content into vertical sheets.
 * Uses the same markdown-it parser and CSS as the backend.
 */
export default function LivePreview({ content, background, isHtml, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize, onContentChange, onUndo, onRedo, canUndo, canRedo, onPagesChange }) {
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

      // Helper: measure an element's total height including margins
      const measureHeight = (el) => {
        const style = window.getComputedStyle(el);
        return el.getBoundingClientRect().height 
          + parseFloat(style.marginTop) 
          + parseFloat(style.marginBottom);
      };

      // Helper: split a TABLE across pages by distributing rows
      const splitTable = (tableEl, availableHeight, maxPageHeight) => {
        const thead = tableEl.querySelector('thead');
        const theadHtml = thead ? thead.outerHTML : '';
        const theadHeight = thead ? measureHeight(thead) : 0;
        const rows = Array.from(tableEl.querySelectorAll('tbody tr, tr')).filter(
          r => !r.closest('thead') && !r.closest('tfoot')
        );
        
        const chunks = [];
        let currentRows = [];
        let currentH = theadHeight;

        rows.forEach(row => {
          const rowH = measureHeight(row);
          const limit = chunks.length === 0 ? availableHeight : maxPageHeight;
          if (currentH + rowH > limit && currentRows.length > 0) {
            chunks.push(currentRows);
            currentRows = [row.outerHTML];
            currentH = theadHeight + rowH;
          } else {
            currentRows.push(row.outerHTML);
            currentH += rowH;
          }
        });
        if (currentRows.length > 0) chunks.push(currentRows);

        const tableAttrs = tableEl.className ? ` class="${tableEl.className}"` : '';
        return chunks.map(rowGroup => 
          `<table${tableAttrs} style="${tableEl.style.cssText}">${theadHtml}<tbody>${rowGroup.join('')}</tbody></table>`
        );
      };

      // Helper: split a PRE across pages by lines
      const splitPre = (preEl, availableHeight, maxPageHeight) => {
        const text = preEl.textContent || '';
        const lines = text.split('\n');
        const totalH = preEl.getBoundingClientRect().height;
        const lineH = lines.length > 0 ? totalH / lines.length : 20;
        
        const chunks = [];
        let currentLines = [];
        let currentH = 0;
        const padding = 32; // approx 1em top + 1em bottom padding

        lines.forEach(line => {
          const limit = chunks.length === 0 ? (availableHeight - padding) : (maxPageHeight - padding);
          if (currentH + lineH > limit && currentLines.length > 0) {
            chunks.push(currentLines);
            currentLines = [line];
            currentH = lineH;
          } else {
            currentLines.push(line);
            currentH += lineH;
          }
        });
        if (currentLines.length > 0) chunks.push(currentLines);

        const codeEl = preEl.querySelector('code');
        const langClass = codeEl?.className || '';
        return chunks.map(group => {
          const escaped = group.join('\n').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          return langClass 
            ? `<pre><code class="${langClass}">${escaped}</code></pre>`
            : `<pre>${escaped}</pre>`;
        });
      };

      // Helper: check if tag is a heading or hr
      const isHeadingOrHr = (tag) => /^(H[1-6]|HR)$/.test(tag);

      children.forEach((child) => {
        const childHeight = measureHeight(child);
        
        // Case 1: fits on current page
        if (currentPageHeight + childHeight <= CONTENT_MAX_HEIGHT_PX) {
          newPages[newPages.length - 1].push(child.outerHTML);
          currentPageHeight += childHeight;
          return;
        }
        
        // Case 2: doesn't fit — need to go to next page
        if (newPages[newPages.length - 1].length > 0) {
          // Pull orphaned headings/hr from end of current page to next page
          const currentPage = newPages[newPages.length - 1];
          const orphans = [];
          while (currentPage.length > 0) {
            // Check if the last item on the page is a heading or hr by parsing its tag
            const lastHtml = currentPage[currentPage.length - 1];
            const tagMatch = lastHtml.match(/^<(h[1-6]|hr)[\s>]/i);
            if (tagMatch) {
              orphans.unshift(currentPage.pop());
            } else {
              break;
            }
          }
          
          // Start new page with the orphaned headings + current element
          if (childHeight <= CONTENT_MAX_HEIGHT_PX) {
            newPages.push([...orphans, child.outerHTML]);
            // Approximate orphan heights (small — headings are short)
            currentPageHeight = childHeight + (orphans.length * 40);
            return;
          }
          
          // Element too tall even for a full page — start new page and split
          newPages.push([...orphans]);
          currentPageHeight = orphans.length * 40;
        }

        // Case 3: element is on an empty page but too tall — split
        if (childHeight > CONTENT_MAX_HEIGHT_PX) {
          const tag = child.tagName;
          
          if (tag === 'TABLE') {
            const chunks = splitTable(child, CONTENT_MAX_HEIGHT_PX - currentPageHeight, CONTENT_MAX_HEIGHT_PX);
            chunks.forEach((chunk, i) => {
              if (i > 0) {
                newPages.push([]);
                currentPageHeight = 0;
              }
              newPages[newPages.length - 1].push(chunk);
              currentPageHeight += CONTENT_MAX_HEIGHT_PX * 0.8;
            });
          } else if (tag === 'PRE') {
            const chunks = splitPre(child, CONTENT_MAX_HEIGHT_PX - currentPageHeight, CONTENT_MAX_HEIGHT_PX);
            chunks.forEach((chunk, i) => {
              if (i > 0) {
                newPages.push([]);
                currentPageHeight = 0;
              }
              newPages[newPages.length - 1].push(chunk);
              currentPageHeight += CONTENT_MAX_HEIGHT_PX * 0.8;
            });
          } else {
            newPages[newPages.length - 1].push(child.outerHTML);
            currentPageHeight = childHeight;
          }
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

  useEffect(() => {
    if (onPagesChange) {
      // Join the inner arrays (tags) into single HTML strings per page
      const flatPages = pages.map(p => p.join(''));
      onPagesChange(flatPages);
    }
  }, [pages, onPagesChange]);

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
        className="preview-content fixed top-[-9999px] left-[-9999px] pointer-events-none" 
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
