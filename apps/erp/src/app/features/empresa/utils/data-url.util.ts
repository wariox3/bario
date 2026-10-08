/** El data-URL no tenía la forma `data:<mime>;base64,<datos>`. */
export class DataUrlInvalidoError extends Error {
  constructor() {
    super('El data-URL no tiene la forma "data:<mime>;base64,<datos>".');
    this.name = 'DataUrlInvalidoError';
  }
}

/**
 * Data-URL base64 → `File`, para los endpoints que reciben multipart.
 *
 * El recortador de imágenes emite un data-URL y `cargar-logotipo/` espera un
 * archivo; esta es la costura entre los dos. El MIME sale del propio data-URL,
 * no de un parámetro: si el recorte cambia de PNG a JPEG, el archivo lo sigue
 * sin que nadie lo actualice acá.
 */
export function dataUrlToFile(dataUrl: string, nombreBase: string): File {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new DataUrlInvalidoError();

  const [, mime, base64] = match;
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);

  const extension = mime.split('/')[1] ?? 'bin';
  return new File([bytes], `${nombreBase}.${extension}`, { type: mime });
}
