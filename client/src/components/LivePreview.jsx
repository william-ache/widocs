import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { IconEye } from './Icons';
import MarkdownIt from 'markdown-it';

// Same markdown-it config as the backend server.js
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

const getDocumentStyles = (fontSize) => `
  .preview-content, .page-content {
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: ${fontSize}pt;
    line-height: 1.6;
    color: #1a1a2e;
    box-sizing: border-box;
  }
  .preview-content h1, .preview-content h2, .preview-content h3, 
  .page-content h1, .page-content h2, .page-content h3 {
    color: #0f0f23;
    margin: 0;
    line-height: 1.2;
    padding: 0.2em 0;
  }
  .preview-content h1, .page-content h1 { font-size: 2em; }
  .preview-content h2, .page-content h2 { font-size: 1.5em; }
  .preview-content h3, .page-content h3 { font-size: 1.2em; }
  .preview-content p, .page-content p { margin: 0; text-align: justify; line-height: 1.6; }
  .preview-content ul, .preview-content ol, .page-content ul, .page-content ol { margin: 0; padding-left: 1.5em; }
  .preview-content li, .page-content li { margin: 0; line-height: 1.6; }
  .preview-content table, .page-content table { width: 100%; border-collapse: collapse; margin: 0.5em 0; table-layout: fixed; }
  .preview-content th, .preview-content td, .page-content th, .page-content td { border: 1px solid #d1d5db; padding: 6px; text-align: left; word-wrap: break-word; }
  .preview-content th, .page-content th { background: #6366f1; color: #ffffff; }
  .preview-content pre, .page-content pre { background: transparent !important; padding: 0 !important; white-space: pre-wrap !important; }
  .preview-content img { max-width: 100%; height: auto; border-radius: 6px; }
  .preview-content * { box-sizing: border-box; }
`;

export default function LivePreview({ content, background, isHtml, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize, onContentChange, onUndo, onRedo, canUndo, canRedo, onPagesChange }) {
  const [zoom, setZoom] = useState(0.5);
  const [pages, setPages] = useState([]);
  const hiddenRenderRef = useRef(null);
  const pageRefs = useRef([]);
  const isEditing = useRef(false);
  const inputTimerRef = useRef(null);
  const savedSelection = useRef(null);

  const escapedBg = useMemo(() => background?.replace(/"/g, '\\"') || '', [background]);

  // --- SELECTION UTILS ---
  const saveSelection = (el) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(el);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    return { start, pageIdx: pageRefs.current.indexOf(el) };
  };

  const restoreSelection = (el, saved) => {
    if (!saved) return;
    const sel = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    const nodeStack = [el];
    while (nodeStack.length > 0) {
      const node = nodeStack.pop();
      if (node.nodeType === 3) {
        const nextCharCount = charCount + node.length;
        if (saved.start >= charCount && saved.start <= nextCharCount) {
          range.setStart(node, saved.start - charCount);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
        charCount = nextCharCount;
      } else {
        let i = node.childNodes.length;
        while (i--) nodeStack.push(node.childNodes[i]);
      }
    }
  };

  // --- SYNC LOGIC ---
  const handlePageEdit = useCallback((idx = -1) => {
    const validRefs = pageRefs.current.filter(el => el instanceof HTMLElement);
    if (validRefs.length === 0) return;

    if (idx !== -1 && pageRefs.current[idx]) {
      savedSelection.current = saveSelection(pageRefs.current[idx]);
    }

    let allHtml = validRefs
      .map(el => el.innerHTML.replace(/<style>.*?<\/style>/g, '').trim())
      .join('')
      .replace(/<\/table>\s*<table[^>]*>/gi, '')
      .replace(/<\/tbody>\s*<tbody>/gi, '')
      .replace(/<\/ol>\s*<ol[^>]*>/gi, '')
      .replace(/<\/ul>\s*<ul[^>]*>/gi, '')
      .trim();

    if (onContentChange && allHtml) {
      onContentChange(allHtml, true);
    }
  }, [onContentChange]);

  const handlePageInput = (idx) => {
    if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
    isEditing.current = true;
    inputTimerRef.current = setTimeout(() => {
      handlePageEdit(idx);
      isEditing.current = false;
    }, 1000); // 1s delay to be safe
  };

  // --- PAGINATION ENGINE ---
  useEffect(() => {
    if (isEditing.current) return;
    if (!content) { setPages([]); return; }

    const timer = setTimeout(() => {
      if (!hiddenRenderRef.current) return;

      const htmlContent = isHtml ? content : md.render(content);
      const stylesTag = `<style>${getDocumentStyles(fontSize)}</style>`;
      hiddenRenderRef.current.innerHTML = stylesTag + htmlContent;

      const children = Array.from(hiddenRenderRef.current.children)
        .filter(c => c.tagName !== 'STYLE');

      const PX_PER_MM = 3.779527;
      const SAFETY_BUFFER_MM = 10; // Increased for extra safety
      const MAX_H = (paperHeight - marginTop - marginBottom - SAFETY_BUFFER_MM) * PX_PER_MM;
      
      hiddenRenderRef.current.style.width = `${paperWidth - (marginX * 2)}mm`;
      hiddenRenderRef.current.style.position = 'absolute';
      hiddenRenderRef.current.style.left = '-10000px';
      hiddenRenderRef.current.style.top = '0';
      hiddenRenderRef.current.style.height = 'auto';
      hiddenRenderRef.current.style.padding = '0';
      hiddenRenderRef.current.style.margin = '0';
      hiddenRenderRef.current.style.visibility = 'visible';

      const finalPages = [[]];
      let lastPageBreakOffset = 0;

      children.forEach((child, idx) => {
        const top = child.offsetTop;
        const bottom = top + child.offsetHeight;
        const relativeBottom = bottom - lastPageBreakOffset;
        const html = child.outerHTML;
        const lastIdx = finalPages.length - 1;

        if (finalPages[lastIdx].length === 0 || relativeBottom <= MAX_H) {
          finalPages[lastIdx].push(html);
        } else {
          // Doesn't fit, start new page
          finalPages.push([html]);
          lastPageBreakOffset = top;
        }
      });

      setPages(finalPages);
    }, 300);

    return () => clearTimeout(timer);
  }, [content, isHtml, marginTop, marginBottom, marginX, paperWidth, paperHeight, fontSize]);

  useEffect(() => {
    if (onPagesChange && pages.length > 0) {
      onPagesChange(pages.map(p => p.join('')));
    }
  }, [pages, onPagesChange]);

  useEffect(() => {
    if (savedSelection.current && pageRefs.current[savedSelection.current.pageIdx]) {
      restoreSelection(pageRefs.current[savedSelection.current.pageIdx], savedSelection.current);
      savedSelection.current = null;
    }
  }, [pages]);

  return (
    <div className="flex flex-col gap-3 h-full relative">
      <div className="flex items-center justify-between">
        <label className="label">
          <span className="inline-flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold text-surface-400">
            <IconEye className="w-3.5 h-3.5 text-accent-400" />
            Vista Previa
          </span>
        </label>
        <div className="flex items-center gap-1 bg-surface-900/80 border border-surface-700/40 p-1 rounded-lg backdrop-blur-sm shadow-xl">
          <button onClick={onUndo} disabled={!canUndo} className={`p-1.5 rounded ${canUndo ? 'hover:bg-surface-800 text-surface-400' : 'text-surface-700'}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h10a5 5 0 0 1 0 10H9" strokeWidth="2" /><path d="M3 10l4-4" strokeWidth="2" /><path d="M3 10l4 4" strokeWidth="2" /></svg>
          </button>
          <button onClick={onRedo} disabled={!canRedo} className={`p-1.5 rounded ${canRedo ? 'hover:bg-surface-800 text-surface-400' : 'text-surface-700'}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 10H11a5 5 0 0 0 0 10h4" strokeWidth="2" /><path d="M21 10l-4-4" strokeWidth="2" /><path d="M21 10l-4 4" strokeWidth="2" /></svg>
          </button>
          <div className="w-px h-3 bg-surface-700 mx-1" />
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-1.5 text-surface-400"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 12H4" strokeWidth="2" /></svg></button>
          <span className="text-[10px] font-mono text-surface-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 1.2))} className="p-1.5 text-surface-400"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth="2" /></svg></button>
          <button onClick={() => setZoom(0.5)} className="px-2 py-1 text-[9px] font-bold uppercase text-accent-400">Ajustar</button>
        </div>
      </div>

      <div ref={hiddenRenderRef} className="preview-content fixed top-[-9999px] left-0 pointer-events-none opacity-0" style={{ visibility: 'hidden' }} />
      <style dangerouslySetInnerHTML={{ __html: getDocumentStyles(fontSize) }} />

      <div className="relative flex-1 rounded-2xl overflow-hidden border border-surface-700/30 bg-surface-950/50 scrollbar-thin">
        <div className="w-full h-full px-8 pb-8 pt-4 overflow-auto flex flex-col items-center gap-10">
          {pages.length > 0 ? (
            pages.map((pageHtml, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Hoja {idx + 1} de {pages.length}</div>
                <div className="shadow-2xl relative" style={{ 
                  width: `${paperWidth}mm`, 
                  height: `${paperHeight}mm`, 
                  transform: `scale(${zoom})`, 
                  transformOrigin: 'top center',
                  marginBottom: `-${paperHeight * (1 - zoom)}mm`, 
                  backgroundColor: pageColor || '#ffffff', 
                  overflow: 'hidden' 
                }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("${escapedBg}")`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
                  
                  {/* Visual Margin Guides (Overlay) */}
                  <div className="absolute inset-0 border border-dashed border-accent-500/10 pointer-events-none z-20" style={{ margin: `${marginTop}mm ${marginX}mm ${marginBottom}mm ${marginX}mm` }} />

                  <div 
                    ref={el => pageRefs.current[idx] = el}
                    className="preview-content relative z-10 w-full h-full text-justify focus:outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => handlePageInput(idx)}
                    onBlur={() => handlePageEdit(idx)}
                    style={{ 
                      paddingTop: `${marginTop}mm`, 
                      paddingBottom: `${marginBottom}mm`, 
                      paddingLeft: `${marginX}mm`, 
                      paddingRight: `${marginX}mm`,
                      color: '#1a1a2e',
                      backgroundColor: contentColor || 'transparent',
                      backgroundClip: 'content-box',
                      lineHeight: '1.6',
                      overflow: 'hidden'
                    }}
                    dangerouslySetInnerHTML={{ __html: pageHtml.join('') }}
                  />
                  <div className="absolute bottom-4 right-6 text-[10px] text-surface-400 font-mono italic">WiDocs · Página {idx + 1}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-surface-600 italic">Cargando documento...</div>
          )}
        </div>
      </div>
    </div>
  );
}
