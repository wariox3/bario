import { type Signal, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FormGroup } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import { es } from '../../../../../i18n/app.es';
import { VentaPosService } from '../../../../../core/documento/venta-pos.service';
import type { ConfiguracionCaja } from '../../../../configuracion/configuracion-caja.model';
import { ConfiguracionCajaStore } from '../../../../configuracion/configuracion-caja.store';
import type { Carrito, CobroPendiente } from '../../../carrito/carrito.model';
import { CarritosStore } from '../../../carrito/carritos.store';
import {
  CatalogoCobroError,
  CobroError,
  type EventoCobro,
  type SolicitudCobro,
} from '../../cobro.model';
import { CobroService } from '../../cobro.service';
import type { MedioPagoPos } from '../../medios-pago';
import { CobroDialogComponent } from './cobro-dialog.component';

/** Lo protegido del diálogo que estas pruebas leen o accionan. */
interface Interno {
  readonly vista: Signal<'cobro' | 'exito' | 'pendiente'>;
  readonly encabezado: Signal<{ venta: string; cliente: string; identificacion: string } | null>;
  readonly medio: Signal<MedioPagoPos>;
  readonly error: Signal<string | null>;
  readonly faltante: Signal<number>;
  readonly ventaCobrada: Signal<{
    documentoId: number;
    medio: string;
    total: number;
    recibido: number;
    cambio: number;
  } | null>;
  readonly form: FormGroup;
  onCobrar(): void;
  onReintentar(): void;
  onDescartar(): void;
  onTecla(event: KeyboardEvent): void;
  onEscape(): void;
  usarMonto(monto: number): void;
}

const cuenta: ErpSelectOption = { id: 9, nombre: 'Caja general' };

const configuracionCompleta: ConfiguracionCaja = {
  documentoTipoId: 27,
  almacen: { id: 2, nombre: 'Principal' },
  cuentaEfectivo: cuenta,
  cuentaTransferencia: { id: 11, nombre: 'Bancolombia' },
  sede: null,
  asesor: null,
};

const errores = es.caja.cobro.errores;

function preparar(
  cambios: {
    config?: Partial<ConfiguracionCaja>;
    pendiente?: CobroPendiente;
    total?: number;
  } = {},
) {
  const activo = signal<Carrito>({
    uuid: 'u1',
    nombre: 'Venta 2',
    contacto: { id: 1, nombre: '222222222222 - Consumidor final' },
    lineas: [],
  });
  const total = signal(cambios.total ?? 47_600);
  const pendiente = signal<CobroPendiente | null>(cambios.pendiente ?? null);
  const carritos = {
    activo,
    resumen: computed(() => ({ total: total() })),
    cobroPendiente: pendiente.asReadonly(),
    cerrarCobrada: jest.fn(),
    registrarCobro: jest.fn((_uuid: string, cobro: CobroPendiente) => pendiente.set(cobro)),
    limpiarCobro: jest.fn(() => pendiente.set(null)),
  };
  const cobro = {
    cobrar: jest.fn((solicitud: SolicitudCobro) => {
      void solicitud;
      return of<EventoCobro>(
        { tipo: 'fase', fase: 'guardando' },
        { tipo: 'listo', documentoId: 55 },
      );
    }),
  };
  const ventas = {
    eliminar: jest.fn(() => of(undefined)),
    imprimir: jest.fn(() => of(undefined)),
  };
  const confirmacion = { confirm: jest.fn((c: Confirmation) => c.accept?.()) };

  TestBed.configureTestingModule({
    providers: [
      { provide: I18nService, useValue: { t: signal(es) } },
      { provide: ToastService, useValue: { error: jest.fn(), warn: jest.fn() } },
      { provide: ConfirmationService, useValue: confirmacion },
      { provide: CarritosStore, useValue: carritos },
      {
        provide: ConfiguracionCajaStore,
        useValue: { configuracion: signal({ ...configuracionCompleta, ...cambios.config }) },
      },
      { provide: CobroService, useValue: cobro },
      { provide: VentaPosService, useValue: ventas },
    ],
  });
  // La plantilla (PrimeNG, selects con HTTP) no es lo que se prueba: la lógica sí.
  TestBed.overrideComponent(CobroDialogComponent, { set: { template: '', imports: [] } });

  const fixture = TestBed.createComponent(CobroDialogComponent);
  const dialogo = fixture.componentInstance;
  const cobradas = jest.fn();
  dialogo.cobrada.subscribe(cobradas);
  dialogo.visible.set(true);
  fixture.detectChanges();

  return {
    fixture,
    dialogo,
    interno: dialogo as unknown as Interno,
    carritos,
    cobro,
    ventas,
    cobradas,
  };
}

const tecla = (key: string) => new KeyboardEvent('keydown', { key, cancelable: true });

describe('CobroDialogComponent', () => {
  describe('al abrir', () => {
    it('propone el total como recibido y la cuenta y el asesor de la caja', () => {
      const { interno } = preparar();
      expect(interno.vista()).toBe('cobro');
      expect(interno.form.getRawValue()).toEqual({
        recibido: 47_600,
        cuenta,
        asesor: null,
        referencia: '',
      });
      expect(interno.medio().id).toBe('efectivo');
    });

    it('la cabecera separa venta, cliente e identificación', () => {
      const { interno } = preparar();
      expect(interno.encabezado()).toEqual({
        venta: 'Venta 2',
        cliente: 'Consumidor final',
        identificacion: '222222222222',
      });
    });

    it('sin cuenta de efectivo configurada, la cuenta queda vacía y no cobra', () => {
      const { interno, cobro } = preparar({ config: { cuentaEfectivo: null } });
      expect(interno.form.controls['cuenta'].value).toBeNull();
      interno.onCobrar();
      expect(cobro.cobrar).not.toHaveBeenCalled();
    });

    it('con un cobro pendiente abre directo en pendiente', () => {
      const { interno } = preparar({ pendiente: { documentoId: 55, pagado: false } });
      expect(interno.vista()).toBe('pendiente');
    });
  });

  describe('medios de pago', () => {
    it('F1–F4 eligen el medio', () => {
      const { interno } = preparar();
      const evento = tecla('F2');
      interno.onTecla(evento);
      expect(interno.medio().id).toBe('transferencia');
      expect(evento.defaultPrevented).toBe(true);
      interno.onTecla(tecla('F1'));
      expect(interno.medio().id).toBe('efectivo');
    });

    it('un medio deshabilitado no se puede elegir, ni con su atajo', () => {
      const { interno } = preparar();
      const evento = tecla('F3');
      interno.onTecla(evento);
      expect(interno.medio().id).toBe('efectivo');
      // El atajo no se le deja al navegador (F3 es "buscar en la página").
      expect(evento.defaultPrevented).toBe(true);
      interno.onTecla(tecla('F4'));
      expect(interno.medio().id).toBe('efectivo');
    });

    it('fuera de la pantalla de cobro las teclas F no hacen nada', () => {
      const { interno } = preparar({ pendiente: { documentoId: 55, pagado: false } });
      interno.onTecla(tecla('F3'));
      expect(interno.medio().id).toBe('efectivo');
    });
  });

  describe('cobrar en efectivo', () => {
    it('lo recibido menor al total no cobra y dice cuánto falta', () => {
      const { interno, cobro } = preparar();
      interno.usarMonto(40_000);
      interno.onCobrar();
      expect(cobro.cobrar).not.toHaveBeenCalled();
      expect(interno.form.controls['recibido'].hasError('insuficiente')).toBe(true);
      expect(interno.faltante()).toBe(7_600);
    });

    it('registra el total como pago: el cambio se devuelve, no entra a la cuenta', () => {
      const { interno, cobro } = preparar();
      interno.usarMonto(50_000);
      interno.onCobrar();
      const solicitud = cobro.cobrar.mock.calls[0][0];
      expect(solicitud.pagos).toEqual([{ cuentaBanco: cuenta, monto: 47_600 }]);
      expect(solicitud.documentoTipoId).toBe(27);
      expect(solicitud.medio.codigoDian).toBe('10');
    });

    it('al terminar muestra el éxito con recibido y cambio, y cierra la venta', () => {
      const { interno, carritos, cobradas } = preparar();
      interno.usarMonto(50_000);
      interno.onCobrar();
      expect(interno.vista()).toBe('exito');
      expect(interno.ventaCobrada()).toEqual({
        documentoId: 55,
        medio: 'efectivo',
        total: 47_600,
        recibido: 50_000,
        cambio: 2_400,
      });
      expect(carritos.cerrarCobrada).toHaveBeenCalledWith('u1');
      expect(cobradas).toHaveBeenCalledTimes(1);
    });

    it('sin la configuración de la caja no intenta cobrar', () => {
      const { interno, cobro } = preparar({ config: { almacen: null } });
      interno.onCobrar();
      expect(cobro.cobrar).not.toHaveBeenCalled();
      expect(interno.error()).toBe(errores.configuracion);
    });
  });

  describe('cobrar por transferencia', () => {
    const banco = { id: 11, nombre: 'Bancolombia' };

    it('toma la cuenta de transferencia de la caja y cobra el total', () => {
      const { interno, cobro } = preparar();
      interno.onTecla(tecla('F2'));
      expect(interno.form.controls['cuenta'].value).toEqual(banco);
      // Lo recibido no aplica: ni un monto menor al total bloquea.
      interno.usarMonto(10);
      interno.onCobrar();
      const solicitud = cobro.cobrar.mock.calls[0][0];
      expect(solicitud.medio.codigoDian).toBe('47');
      expect(solicitud.pagos).toEqual([{ cuentaBanco: banco, monto: 47_600 }]);
      expect(solicitud.comentario).toBeNull();
    });

    it('la referencia del comprobante va al comentario del documento', () => {
      const { interno, cobro } = preparar();
      interno.onTecla(tecla('F2'));
      interno.form.controls['referencia'].setValue(' M123456 ');
      interno.onCobrar();
      expect(cobro.cobrar.mock.calls[0][0].comentario).toBe(
        `${es.caja.cobro.transferencia.comentario} M123456`,
      );
    });

    it('el éxito no habla de cambio: se pagó el total', () => {
      const { interno } = preparar();
      interno.onTecla(tecla('F2'));
      interno.onCobrar();
      expect(interno.ventaCobrada()).toEqual({
        documentoId: 55,
        medio: 'transferencia',
        total: 47_600,
        recibido: 47_600,
        cambio: 0,
      });
    });

    it('sin cuenta de transferencia configurada la cuenta queda vacía y no cobra', () => {
      const { interno, cobro } = preparar({ config: { cuentaTransferencia: null } });
      interno.onTecla(tecla('F2'));
      expect(interno.form.controls['cuenta'].value).toBeNull();
      interno.onCobrar();
      expect(cobro.cobrar).not.toHaveBeenCalled();
    });

    it('volver a efectivo recupera la cuenta de efectivo', () => {
      const { interno } = preparar();
      interno.onTecla(tecla('F2'));
      interno.onTecla(tecla('F1'));
      expect(interno.form.controls['cuenta'].value).toEqual(cuenta);
    });
  });

  describe('si el cobro falla', () => {
    it('con el documento ya creado, marca la venta pendiente para no duplicarlo', () => {
      const { interno, carritos, cobro } = preparar();
      cobro.cobrar.mockReturnValueOnce(
        throwError(() => new CobroError('aprobando', 55, true, new Error('500'))),
      );
      interno.onCobrar();
      expect(carritos.registrarCobro).toHaveBeenCalledWith('u1', {
        documentoId: 55,
        pagado: true,
      });
      expect(interno.vista()).toBe('pendiente');
      expect(interno.error()).toBeTruthy();
    });

    it('antes de crear el documento, sigue en la pantalla de cobro con el error', () => {
      const { interno, carritos, cobro } = preparar();
      cobro.cobrar.mockReturnValueOnce(
        throwError(() => new CobroError('guardando', null, false, new Error('500'))),
      );
      interno.onCobrar();
      expect(carritos.registrarCobro).not.toHaveBeenCalled();
      expect(interno.vista()).toBe('cobro');
      expect(interno.error()).toBeTruthy();
    });

    it('si al tenant le falta el método de pago, lo dice', () => {
      const { interno, cobro } = preparar();
      cobro.cobrar.mockReturnValueOnce(
        throwError(
          () => new CobroError('preparando', null, false, new CatalogoCobroError('metodoPago')),
        ),
      );
      interno.onCobrar();
      expect(interno.error()).toBe(errores.metodoPago);
    });

    it('termina aunque el diálogo se destruya a mitad del cobro', () => {
      const { fixture, interno, carritos, cobro, cobradas } = preparar();
      const enCurso = new Subject<EventoCobro>();
      cobro.cobrar.mockReturnValueOnce(enCurso);
      interno.onCobrar();
      fixture.destroy();
      enCurso.error(new CobroError('pagando', 55, false, new Error('timeout')));
      expect(carritos.registrarCobro).toHaveBeenCalledWith('u1', {
        documentoId: 55,
        pagado: false,
      });
      expect(cobradas).not.toHaveBeenCalled();
    });
  });

  describe('venta en $0', () => {
    it('no crea el documento: el backend no aceptaría un pago de $0', () => {
      const { interno, cobro } = preparar({ total: 0 });
      interno.onCobrar();
      expect(cobro.cobrar).not.toHaveBeenCalled();
      expect(interno.error()).toBe(errores.sinValor);
    });

    it('con el documento ya creado, reintentar no hace nada y descartar sí', () => {
      const { interno, cobro, ventas, carritos } = preparar({
        total: 0,
        pendiente: { documentoId: 1, pagado: false },
      });
      interno.onReintentar();
      expect(cobro.cobrar).not.toHaveBeenCalled();
      interno.onDescartar();
      expect(ventas.eliminar).toHaveBeenCalledWith(1);
      expect(carritos.limpiarCobro).toHaveBeenCalledWith('u1');
    });
  });

  describe('cobro pendiente', () => {
    it('reintentar retoma el cobro', () => {
      const { interno, cobro } = preparar({ pendiente: { documentoId: 55, pagado: true } });
      interno.onReintentar();
      expect(cobro.cobrar).toHaveBeenCalledTimes(1);
      expect(interno.vista()).toBe('exito');
    });

    it('descartar borra el documento y la venta vuelve a cobrarse', () => {
      const { interno, ventas, carritos } = preparar({
        pendiente: { documentoId: 55, pagado: false },
      });
      interno.onDescartar();
      expect(ventas.eliminar).toHaveBeenCalledWith(55);
      expect(carritos.limpiarCobro).toHaveBeenCalledWith('u1');
      expect(interno.vista()).toBe('cobro');
    });

    it('si no se puede borrar, la venta sigue pendiente con el error', () => {
      const { interno, ventas, carritos } = preparar({
        pendiente: { documentoId: 55, pagado: false },
      });
      ventas.eliminar.mockReturnValueOnce(throwError(() => new Error('409')));
      interno.onDescartar();
      expect(carritos.limpiarCobro).not.toHaveBeenCalled();
      expect(interno.vista()).toBe('pendiente');
      expect(interno.error()).toBeTruthy();
    });
  });

  describe('cerrar', () => {
    it('Escape cierra el diálogo', () => {
      const { dialogo, interno } = preparar();
      interno.onEscape();
      expect(dialogo.visible()).toBe(false);
    });

    it('no se cierra mientras el cobro está en curso', () => {
      const { dialogo, interno, cobro } = preparar();
      const enCurso = new Subject<EventoCobro>();
      cobro.cobrar.mockReturnValueOnce(enCurso);
      interno.onCobrar();
      enCurso.next({ tipo: 'fase', fase: 'pagando' });
      interno.onEscape();
      expect(dialogo.visible()).toBe(true);
    });
  });
});
