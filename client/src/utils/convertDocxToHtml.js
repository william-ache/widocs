/**
 * ============================================================
 *  convertDocxToHtml.js
 * ============================================================
 *  Utilidad para convertir archivos .docx a HTML limpio
 *  usando mammoth.js.
 *
 *  ▸ Mantiene: tablas, negritas, cursivas, listas, headings,
 *    hipervínculos e imágenes embebidas (inline base64).
 *  ▸ Elimina: estilos inline de Word, clases CSS, atributos
 *    data-*, spans vacíos y markup innecesario.
 *
 *  Uso:
 *    import { convertDocxToHtml } from './convertDocxToHtml';
 *    const { html, warnings } = await convertDocxToHtml(file);
 * ============================================================
 */

import mammoth from 'mammoth';

/**
 * Mapa de estilos de Word → elementos HTML.
 * Si tu plantilla .docx usa estilos personalizados, agrégalos aquí.
 */
const STYLE_MAP = [
  // ── Headings ──
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",

  // ── Headings (Spanish variants) ──
  "p[style-name='Título 1'] => h1:fresh",
  "p[style-name='Título 2'] => h2:fresh",
  "p[style-name='Título 3'] => h3:fresh",
  "p[style-name='Título 4'] => h4:fresh",

  // ── Formatting ──
  "b => strong",
  "i => em",
  "u => u",
  "strike => s",

  // ── Title / Subtitle ──
  "p[style-name='Title']    => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='Título']   => h1:fresh",
  "p[style-name='Subtítulo'] => h2:fresh",

  // ── Quote ──
  "p[style-name='Quote']          => blockquote > p:fresh",
  "p[style-name='Intense Quote']  => blockquote > p:fresh",
  "p[style-name='Cita']           => blockquote > p:fresh",

  // ── Code ──
  "p[style-name='Code']        => pre:fresh",
  "r[style-name='Code Char']   => code",
].join('\n');

/**
 * Opciones de conversión de imágenes.
 * Convierte imágenes embebidas a data-URIs inline (base64).
 */
const IMAGE_CONVERTER = mammoth.images.imgElement((image) => {
  return image.read('base64').then((imageBuffer) => {
    return {
      src: `data:${image.contentType};base64,${imageBuffer}`,
    };
  });
});

/**
 * Convierte un archivo .docx (File object del browser) a HTML limpio.
 *
 * @param {File} file — Objeto File del input/drag-and-drop del usuario
 * @returns {Promise<{ html: string, warnings: string[] }>}
 */
export async function convertDocxToHtml(file) {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo.');
  }

  // Leer el archivo como ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Convertir con mammoth
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: STYLE_MAP,
      convertImage: IMAGE_CONVERTER,
      // Ignorar estilos vacíos y notas al pie
      ignoreEmptyParagraphs: true,
    }
  );

  // Limpiar el HTML resultante
  const cleanHtml = sanitizeWordHtml(result.value);

  // Extraer warnings útiles (no los repetitivos de estilos)
  const warnings = result.messages
    .filter((m) => m.type === 'warning')
    .map((m) => m.message)
    .filter((msg) => !msg.includes('Unrecognised paragraph style'));

  return { html: cleanHtml, warnings };
}

/**
 * Sanitiza el HTML generado por mammoth eliminando artefactos de Word.
 *
 * @param {string} html — HTML crudo de mammoth
 * @returns {string} HTML limpio
 */
function sanitizeWordHtml(html) {
  if (!html) return '';

  let clean = html;

  // ── 1. Eliminar atributos style="" inline ──
  clean = clean.replace(/\s*style="[^"]*"/gi, '');

  // ── 2. Eliminar atributos class="" de Word ──
  clean = clean.replace(/\s*class="[^"]*"/gi, '');

  // ── 3. Eliminar atributos data-* ──
  clean = clean.replace(/\s*data-[\w-]+="[^"]*"/gi, '');

  // ── 4. Eliminar atributos lang="" y xml:lang="" ──
  clean = clean.replace(/\s*(xml:)?lang="[^"]*"/gi, '');

  // ── 5. Eliminar atributos align="" (legacy) ──
  clean = clean.replace(/\s*align="[^"]*"/gi, '');

  // ── 6. Eliminar spans vacíos o sin función ──
  clean = clean.replace(/<span\s*>\s*([\s\S]*?)\s*<\/span>/gi, '$1');

  // ── 7. Eliminar <o:p> y otros tags de Office XML namespace ──
  clean = clean.replace(/<\/?o:[^>]*>/gi, '');
  clean = clean.replace(/<\/?v:[^>]*>/gi, '');
  clean = clean.replace(/<\/?w:[^>]*>/gi, '');

  // ── 8. Eliminar comentarios HTML ──
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');

  // ── 9. Eliminar párrafos vacíos ──
  clean = clean.replace(/<p>\s*(&nbsp;)?\s*<\/p>/gi, '');

  // ── 10. Eliminar <br> múltiples consecutivos ──
  clean = clean.replace(/(<br\s*\/?\s*>){2,}/gi, '<br>');

  // ── 11. Limpiar whitespace excesivo ──
  clean = clean.replace(/\n{3,}/g, '\n\n');

  // ── 12. Eliminar divs vacíos ──
  clean = clean.replace(/<div\s*>\s*<\/div>/gi, '');

  // ── 13. Normalizar &nbsp; sueltos a espacios ──
  clean = clean.replace(/&nbsp;/g, ' ');

  // ── 14. Limpiar atributos width/height en tablas (para responsive) ──
  clean = clean.replace(/\s*width="[^"]*"/gi, '');
  clean = clean.replace(/\s*height="[^"]*"/gi, '');
  clean = clean.replace(/\s*cellspacing="[^"]*"/gi, '');
  clean = clean.replace(/\s*cellpadding="[^"]*"/gi, '');
  clean = clean.replace(/\s*border="[^"]*"/gi, '');
  clean = clean.replace(/\s*valign="[^"]*"/gi, '');

  return clean.trim();
}

/**
 * Verifica si un archivo tiene extensión .docx
 *
 * @param {File} file — Archivo a verificar
 * @returns {boolean}
 */
export function isDocxFile(file) {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}
