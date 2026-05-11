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
    const htmlBody = isHtml ? content : md.render(content);
    const fullHtml = buildHtmlDocument(htmlBody, background, marginTop, marginBottom, marginX, paperWidth, paperHeight, pageColor, contentColor, fontSize);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle2', timeout: 60000 });

    const pdfBuffer = await page.pdf({
      width: `${paperWidth}mm`,
      height: `${paperHeight}mm`,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      printBackground: true,
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="widocs.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    return res.send(pdfBuffer);
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

// ── HTML Template Builder ──────────────────────────────────
/**
 * Builds a self-contained HTML document that includes:
 *   • @page CSS rule with the background image sized to cover every page
 *   • Modern typography (Inter from Google Fonts)
 *   • Clean, professional styling for rendered Markdown
 *
 * @param {string} htmlBody  – Rendered HTML from markdown-it
 * @param {string} bgImage   – URL or data-URI for the background image
 * @returns {string} Full HTML string
 */
function buildHtmlDocument(htmlBody, bgImage, marginTop = 40, marginBottom = 30, marginX = 25, paperWidth = 210, paperHeight = 297, pageColor = '#ffffff', contentColor = '#ffffff', fontSize = 12) {
  return /* html */ `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WiDocs Document</title>

  <!-- Google Font: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet">

  <style>
    /* ===================================================
       @page — Background image repeated on EVERY page
       =================================================== */
    @page {
      size: ${paperWidth}mm ${paperHeight}mm;
      margin: 0;                       /* margins are handled by Puppeteer */
    }

    /* Full-page background via a fixed pseudo-element.
       This is the most reliable cross-browser technique for
       getting Puppeteer to render a bg on every page.           */
    html {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
                   Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: ${fontSize}pt;
      line-height: 1.7;
      color: #1a1a2e;
      position: relative;
      background-color: ${pageColor};
    }

    /* Background image — fixed so it repeats on every printed page */
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url("${bgImage}");
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: -1;
    }

    /* ===================================================
       Content Wrapper
       =================================================== */
    .content {
      position: relative;
      z-index: 1;
      padding-top: ${marginTop}mm;
      padding-bottom: ${marginBottom}mm;
      padding-left: ${marginX}mm;
      padding-right: ${marginX}mm;
      box-sizing: border-box;
      min-height: 100vh;
      background-color: ${contentColor};
      background-clip: content-box;
    }

    /* ===================================================
       Typography & Markdown Elements
       =================================================== */
    h1, h2, h3, h4, h5, h6 {
      color: #0f0f23;
      margin-top: 1.4em;
      margin-bottom: 0.6em;
      font-weight: 700;
      line-height: 1.3;
    }

    h1 { font-size: 2em;   border-bottom: 2px solid #e0e0e0; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #e8e8e8; padding-bottom: 0.25em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em;  }

    p {
      margin: 0.8em 0;
      text-align: justify;
    }

    a {
      color: #2563eb;
      text-decoration: none;
    }

    /* ── Code ── */
    code {
      background: rgba(99, 102, 241, 0.08);
      padding: 0.15em 0.4em;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
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

    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }

    /* ── Lists ── */
    ul, ol {
      padding-left: 1.8em;
      margin: 0.6em 0;
    }

    li {
      margin-bottom: 0.3em;
    }

    /* ── Blockquote ── */
    blockquote {
      margin: 1em 0;
      padding: 0.6em 1.2em;
      border-left: 4px solid #6366f1;
      background: rgba(99, 102, 241, 0.05);
      border-radius: 0 6px 6px 0;
      color: #374151;
    }

    blockquote p {
      margin: 0.3em 0;
    }

    /* ── Tables ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 0.95em;
    }

    th, td {
      border: 1px solid #d1d5db;
      padding: 0.55em 0.8em;
      text-align: left;
    }

    th {
      background: #6366f1;
      color: #ffffff;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: rgba(99, 102, 241, 0.04);
    }

    /* ── Horizontal Rule ── */
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 2em 0;
    }

    /* ── Images inside content ── */
    .content img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 1em 0;
    }
  </style>
</head>
<body>
  <div class="content">
    ${htmlBody}
  </div>
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
