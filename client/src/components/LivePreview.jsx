import { useMemo } from 'react';
import { IconEye } from './Icons';

/**
 * LivePreview — Renders an A4-proportioned iframe showing
 * the Markdown content over the background image in real time.
 */
export default function LivePreview({ content, background, isHtml }) {
  // Build an HTML document that mirrors the PDF output
  const previewHtml = useMemo(() => {
    // Determine the content to display
    const htmlContent = isHtml ? content : simpleMarkdownToHtml(content);

    const bgCss = background
      ? `background-image: url("${escapeQuotes(background)}"); background-size: cover; background-position: center; background-repeat: no-repeat;`
      : 'background: #ffffff;';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 100%;
      height: 100%;
      overflow: auto;
    }

    body {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      line-height: 1.7;
      color: #1a1a2e;
      padding: 24px;
      position: relative;
      min-height: 100%;
    }

    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      ${bgCss}
      z-index: -1;
    }

    .content { position: relative; z-index: 1; }

    h1, h2, h3, h4, h5, h6 {
      color: #0f0f23;
      margin-top: 1.2em;
      margin-bottom: 0.5em;
      font-weight: 700;
      line-height: 1.3;
    }
    h1 { font-size: 1.8em; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.3em; }
    h2 { font-size: 1.4em; border-bottom: 1px solid #e8e8e8; padding-bottom: 0.2em; }
    h3 { font-size: 1.15em; }

    p { margin: 0.6em 0; text-align: justify; }

    a { color: #2563eb; text-decoration: none; }

    code {
      background: rgba(99, 102, 241, 0.08);
      padding: 0.1em 0.35em;
      border-radius: 3px;
      font-size: 0.88em;
      font-family: 'Consolas', monospace;
    }

    pre {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: 0.8em 1em;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.82em;
      line-height: 1.5;
      margin: 0.8em 0;
    }
    pre code { background: transparent; padding: 0; color: inherit; }

    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    li { margin-bottom: 0.2em; }

    blockquote {
      margin: 0.8em 0;
      padding: 0.5em 1em;
      border-left: 3px solid #6366f1;
      background: rgba(99, 102, 241, 0.05);
      border-radius: 0 5px 5px 0;
      color: #374151;
    }
    blockquote p { margin: 0.2em 0; }

    table { width: 100%; border-collapse: collapse; margin: 0.8em 0; font-size: 0.9em; }
    th, td { border: 1px solid #d1d5db; padding: 0.4em 0.6em; text-align: left; }
    th { background: #6366f1; color: #fff; font-weight: 600; }
    tr:nth-child(even) { background: rgba(99,102,241,0.04); }

    hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0; }

    strong { font-weight: 700; }
    em { font-style: italic; }

    /* Empty state */
    .empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 200px; color: #94a3b8; text-align: center;
    }
    .empty-state svg { width: 40px; height: 40px; margin-bottom: 12px; opacity: 0.4; }
    .empty-state p { font-size: 11px; }
  </style>
</head>
<body>
  <div class="content">
    ${htmlContent || `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>Escribe o sube contenido Markdown<br/>para ver la previsualización</p>
      </div>
    `}
  </div>
</body>
</html>`;
  }, [content, background]);

  const blobUrl = useMemo(() => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [previewHtml]);

  return (
    <div className="flex flex-col gap-3 h-full animate-fade-in">
      <label className="label">
        <span className="inline-flex items-center gap-1.5">
          <IconEye className="w-3.5 h-3.5 text-neon-green" />
          Live Preview
        </span>
      </label>

      <div className="relative flex-1 rounded-2xl overflow-hidden border border-surface-700/30 glow-border bg-surface-900/30">
        {/* ── A4 aspect ratio container ── */}
        <div className="w-full h-full min-h-[400px] flex items-start justify-center p-4 overflow-auto">
          <div className="a4-frame max-w-[380px] flex-shrink-0">
            <iframe
              src={blobUrl}
              title="Live Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
              id="preview-iframe"
            />
          </div>
        </div>

        {/* ── Format badge ── */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-surface-900/80 backdrop-blur-sm border border-surface-700/40 text-[10px] font-mono text-surface-500">
          A4 · 210×297mm
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Simple Markdown → HTML converter (client-side preview only)
   The real conversion is done server-side by markdown-it.
   ──────────────────────────────────────────────────────────── */
function simpleMarkdownToHtml(md) {
  if (!md) return '';

  let html = md;

  // Code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Blockquote
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Unordered list
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px">');

  // Paragraphs (lines that aren't already wrapped)
  html = html.replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeQuotes(str) {
  return str.replace(/"/g, '\\"');
}
