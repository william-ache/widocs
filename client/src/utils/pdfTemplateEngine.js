/**
 * ============================================================
 *  pdfTemplateEngine.js
 * ============================================================
 *  Script para inyectar contenido y estilos de fondo de manera
 *  dinámica en una plantilla base.
 *
 *  Este motor asegura que:
 *  1. El contenido se inyecte en #main-content.
 *  2. La imagen de fondo cubra cada página del PDF (A4).
 *  3. Se use una técnica compatible con Puppeteer/Chromium.
 * ============================================================
 */

/**
 * Genera el HTML final procesado.
 *
 * @param {string} baseTemplate - El HTML de la plantilla base (debe tener <head> y #main-content).
 * @param {string} contentHtml  - El contenido convertido (MD/Docx → HTML).
 * @param {string} imageUrl     - URL o Base64 de la imagen de fondo.
 * @returns {string} HTML completo listo para ser convertido a PDF.
 */
export function processTemplate(baseTemplate, contentHtml, imageUrl) {
  if (!baseTemplate || !contentHtml || !imageUrl) {
    throw new Error('Faltan parámetros obligatorios: baseTemplate, contentHtml o imageUrl.');
  }

  // ── 1. Construcción del bloque de Estilos Críticos ──
  // Usamos un pseudo-elemento fijo para el fondo. Esta es la técnica más robusta
  // para que Puppeteer repita la imagen en todas las páginas de un PDF.
  const dynamicStyles = `
  <style id="widocs-injected-styles">
    @page {
      size: A4;
      margin: 0; /* Los márgenes se aplican al contenido, no al background */
    }

    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1000;
      background-image: url("${imageUrl}");
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      /* Forzar renderizado en impresión */
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    #main-content {
      position: relative;
      z-index: 1;
      /* Margen interno para el contenido (20mm como pide el requerimiento) */
      padding: 20mm;
      box-sizing: border-box;
      min-height: 100vh;
    }
  </style>
  `;

  let processedHtml = baseTemplate;

  // ── 2. Inyección de Estilos ──
  // Insertamos los estilos dinámicos justo antes de cerrar el </head>
  if (processedHtml.includes('</head>')) {
    processedHtml = processedHtml.replace('</head>', `${dynamicStyles}\n</head>`);
  } else {
    // Si no hay head, añadimos uno al principio
    processedHtml = `<head>${dynamicStyles}</head>\n${processedHtml}`;
  }

  // ── 3. Inyección de Contenido ──
  // Buscamos el contenedor #main-content y metemos el HTML dentro.
  // La regex maneja posibles atributos adicionales en el div.
  const mainContentPattern = /(<div[^>]*id=["']main-content["'][^>]*>)([\s\S]*?)(<\/div>)/i;

  if (mainContentPattern.test(processedHtml)) {
    processedHtml = processedHtml.replace(mainContentPattern, `$1${contentHtml}$3`);
  } else {
    // Fallback: Si no encuentra #main-content, lo envuelve en body
    console.warn('Advertencia: No se encontró id="#main-content". Inyectando en body.');
    processedHtml = processedHtml.replace('<body>', `<body>\n<div id="main-content">${contentHtml}</div>`);
  }

  return processedHtml;
}

// ────────────────────────────────────────────────────────────
// Ejemplo de uso (Node.js o Browser)
// ────────────────────────────────────────────────────────────
/*
const myTemplate = `
<!DOCTYPE html>
<html>
<head><title>WiDocs</title></head>
<body>
  <div id="main-content"></div>
</body>
</html>
`;

const myContent = '<h1>Hola Mundo</h1><p>Doc generado satisfactoriamente.</p>';
const myBg = 'https://midominio.com/papel-tapiz.jpg';

const result = processTemplate(myTemplate, myContent, myBg);
console.log(result);
*/
