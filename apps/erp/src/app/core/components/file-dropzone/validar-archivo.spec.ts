import { validarArchivo } from './validar-archivo';

const MB = 1024 * 1024;

describe('validarArchivo', () => {
  it('acepta una extensión de la lista sin importar mayúsculas', () => {
    expect(validarArchivo({ name: 'CERT.PFX', size: MB }, '.p12,.pfx', 5)).toBeNull();
  });

  it('rechaza por tipo una extensión fuera de la lista', () => {
    expect(validarArchivo({ name: 'cert.pem', size: MB }, '.p12,.pfx', 5)).toBe('tipo');
  });

  it('no confunde un nombre que solo contiene la extensión', () => {
    expect(validarArchivo({ name: 'pfx.txt', size: MB }, '.pfx', 5)).toBe('tipo');
  });

  it('con accept vacío acepta cualquier extensión', () => {
    expect(validarArchivo({ name: 'lo-que-sea.bin', size: MB }, '', 5)).toBeNull();
  });

  it('rechaza por tamaño lo que pasa del máximo', () => {
    expect(validarArchivo({ name: 'a.xlsx', size: 5 * MB + 1 }, '.xlsx', 5)).toBe('tamano');
  });

  it('acepta justo el máximo', () => {
    expect(validarArchivo({ name: 'a.xlsx', size: 5 * MB }, '.xlsx', 5)).toBeNull();
  });

  it('el tipo se revisa antes que el tamaño', () => {
    expect(validarArchivo({ name: 'a.pdf', size: 50 * MB }, '.xlsx', 5)).toBe('tipo');
  });
});
