import type { DestroyRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import type { ErpSelectDataService, ErpSelectOption } from '@reddoc/core';
import { Subject } from 'rxjs';
import {
  setupVencimientoAutocompute,
  type PlazoPagoOption,
  type VencimientoAutocompute,
} from './vencimiento-autocompute';

const CONTADO: PlazoPagoOption = { id: 1, nombre: 'Contado', dias: 0 };
const TREINTA: PlazoPagoOption = { id: 2, nombre: '30 días', dias: 30 };
const SIN_DIAS: PlazoPagoOption = { id: 3, nombre: 'Convenio', dias: null };
const PLAZOS = [CONTADO, TREINTA, SIN_DIAS];

const dia = (y: number, m: number, d: number) => new Date(y, m - 1, d);

interface Escenario {
  readonly fecha: FormControl<Date | null>;
  readonly plazoPago: FormControl<ErpSelectOption | null>;
  readonly fechaVence: FormControl<Date | null>;
  readonly catalogo: Subject<PlazoPagoOption[]>;
  readonly auto: VencimientoAutocompute;
}

function montar(opts: { bloquearEnContado?: boolean } = {}): Escenario {
  const fecha = new FormControl<Date | null>(null);
  const plazoPago = new FormControl<ErpSelectOption | null>(null);
  const fechaVence = new FormControl<Date | null>(null);
  const catalogo = new Subject<PlazoPagoOption[]>();
  const selectData = { fetchOptions: () => catalogo.asObservable() };
  const destroyRef = { onDestroy: () => () => undefined } as unknown as DestroyRef;

  const auto = setupVencimientoAutocompute({
    fecha,
    plazoPago,
    fechaVence,
    selectData: selectData as unknown as ErpSelectDataService,
    destroyRef,
    bloquearEnContado: opts.bloquearEnContado,
  });
  return { fecha, plazoPago, fechaVence, catalogo, auto };
}

describe('setupVencimientoAutocompute', () => {
  describe('alta', () => {
    it('fecha + plazo de 30 días da el vencimiento, sin desvío', () => {
      const e = montar();
      e.catalogo.next(PLAZOS);

      e.fecha.setValue(dia(2026, 10, 1));
      e.plazoPago.setValue(TREINTA);

      expect(e.fechaVence.value).toEqual(dia(2026, 10, 31));
      expect(e.auto.diasPlazo()).toBe(30);
      expect(e.auto.desvio()).toBe(0);
    });

    it('cuenta días de calendario: 31 de enero + 30 cae en marzo', () => {
      const e = montar();
      e.catalogo.next(PLAZOS);

      e.plazoPago.setValue(TREINTA);
      e.fecha.setValue(dia(2026, 1, 31));

      expect(e.fechaVence.value).toEqual(dia(2026, 3, 2));
    });

    it('mover la fecha recalcula el vencimiento', () => {
      const e = montar();
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1));
      e.plazoPago.setValue(TREINTA);

      e.fecha.setValue(dia(2026, 10, 10));

      expect(e.fechaVence.value).toEqual(dia(2026, 11, 9));
    });

    it('si el plazo se eligió antes de que llegaran los días, el catálogo rellena el campo vacío', () => {
      const e = montar();
      e.fecha.setValue(dia(2026, 10, 1));
      e.plazoPago.setValue(TREINTA);
      expect(e.fechaVence.value).toBeNull();

      e.catalogo.next(PLAZOS);

      expect(e.fechaVence.value).toEqual(dia(2026, 10, 31));
    });
  });

  describe('edición manual', () => {
    it('se conserva y el desvío cuenta los días de diferencia con el plazo', () => {
      const e = montar();
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1));
      e.plazoPago.setValue(TREINTA);

      e.fechaVence.setValue(dia(2026, 11, 5));

      expect(e.fechaVence.value).toEqual(dia(2026, 11, 5));
      expect(e.auto.desvio()).toBe(5);
    });

    it('restablecer vuelve al vencimiento del plazo y marca el campo como modificado', () => {
      const e = montar();
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1));
      e.plazoPago.setValue(TREINTA);
      e.fechaVence.setValue(dia(2026, 10, 20));

      e.auto.restablecer();

      expect(e.fechaVence.value).toEqual(dia(2026, 10, 31));
      expect(e.fechaVence.dirty).toBe(true);
      expect(e.auto.desvio()).toBe(0);
    });
  });

  describe('documento en edición', () => {
    it('el catálogo que llega tarde no pisa el vencimiento guardado; solo calcula el desvío', () => {
      const e = montar();
      // El resolver puebla la cabecera en silencio, antes de que lleguen los plazos.
      e.fecha.setValue(dia(2026, 10, 1), { emitEvent: false });
      e.plazoPago.setValue(TREINTA, { emitEvent: false });
      e.fechaVence.setValue(dia(2026, 11, 15), { emitEvent: false });

      e.catalogo.next(PLAZOS);

      expect(e.fechaVence.value).toEqual(dia(2026, 11, 15));
      expect(e.auto.sugerido()).toEqual(dia(2026, 10, 31));
      expect(e.auto.desvio()).toBe(15);
    });

    it('sincronizar tras poblar la cabecera calcula el sugerido sin pisar lo guardado', () => {
      const e = montar();
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1), { emitEvent: false });
      e.plazoPago.setValue(TREINTA, { emitEvent: false });
      e.fechaVence.setValue(dia(2026, 10, 25), { emitEvent: false });

      e.auto.sincronizar();

      expect(e.fechaVence.value).toEqual(dia(2026, 10, 25));
      expect(e.auto.desvio()).toBe(-6);
    });
  });

  describe('contado', () => {
    it('en compra el vencimiento es la fecha pero el campo sigue editable', () => {
      const e = montar();
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1));

      e.plazoPago.setValue(CONTADO);

      expect(e.fechaVence.value).toEqual(dia(2026, 10, 1));
      expect(e.fechaVence.enabled).toBe(true);
      expect(e.auto.bloqueado()).toBe(false);
    });

    it('en venta bloquea el campo en la fecha y lo libera al pasar a un plazo con días', () => {
      const e = montar({ bloquearEnContado: true });
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1));

      e.plazoPago.setValue(CONTADO);
      expect(e.fechaVence.disabled).toBe(true);
      expect(e.auto.bloqueado()).toBe(true);
      expect(e.fechaVence.value).toEqual(dia(2026, 10, 1));

      e.plazoPago.setValue(TREINTA);
      expect(e.fechaVence.enabled).toBe(true);
      expect(e.auto.bloqueado()).toBe(false);
      expect(e.fechaVence.value).toEqual(dia(2026, 10, 31));
    });

    it('bloqueado, sigue a la fecha aunque se mueva', () => {
      const e = montar({ bloquearEnContado: true });
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1));
      e.plazoPago.setValue(CONTADO);

      e.fecha.setValue(dia(2026, 10, 7));

      expect(e.fechaVence.value).toEqual(dia(2026, 10, 7));
    });

    it('en venta, un documento viejo de contado con otro vencimiento se corrige al abrirlo', () => {
      const e = montar({ bloquearEnContado: true });
      e.fecha.setValue(dia(2026, 10, 1), { emitEvent: false });
      e.plazoPago.setValue(CONTADO, { emitEvent: false });
      e.fechaVence.setValue(dia(2026, 10, 30), { emitEvent: false });

      e.catalogo.next(PLAZOS);

      expect(e.fechaVence.value).toEqual(dia(2026, 10, 1));
      expect(e.fechaVence.disabled).toBe(true);
    });

    it('no rehabilita un campo que deshabilitó otro', () => {
      const e = montar({ bloquearEnContado: true });
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1));
      e.fechaVence.disable();

      e.plazoPago.setValue(TREINTA);

      expect(e.fechaVence.disabled).toBe(true);
    });
  });

  describe('sin días conocidos', () => {
    it('un plazo sin `dias` deja el vencimiento manual y sin desvío', () => {
      const e = montar();
      e.catalogo.next(PLAZOS);
      e.fecha.setValue(dia(2026, 10, 1));
      e.fechaVence.setValue(dia(2026, 12, 1));

      e.plazoPago.setValue(SIN_DIAS);

      expect(e.fechaVence.value).toEqual(dia(2026, 12, 1));
      expect(e.auto.diasPlazo()).toBeNull();
      expect(e.auto.desvio()).toBeNull();
    });

    it('si el catálogo falla, el vencimiento queda manual', () => {
      const e = montar();
      e.catalogo.error(new Error('500'));
      e.fecha.setValue(dia(2026, 10, 1));
      e.plazoPago.setValue(TREINTA);

      expect(e.fechaVence.value).toBeNull();
      expect(e.auto.sugerido()).toBeNull();
    });

    it('restablecer sin sugerido no toca el campo', () => {
      const e = montar();
      e.fechaVence.setValue(dia(2026, 12, 1));

      e.auto.restablecer();

      expect(e.fechaVence.value).toEqual(dia(2026, 12, 1));
    });
  });

  describe('vencimiento anterior a la fecha', () => {
    it('es un error del campo', () => {
      const e = montar();
      e.fecha.setValue(dia(2026, 10, 10));

      e.fechaVence.setValue(dia(2026, 10, 9));

      expect(e.fechaVence.hasError('vencimientoAnterior')).toBe(true);
    });

    it('el mismo día es válido', () => {
      const e = montar();
      e.fecha.setValue(dia(2026, 10, 10));

      e.fechaVence.setValue(dia(2026, 10, 10));

      expect(e.fechaVence.valid).toBe(true);
    });

    it('mover la fecha después del vencimiento lo invalida sin tocar el campo', () => {
      const e = montar();
      e.fecha.setValue(dia(2026, 10, 1));
      e.fechaVence.setValue(dia(2026, 10, 15));
      expect(e.fechaVence.valid).toBe(true);

      e.fecha.setValue(dia(2026, 10, 20));

      expect(e.fechaVence.value).toEqual(dia(2026, 10, 15));
      expect(e.fechaVence.hasError('vencimientoAnterior')).toBe(true);
    });
  });
});
