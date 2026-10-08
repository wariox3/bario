import type { AccesosContenedorDict } from './accesos-contenedor.dict';

export const accesosContenedorEn: AccesosContenedorDict = {
  label: 'Access',
  todos: 'Select all',
  ninguno: 'Clear all',
  hint: 'Optional. Only the modules this company subscribed to are listed.',
  flags: {
    venta: 'Sales',
    compra: 'Purchases',
    tesoreria: 'Treasury',
    cartera: 'Receivables',
    inventario: 'Inventory',
    humano: 'HR',
    contabilidad: 'Accounting',
    turno: 'Shifts',
  },
};
