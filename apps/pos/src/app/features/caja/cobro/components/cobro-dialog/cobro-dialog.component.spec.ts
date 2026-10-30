import { type Signal, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FormGroup } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { I18nService, ToastService } from '@reddoc/core';
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
import { CuentasCobroService, type CuentaCobro } from '../../cuentas-cobro';
import type { MedioPagoPos } from '../../medios-pago';
import { CobroDialogComponent } from './cobro-dialog.component';

/** Lo protegido del diálogo que estas pruebas leen o accionan. */
interface Interno {
  readonly vista: Signal<'cobro' | 'exito' | 'pendiente'>;
  readonly encabezado: Signal<{ venta: string; cliente: string; identificacion: string } | null>;
  readonly medio: Signal<MedioPagoPos>;
  readonly error: Signal<string | null>;
  readonly estadoCuentas: Signal<'cargando' | 'listo' | 'error'>;
  readonly cuentasMedio: Signal<readonly CuentaCobro[]>;
  readonly faltante: Signal<number>;
  readonly resumenMasInfo: Signal<string>;
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
  cargarCuentas(): void;
}

/** Tipo 3 es caja (efectivo); 1 y 2, banco. */
const cuenta: CuentaCobro = { id: 9, nombre: 'Caja general', tipo: 3 };
const banco: CuentaCobro = { id: 11, nombre: 'Bancolombia', tipo: 1 };

const configuracionCompleta: ConfiguracionCaja = {
  documentoTipoId: 27,
  almacen: { id: 2, nombre: 'Principal' },
  sede: null,
  asesor: null,
};

const errores = es.caja.cobro.errores;

function preparar(
  cambios: {
    config?: Partial<ConfiguracionCaja>;
    pendiente?: CobroPendiente;
    total?: number;
    cuentas?: readonly CuentaCobro[];
    recordadas?: Partial<Record<string, number>>;
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
  const recordadas: Partial<Record<string, number>> = { ...cambios.recordadas };
  const cuentasCobro = {
    cuentas: jest.fn(() => of([...(cambios.cuentas ?? [cuenta, banco])])),
    recordada: jest.fn((medio: string) => recordadas[medio] ?? null),
    recordar: jest.fn((medio: string, id: number) => (recordadas[medio] = id)),
  };

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
      { provide: CuentasCobroService, useValue: cuentasCobro },
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
    cuentasCobro,
  };
}

const tecla = (key: string) => new KeyboardEvent('keydown', { key, cancelable: true });

describe('CobroDialogComponent', () => {
  describe('al abrir', () => {
    it('propone el total como recibido, la única cuenta de efectivo y el asesor de la caja', () => {
      const { interno } = preparar();
      expect(interno.vista()).toBe('cobro');
      expect(interno.form.getRawValue()).toEqual({
        recibido: 47_600,
        cuenta,
        asesor: null,
        referencia: '',
        soporte: '',
        comentario: '',
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

    it('sin cuentas de efectivo, la cuenta queda vacía y no cobra', () => {
      const { interno, cobro } = preparar({ cuentas: [banco] });
      expect(interno.estadoCuentas()).toBe('listo');
      expect(interno.cuentasMedio()).toEqual([]);
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
      expect(solicitud.medio.id).toBe('efectivo');
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

  describe('más información', () => {
    it('sin escribir nada, soporte y comentario van vacíos', () => {
      const { interno, cobro } = preparar();
      interno.onCobrar();
      const solicitud = cobro.cobrar.mock.calls[0][0];
      expect(solicitud.soporte).toBeNull();
      expect(solicitud.comentario).toBeNull();
    });

    it('soporte y comentario llegan a la solicitud sin espacios de sobra', () => {
      const { interno, cobro } = preparar();
      interno.form.controls['soporte'].setValue(' OC-881 ');
      interno.form.controls['comentario'].setValue(' Entregar en bodega ');
      interno.onCobrar();
      const solicitud = cobro.cobrar.mock.calls[0][0];
      expect(solicitud.soporte).toBe('OC-881');
      expect(solicitud.comentario).toBe('Entregar en bodega');
    });

    it('en transferencia la referencia se suma al comentario', () => {
      const { interno, cobro } = preparar();
      interno.onTecla(tecla('F2'));
      interno.form.controls['comentario'].setValue('Entregar en bodega');
      interno.form.controls['referencia'].setValue('M123456');
      interno.onCobrar();
      expect(cobro.cobrar.mock.calls[0][0].comentario).toBe(
        `Entregar en bodega · ${es.caja.cobro.transferencia.comentario} M123456`,
      );
    });

    it('cerrada muestra lo escrito, y al abrir otra venta los campos arrancan vacíos', () => {
      const { interno, fixture } = preparar();
      interno.form.controls['soporte'].setValue('OC-881');
      interno.form.controls['comentario'].setValue('Entregar en bodega');
      expect(interno.resumenMasInfo()).toBe('OC-881 · Entregar en bodega');
      fixture.componentInstance.visible.set(false);
      fixture.detectChanges();
      fixture.componentInstance.visible.set(true);
      fixture.detectChanges();
      expect(interno.form.controls['soporte'].value).toBe('');
      expect(interno.resumenMasInfo()).toBe('');
    });
  });

  describe('cuentas del cobro', () => {
    const caja2: CuentaCobro = { id: 10, nombre: 'Caja 2', tipo: 3 };

    it('el selector solo ofrece las cuentas del tipo del medio', () => {
      const { interno } = preparar({ cuentas: [cuenta, caja2, banco] });
      expect(interno.cuentasMedio()).toEqual([cuenta, caja2]);
      interno.onTecla(tecla('F2'));
      expect(interno.cuentasMedio()).toEqual([banco]);
    });

    it('con varias del medio no propone ninguna si la caja no ha usado una', () => {
      const { interno, cobro } = preparar({ cuentas: [cuenta, caja2, banco] });
      expect(interno.form.controls['cuenta'].value).toBeNull();
      interno.onCobrar();
      expect(cobro.cobrar).not.toHaveBeenCalled();
    });

    it('con varias propone la última que usó la caja con ese medio', () => {
      const { interno } = preparar({
        cuentas: [cuenta, caja2, banco],
        recordadas: { efectivo: 10 },
      });
      expect(interno.form.controls['cuenta'].value).toEqual(caja2);
    });

    it('una cuenta recordada que ya no existe no se propone', () => {
      const { interno } = preparar({ cuentas: [cuenta, caja2], recordadas: { efectivo: 99 } });
      expect(interno.form.controls['cuenta'].value).toBeNull();
    });

    it('al cobrar recuerda la cuenta elegida para ese medio', () => {
      const { interno, cuentasCobro } = preparar({ cuentas: [cuenta, caja2, banco] });
      interno.form.controls['cuenta'].setValue(caja2);
      interno.onCobrar();
      expect(cuentasCobro.recordar).toHaveBeenCalledWith('efectivo', 10);
    });

    it('si fallan las cuentas queda en error y se puede reintentar', () => {
      const { interno, cuentasCobro } = preparar();
      cuentasCobro.cuentas.mockReturnValueOnce(throwError(() => new Error('500')));
      interno.cargarCuentas();
      expect(interno.estadoCuentas()).toBe('error');
      interno.cargarCuentas();
      expect(interno.estadoCuentas()).toBe('listo');
      expect(interno.form.controls['cuenta'].value).toEqual(cuenta);
    });
  });

  describe('cobrar por transferencia', () => {
    it('toma la única cuenta de banco y cobra el total', () => {
      const { interno, cobro } = preparar();
      interno.onTecla(tecla('F2'));
      expect(interno.form.controls['cuenta'].value).toEqual(banco);
      // Lo recibido no aplica: ni un monto menor al total bloquea.
      interno.usarMonto(10);
      interno.onCobrar();
      const solicitud = cobro.cobrar.mock.calls[0][0];
      expect(solicitud.medio.id).toBe('transferencia');
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

    it('sin cuentas de banco la cuenta queda vacía y no cobra', () => {
      const { interno, cobro } = preparar({ cuentas: [cuenta] });
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

    it('si al tenant le falta el plazo de contado, lo dice', () => {
      const { interno, cobro } = preparar();
      cobro.cobrar.mockReturnValueOnce(
        throwError(
          () => new CobroError('preparando', null, false, new CatalogoCobroError('plazoContado')),
        ),
      );
      interno.onCobrar();
      expect(interno.error()).toBe(errores.plazoContado);
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
