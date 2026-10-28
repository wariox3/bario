/**
 * Lee el filename del header `Content-Disposition`. Soporta tanto el formato
 * RFC 5987 (`filename*=UTF-8''nombre%20codificado.pdf`) como el clásico
 * (`filename="nombre.pdf"`). Si el header no viene o no es parseable, devuelve
 * el fallback.
 *
 * Importante: para que el navegador exponga este header al JS, el backend debe
 * incluir `Access-Control-Expose-Headers: Content-Disposition` en CORS. Si no,
 * `headers.get('content-disposition')` será `null` y se usará el fallback.
 */
export function parseFilename(contentDisposition: string | null, fallback = 'download'): string {
  if (!contentDisposition) return fallback;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return fallback;
    }
  }

  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return match ? match[1].trim() : fallback;
}

/**
 * Crea un object URL temporal a partir del blob, dispara la descarga vía un
 * `<a>` sintético y limpia el URL en el siguiente tick para no filtrar memoria.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** El iframe de la última impresión: se quita al imprimir otra vez, no antes. */
let iframeImpresion: { readonly iframe: HTMLIFrameElement; readonly url: string } | null = null;

/**
 * Abre el diálogo de impresión del navegador con el PDF, sin salir de la
 * pantalla: lo carga en un iframe oculto y llama a `print()` sobre él.
 *
 * El iframe no se quita al terminar porque varios navegadores cancelan la
 * impresión si el documento desaparece con el diálogo abierto; se limpia en la
 * siguiente impresión. Va fuera de pantalla y no con `display: none`, que
 * impide a Chrome cargar el visor de PDF.
 *
 * Si el navegador no deja imprimir el iframe, abre el PDF en otra pestaña y, si
 * el bloqueador de ventanas lo impide, lo descarga.
 */
export function imprimirBlob(blob: Blob, filename: string): void {
  limpiarIframeImpresion();

  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
  });
  iframe.onload = () => {
    try {
      const ventana = iframe.contentWindow;
      if (!ventana) throw new ImpresionNoDisponibleError();
      ventana.focus();
      ventana.print();
    } catch {
      limpiarIframeImpresion();
      abrirEnPestana(blob, filename);
    }
  };
  iframe.src = url;
  document.body.appendChild(iframe);
  iframeImpresion = { iframe, url };
}

/** El iframe de impresión no expone su ventana. */
class ImpresionNoDisponibleError extends Error {
  constructor() {
    super('El iframe de impresión no expone su ventana');
    this.name = 'ImpresionNoDisponibleError';
  }
}

function limpiarIframeImpresion(): void {
  if (!iframeImpresion) return;
  iframeImpresion.iframe.remove();
  URL.revokeObjectURL(iframeImpresion.url);
  iframeImpresion = null;
}

/** Plan B: el PDF en otra pestaña, o descargado si el navegador bloquea la ventana. */
function abrirEnPestana(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  // Sin `noopener`: con él `window.open` devuelve siempre `null` y no se sabría si abrió.
  if (!window.open(url, '_blank')) {
    URL.revokeObjectURL(url);
    triggerBrowserDownload(blob, filename);
    return;
  }
  // La pestaña nueva necesita el URL mientras carga el PDF.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
