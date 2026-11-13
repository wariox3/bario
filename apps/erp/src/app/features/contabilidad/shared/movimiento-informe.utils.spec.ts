import { FormBuilder } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';
import {
  buildFiltrosDetalle,
  buildMovimientoInformeForm,
  buildMovimientoInformeParams,
  consultaDesdeUrl,
} from './movimiento-informe.utils';

/**
 * El contrato de los filtros del informe **no se puede deducir**: la whitelist
 * del backend mezcla una ruta ORM (`cuenta__codigo`) con FKs por id
 * (`contacto_id`, `comprobante_id`), y ya se erró una vez infiriéndola de otro
 * endpoint. Estos tests fijan el body exacto contra el ejemplo que dio backend,
 * para que un cambio de nombre de campo se vea acá y no en una pantalla que
 * devuelve el informe sin filtrar.
 */
describe('movimiento-informe · filtros', () => {
  const fb = new FormBuilder();

  /** Opción tal como la entregan `<lib-contacto-select>` y `<lib-api-autocomplete>`. */
  const option = (id: number, nombre: string): ErpSelectOption => ({ id, nombre });

  function formEnEnero() {
    const form = buildMovimientoInformeForm(fb);
    form.patchValue({
      fecha_desde: new Date(2026, 0, 1),
      fecha_hasta: new Date(2026, 0, 31),
    });
    return form;
  }

  it.each(['fecha_desde', 'fecha_hasta'] as const)('sin %s el formulario no es válido', (campo) => {
    const form = formEnEnero();
    expect(form.valid).toBe(true);

    // Lo que deja el datepicker con una fecha borrada o a medio teclear.
    form.controls[campo].setValue(null as unknown as Date);

    expect(form.invalid).toBe(true);
    expect(form.controls[campo].hasError('required')).toBe(true);
  });

  it('emite el body del ejemplo de backend, tal cual', () => {
    const params = buildMovimientoInformeParams(
      formEnEnero(),
      buildFiltrosDetalle({
        numero: 77,
        contacto: option(12, '900123456 - ACME SAS'),
        comprobante: option(2, 'Comprobante de egreso'),
      }),
    );

    expect(params.fecha_desde).toBe('2026-01-01');
    expect(params.fecha_hasta).toBe('2026-01-31');
    expect(params.filtros).toEqual([
      { propiedad: 'numero', operador: '=', valor: 77 },
      { propiedad: 'contacto_id', operador: '=', valor: 12, operador_logico: 'AND' },
      { propiedad: 'comprobante_id', operador: '=', valor: 2, operador_logico: 'AND' },
    ]);
  });

  it('no declara operador_logico en el primer filtro, sea cual sea', () => {
    // Solo comprobante: al quedar primero de la lista, no encadena con nada.
    const params = buildMovimientoInformeParams(
      formEnEnero(),
      buildFiltrosDetalle({ numero: null, contacto: null, comprobante: option(2, 'Egreso') }),
    );

    expect(params.filtros).toEqual([{ propiedad: 'comprobante_id', operador: '=', valor: 2 }]);
  });

  it('encadena el rango de cuentas con los filtros de detalle', () => {
    const form = formEnEnero();
    form.patchValue({ cuenta_desde: { id: 1, nombre: '1105 - Caja', codigo: '1105' } });

    const params = buildMovimientoInformeParams(
      form,
      buildFiltrosDetalle({ numero: 77, contacto: null, comprobante: null }),
    );

    expect(params.filtros).toEqual([
      { propiedad: 'cuenta__codigo', operador: '>=', valor: '1105' },
      { propiedad: 'numero', operador: '=', valor: 77, operador_logico: 'AND' },
    ]);
  });

  it('manda el centro de costo por id, encadenado', () => {
    const params = buildMovimientoInformeParams(
      formEnEnero(),
      buildFiltrosDetalle({ numero: 77, centroCosto: option(5, 'Administración') }),
    );

    expect(params.filtros).toEqual([
      { propiedad: 'numero', operador: '=', valor: 77 },
      { propiedad: 'centro_costo_id', operador: '=', valor: 5, operador_logico: 'AND' },
    ]);
  });

  it('trata el número 0 como un valor y no como vacío', () => {
    const filtros = buildFiltrosDetalle({ numero: 0 });
    expect(filtros).toEqual([{ field: 'numero', operator: 'eq', value: 0 }]);
  });

  it('sin parámetros de detalle no agrega filtros', () => {
    expect(buildFiltrosDetalle({})).toEqual([]);
  });
});

describe('consultaDesdeUrl', () => {
  const params = { cuenta: '1105', nombre: 'Caja', desde: '2026-01-01', hasta: '2026-10-31' };

  it('arma el rango de la cuenta con sus hijas y las dos fechas', () => {
    const consulta = consultaDesdeUrl(params);
    expect(consulta?.cuenta_desde).toMatchObject({ nombre: '1105 - Caja', codigo: '1105' });
    expect(consulta?.cuenta_hasta['codigo']).toBe('1105999999999999');
    expect(consulta?.fecha_desde).toEqual(new Date(2026, 0, 1));
    expect(consulta?.fecha_hasta).toEqual(new Date(2026, 9, 31));
  });

  it('deja afuera a la cuenta vecina y adentro a las hijas', () => {
    const consulta = consultaDesdeUrl(params);
    const hasta = consulta?.cuenta_hasta['codigo'] as string;
    expect('110505' <= hasta).toBe(true);
    expect('1110' <= hasta).toBe(false);
  });

  it('sin cuenta o con fechas inválidas no hay consulta', () => {
    expect(consultaDesdeUrl({})).toBeNull();
    expect(consultaDesdeUrl({ ...params, cuenta: 'abc' })).toBeNull();
    expect(consultaDesdeUrl({ ...params, hasta: 'ayer' })).toBeNull();
  });
});
