import type { AccesosContenedorDict } from './accesos-contenedor.dict';

export const accesosContenedorEs: AccesosContenedorDict = {
  label: 'Accesos',
  todos: 'Marcar todos',
  ninguno: 'Quitar todos',
  hint: 'Opcional. Solo aparecen los módulos que esta empresa tiene contratados.',
  flags: {
    venta: 'Venta',
    compra: 'Compra',
    tesoreria: 'Tesorería',
    cartera: 'Cartera',
    inventario: 'Inventario',
    humano: 'Humano',
    contabilidad: 'Contabilidad',
    turno: 'Turnos',
  },
};
