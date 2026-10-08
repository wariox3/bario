import { empresaCompleta } from './asistente-estado';

const COMPLETA = {
  gen_empresa_razon_social: 'Termu SAS',
  gen_empresa_nombre_corto: 'Termu',
  gen_empresa_tipo_persona: 1,
  gen_empresa_identificacion: 6,
  gen_empresa_numero_identificacion: '900000000',
  gen_empresa_direccion: 'Calle 1',
  gen_empresa_ciudad: 5001,
  gen_empresa_correo: 'a@b.co',
};

describe('empresaCompleta', () => {
  it('con todos los obligatorios está completa, aunque falte el teléfono', () => {
    expect(empresaCompleta({ ...COMPLETA, gen_empresa_telefono: null })).toBe(true);
  });

  it('un obligatorio vacío o en blanco la deja incompleta', () => {
    expect(empresaCompleta({ ...COMPLETA, gen_empresa_direccion: '  ' })).toBe(false);
    expect(empresaCompleta({ ...COMPLETA, gen_empresa_ciudad: null })).toBe(false);
  });

  it('un obligatorio que no vino la deja incompleta', () => {
    const sinCorreo: Partial<typeof COMPLETA> = { ...COMPLETA };
    delete sinCorreo.gen_empresa_correo;
    expect(empresaCompleta(sinCorreo)).toBe(false);
  });
});
