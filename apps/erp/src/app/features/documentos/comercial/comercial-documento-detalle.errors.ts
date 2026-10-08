/**
 * Se pidió guardar líneas mientras la misma tabla ya guarda otras. Un segundo lote
 * reenviaría líneas que siguen sin `id` y el documento quedaría con líneas duplicadas.
 */
export class LineasEnCursoError extends Error {
  constructor() {
    super('Ya hay un guardado de líneas en curso');
    this.name = 'LineasEnCursoError';
  }
}
