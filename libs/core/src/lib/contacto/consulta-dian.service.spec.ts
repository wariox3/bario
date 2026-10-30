import { datosDeConsultaDian, type ConsultaDianResponse } from './consulta-dian.service';

const respuesta: ConsultaDianResponse = {
  existe: true,
  nombre: 'ALMACENES EXITO S A',
  correo: 'njudiciales@grupo-exito.com',
  codigo: '200',
  mensaje: '',
};

describe('datosDeConsultaDian', () => {
  it('persona jurídica: el nombre es la razón social', () => {
    expect(datosDeConsultaDian(respuesta, false)).toEqual({
      nombre_corto: 'ALMACENES EXITO S A',
      correo: 'njudiciales@grupo-exito.com',
    });
  });

  it('persona natural: el nombre entero va a nombre1', () => {
    expect(datosDeConsultaDian(respuesta, true)).toEqual({
      nombre1: 'ALMACENES EXITO S A',
      correo: 'njudiciales@grupo-exito.com',
    });
  });

  it('lo que llega vacío no se trae, para no borrar lo ya escrito', () => {
    expect(datosDeConsultaDian({ ...respuesta, nombre: ' ', correo: '' }, true)).toEqual({});
  });
});
