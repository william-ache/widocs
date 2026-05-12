/**
 * ============================================================
 *  WiDocs — PDF Generation API
 * ============================================================
 *  POST /api/generate-pdf
 *
 *  Body (JSON):
 *    - content   : string   — Markdown text to render
 *    - background: string   — URL or data-URI (Base64) of the background image
 *
 *  Response: application/pdf  (binary stream)
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const MarkdownIt = require('markdown-it');

// ── Markdown-it setup ──────────────────────────────────────
const md = new MarkdownIt({
  html: true,        // Allow raw HTML inside Markdown
  linkify: true,     // Auto-convert URL-like text to links
  typographer: true, // Enable smart quotes & other typographic niceties
});

// ── Express setup ──────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));   // Large payloads (Base64 images)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Health-check ───────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    service: 'WiDocs PDF API',
    status: 'running',
    version: '1.0.0',
    endpoint: 'POST /api/generate-pdf',
  });
});

// ── PDF Generation Endpoint ────────────────────────────────
app.post('/api/generate-pdf', async (req, res) => {
  const { 
    content, 
    background, 
    isHtml, 
    marginTop = 40, 
    marginBottom = 30, 
    marginX = 25,
    paperWidth = 210,
    paperHeight = 297,
    pageColor = '#ffffff',
    contentColor = '#ffffff',
    fontSize = 12
  } = req.body;

  if (!content || !background) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (content y background).' });
  }

  let browser;
  try {
    // If content is an array, it's already paginated HTML strings from the client
    const pagesToRender = Array.isArray(content) ? content : md.render(content);
    const fullHtml = buildHtmlDocument(pagesToRender, background, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize);

    console.log('[WiDocs] Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 120000 });

    // Small delay to ensure all styles/images are fully rendered
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      width: `${paperWidth}mm`,
      height: `${paperHeight}mm`,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      printBackground: true,
    });

    await browser.close();
    browser = null;

    console.log(`[WiDocs] PDF generated OK — ${pdfBuffer.length} bytes`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="widocs.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    return res.end(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('[WiDocs] API Error:', err);
    if (browser) await browser.close().catch(() => {});
    return res.status(500).json({ error: 'Error al generar PDF', details: err.message });
  }
});

// ── HTML/Normal Document Endpoint ──────────────────────────
app.post('/api/generate-html', async (req, res) => {
  const { content, background, isHtml, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize } = req.body;
  try {
    const htmlBody = isHtml ? content : md.render(content);
    const fullHtml = buildHtmlDocument(htmlBody, background, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize);

    res.set({
      'Content-Type': 'text/html',
      'Content-Disposition': 'attachment; filename="widocs.html"',
    });
    return res.send(fullHtml);
  } catch (err) {
    return res.status(500).json({ error: 'Error al generar HTML', details: err.message });
  }
});

// ── Word Document (.doc) Endpoint ──────────────────────────
app.post('/api/generate-docx', async (req, res) => {
  const { content, background, isHtml, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize } = req.body;
  try {
    const htmlBody = isHtml ? content : md.render(content);
    const fullHtml = buildHtmlDocument(htmlBody, background, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize);

    res.set({
      'Content-Type': 'application/msword',
      'Content-Disposition': 'attachment; filename="widocs.doc"',
    });
    return res.send(fullHtml);
  } catch (err) {
    return res.status(500).json({ error: 'Error al generar Word', details: err.message });
  }
});

// ── HTML Template Builder ──
function buildHtmlDocument(content, bgImage, marginTop = 40, marginBottom = 30, marginX = 25, paperWidth = 210, paperHeight = 297, pageColor = '#ffffff', contentColor = '#ffffff', fontSize = 12) {
  // content can be a string (raw HTML) or an array of pages (each page can be a string or array of tags)
  const pages = Array.isArray(content) ? content : [content];
  
  return /* html */ `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>WiDocs Document</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: ${paperWidth}mm ${paperHeight}mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #f0f0f0; -webkit-print-color-adjust: exact !important; }
    
    .page {
      position: relative;
      width: ${paperWidth}mm;
      height: ${paperHeight}mm;
      background-color: ${pageColor};
      overflow: hidden;
      page-break-after: always;
    }

    .page-background {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-image: url("${bgImage}");
      background-size: cover;
      background-position: center;
      z-index: 1;
    }

    .page-content {
      position: absolute;
      top: ${marginTop}mm;
      left: ${marginX}mm;
      width: ${paperWidth - (marginX * 2)}mm;
      height: ${paperHeight - marginTop - marginBottom}mm;
      z-index: 2;
      font-family: 'Inter', sans-serif;
      font-size: ${fontSize}pt;
      line-height: 1.6;
      color: #1a1a2e;
    }

    /* Core Styles for Content */
    .page-content h1, .page-content h2, .page-content h3 { color: #0f0f23; margin: 0.5em 0; line-height: 1.2; }
    .page-content h1 { font-size: 2.2em; }
    .page-content h2 { font-size: 1.7em; }
    .page-content p { margin: 1em 0; text-align: justify; }
    
    .page-content table { 
      width: 100%; border-collapse: collapse; margin: 1em 0; 
      table-layout: fixed; font-size: 0.9em;
    }
    .page-content th, .page-content td { 
      border: 1px solid #d1d5db; padding: 0.6em; word-wrap: break-word; 
    }
    .page-content th { background: #6366f1; color: white; }
    .page-content tr:nth-child(even) { background: rgba(99,102,241,0.03); }

    pre { 
      background: #1e1e2e; color: #cdd6f4; padding: 1em; border-radius: 8px; 
      font-size: 0.85em; white-space: pre-wrap; word-break: break-all; margin: 1em 0;
    }
    
    img { max-width: 100%; border-radius: 4px; display: block; margin: 1em auto; }

    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }

    @media print {
      body { background: transparent; }
      .page { box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  ${pages.map(pageContent => {
    // If pageContent is an array of tags, join them
    const htmlSnippet = Array.isArray(pageContent) ? pageContent.join('') : pageContent;
    return `
      <div class="page">
        <div class="page-background"></div>
        <div class="page-content">
          ${htmlSnippet}
        </div>
      </div>
    `;
  }).join('')}
</body>
</html>`;
}


// ── Start server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🟢  WiDocs PDF API                    ║
  ║   📍  http://localhost:${PORT}              ║
  ║   📄  POST /api/generate-pdf             ║
  ╚══════════════════════════════════════════╝
  `);
});
