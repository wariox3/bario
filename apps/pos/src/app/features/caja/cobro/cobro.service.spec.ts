import { TestBed } from '@angular/core/testing';
import { lastValueFrom, of, throwError, toArray } from 'rxjs';
import { DOCUMENT_TYPE_ID, DocumentoPagoService, type PagoRead } from '@reddoc/core';
import type { Carrito } from '../carrito/carrito.model';
import { CatalogosCobroService } from './catalogos-cobro.service';
import { CobroError, type EventoCobro, type SolicitudCobro } from './cobro.model';
import { CobroService } from './cobro.service';
import { MEDIOS_PAGO_POS } from './medios-pago';
import { VentaPosService } from '../../../core/documento/venta-pos.service';

const venta: Carrito = {
  uuid: 'u1',
  nombre: 'Venta 1',
  contacto: { id: 3, nombre: 'CF' },
  lineas: [],
};

const solicitud = (cambios: Partial<Carrito> = {}): SolicitudCobro => ({
  venta: { ...venta, ...cambios },
  documentoTipoId: DOCUMENT_TYPE_ID.FACTURA_POS,
  medio: MEDIOS_PAGO_POS[0],
  pagos: [{ cuentaBanco: { id: 9, nombre: 'Caja' }, monto: 1000 }],
  almacen: { id: 2, nombre: 'Principal' },
  sede: null,
  asesor: null,
  comentario: null,
});

function preparar() {
  const ventas = {
    crear: jest.fn().mockReturnValue(of(55)),
    aprobar: jest.fn().mockReturnValue(of(undefined)),
    estaAprobado: jest.fn().mockReturnValue(of(false)),
  };
  const pagos = {
    crear: jest.fn().mockReturnValue(of({})),
    listarPorDocumento: jest.fn().mockReturnValue(of<PagoRead[]>([])),
  };
  const catalogos = {
    metodoPago: jest.fn().mockReturnValue(of({ id: 21, nombre: 'Efectivo' })),
    plazoContado: jest.fn().mockReturnValue(of({ id: 1, nombre: 'Contado' })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: VentaPosService, useValue: ventas },
      { provide: DocumentoPagoService, useValue: pagos },
      { provide: CatalogosCobroService, useValue: catalogos },
    ],
  });
  return { servicio: TestBed.inject(CobroService), ventas, pagos, catalogos };
}

const eventos = (obs: ReturnType<CobroService['cobrar']>) => lastValueFrom(obs.pipe(toArray()));

describe('CobroService', () => {
  it('crea, paga y aprueba en orden, y termina con el documento', async () => {
    const { servicio, ventas, pagos } = preparar();
    const resultado = await eventos(servicio.cobrar(solicitud()));
    expect(resultado).toEqual<EventoCobro[]>([
      { tipo: 'fase', fase: 'guardando' },
      { tipo: 'fase', fase: 'pagando' },
      { tipo: 'fase', fase: 'aprobando' },
      { tipo: 'listo', documentoId: 55 },
    ]);
    expect(pagos.crear).toHaveBeenCalledWith({ documento: 55, cuenta_banco: 9, pago: '1000.00' });
    expect(ventas.aprobar).toHaveBeenCalledWith(55);
  });

  it('si falla al aprobar, el error lleva el documento y que ya está pagado', async () => {
    const { servicio, ventas } = preparar();
    ventas.aprobar.mockReturnValue(throwError(() => new Error('400')));
    await expect(eventos(servicio.cobrar(solicitud()))).rejects.toMatchObject({
      fase: 'aprobando',
      documentoId: 55,
      pagado: true,
    });
  });

  it('si falla al crear, no hay documento que retomar', async () => {
    const { servicio, ventas } = preparar();
    ventas.crear.mockReturnValue(throwError(() => new Error('500')));
    const error = await eventos(servicio.cobrar(solicitud())).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CobroError);
    expect(error).toMatchObject({ fase: 'guardando', documentoId: null });
  });

  it('al retomar no crea otro documento ni repite un pago que ya quedó', async () => {
    const { servicio, ventas, pagos } = preparar();
    pagos.listarPorDocumento.mockReturnValue(of([{ id: 1, estado_anulado: false }]));
    const resultado = await eventos(
      servicio.cobrar(solicitud({ cobro: { documentoId: 77, pagado: false } })),
    );
    expect(ventas.crear).not.toHaveBeenCalled();
    expect(pagos.crear).not.toHaveBeenCalled();
    expect(ventas.aprobar).toHaveBeenCalledWith(77);
    expect(resultado.at(-1)).toEqual({ tipo: 'listo', documentoId: 77 });
  });

  it('al retomar no aprueba un documento que ya quedó aprobado', async () => {
    const { servicio, ventas } = preparar();
    ventas.estaAprobado.mockReturnValue(of(true));
    await eventos(servicio.cobrar(solicitud({ cobro: { documentoId: 77, pagado: true } })));
    expect(ventas.aprobar).not.toHaveBeenCalled();
  });
});
