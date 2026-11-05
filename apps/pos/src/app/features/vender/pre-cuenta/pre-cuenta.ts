import { formatCop, formatFechaCorta, lineBruto, toHora } from '@reddoc/core';
import type { Carrito } from '../carrito/carrito.model';
import { resumenCarrito } from '../carrito/carrito.ops';
import type { EmpresaTirilla } from '../../configuracion/configuracion-empresa.service';

/** Textos fijos de la pre-cuenta, del diccionario. */
export interface TextosPreCuenta {
  readonly titulo: string;
  readonly aviso: string;
  readonly nit: string;
  readonly telefono: string;
  readonly fecha: string;
  readonly cliente: string;
  readonly subtotal: string;
  readonly descuento: string;
  readonly total: string;
}

/**
 * Arma el HTML de la pre-cuenta: un ticket de 80 mm con lo que se va a cobrar
 * en la venta, para entregarlo antes de cobrar. No es una factura (no tiene
 * número ni pasa por el backend) y lo dice en el papel.
 *
 * Las líneas van por su bruto (`cantidad × precio`) para que sumen el subtotal;
 * el descuento y los impuestos se desglosan abajo, como en el resumen de la caja.
 */
export function preCuentaHtml(
  venta: Carrito,
  empresa: EmpresaTirilla,
  tx: TextosPreCuenta,
  ahora: Date,
): string {
  const resumen = resumenCarrito(venta);

  const encabezado = [
    parrafo(empresa.nombre, 'fuerte'),
    empresa.identificacion ? parrafo(`${tx.nit} ${empresa.identificacion}`) : '',
    parrafo(empresa.direccion),
    empresa.telefono ? parrafo(`${tx.telefono} ${empresa.telefono}`) : '',
    parrafo(empresa.correo),
    parrafo(empresa.textos.superior, 'texto'),
  ].join('');

  const lineas = venta.lineas
    .map(
      (l) => `
      <div class="linea">
        <p>${escapar(l.item.nombre)}</p>
        <div class="fila"><span>${l.cantidad} x ${formatCop(l.precio)}</span><span>${formatCop(lineBruto(l))}</span></div>
      </div>`,
    )
    .join('');

  const totales = [
    fila(tx.subtotal, formatCop(resumen.subtotal)),
    resumen.descuento > 0 ? fila(tx.descuento, `-${formatCop(resumen.descuento)}`) : '',
    ...resumen.impuestos.map((i) => fila(i.nombre, formatCop(i.total))),
  ].join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(tx.titulo)}</title>
<style>
  @page { size: 80mm 297mm; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 4mm; width: 80mm; font: 12px/1.35 'Courier New', monospace; color: #000; }
  p { margin: 0; overflow-wrap: anywhere; }
  .centro { text-align: center; }
  .fuerte { font-weight: bold; }
  .texto { margin-top: 2mm; white-space: pre-line; }
  .titulo { margin-top: 3mm; font-size: 14px; font-weight: bold; text-align: center; }
  .aviso { margin-top: 1mm; text-align: center; font-weight: bold; }
  hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
  .fila { display: flex; justify-content: space-between; gap: 2mm; }
  .fila span:last-child { white-space: nowrap; }
  .linea + .linea { margin-top: 1.5mm; }
  .total { font-size: 14px; font-weight: bold; }
</style>
</head>
<body>
  <div class="centro">${encabezado}</div>
  <p class="titulo">${escapar(tx.titulo)}</p>
  <p class="aviso">${escapar(tx.aviso)}</p>
  <hr>
  ${fila(tx.fecha, `${formatFechaCorta(ahora)} ${toHora(ahora)}`)}
  ${venta.contacto ? fila(tx.cliente, venta.contacto.nombre) : ''}
  <hr>
  ${lineas}
  <hr>
  ${totales}
  <div class="fila total"><span>${escapar(tx.total)}</span><span>${formatCop(resumen.total)}</span></div>
  ${empresa.textos.inferior ? `<hr><p class="centro texto">${escapar(empresa.textos.inferior)}</p>` : ''}
  <script>${AJUSTAR_ALTO}</script>
</body>
</html>`;
}

/**
 * CSS no tiene un alto de página "según el contenido" (`size: 80mm auto` es
 * inválido y el navegador cae a Carta), así que el ticket mide su alto y fija la
 * página a esa medida antes de que se imprima: corre al parsear, antes del
 * `load` que dispara el diálogo. Si no corriera, queda el fallback de 80 × 297 mm.
 */
const AJUSTAR_ALTO = `
  var alto = Math.ceil(document.body.getBoundingClientRect().height * 25.4 / 96) + 2;
  var estilo = document.createElement('style');
  estilo.textContent = '@page { size: 80mm ' + alto + 'mm; margin: 0; }';
  document.head.appendChild(estilo);
`;

function parrafo(texto: string, clase = ''): string {
  if (!texto) return '';
  return `<p${clase ? ` class="${clase}"` : ''}>${escapar(texto)}</p>`;
}

function fila(etiqueta: string, valor: string): string {
  return `<div class="fila"><span>${escapar(etiqueta)}</span><span>${escapar(valor)}</span></div>`;
}

/** Los nombres de ítems, clientes y textos los escribe el usuario: no se inyectan como HTML. */
function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
