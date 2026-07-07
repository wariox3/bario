import type {
  Contacto,
  ContactoPayload,
} from '@erp/features/general/masters/contacto/contacto.model';

/**
 * Empleado: NO es una entidad propia. En el backend es un **contacto con el flag
 * `empleado=true`** sobre el mismo recurso `/general/contacto/`. Por eso el master
 * de Humano reutiliza `ContactoService`, el modelo y los utils del master de
 * contacto (no se crea un servicio ni un endpoint nuevo); solo cambia la
 * presentación: lista filtrada a empleados y un formulario orientado a nómina.
 *
 * Estos alias dan nombre de dominio dentro del módulo Humano sin duplicar el shape.
 */
export type Empleado = Contacto;
export type EmpleadoPayload = ContactoPayload;
