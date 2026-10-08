import { formatCiudad } from './ciudad.utils';

describe('formatCiudad', () => {
  it('une la ciudad con su departamento', () => {
    expect(formatCiudad('Albania', 'La Guajira')).toBe('Albania — La Guajira');
  });

  // Sin esta regla quedaría un separador colgando en los catálogos que todavía
  // no traen el departamento.
  it('devuelve solo la ciudad si no hay departamento', () => {
    expect(formatCiudad('Cali', null)).toBe('Cali');
    expect(formatCiudad('Cali', '  ')).toBe('Cali');
    expect(formatCiudad('Cali')).toBe('Cali');
  });

  it('resuelve el vacío como cadena vacía', () => {
    expect(formatCiudad(null, 'Antioquia')).toBe('');
    expect(formatCiudad('', 'Antioquia')).toBe('');
  });
});
