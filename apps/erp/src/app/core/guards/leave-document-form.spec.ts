import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { firstValueFrom, isObservable } from 'rxjs';
import type { Confirmation, ConfirmationService } from 'primeng/api';
import { canLeaveDocumentForm, isHeaderDirty } from './leave-document-form';

/** Form típico de documento: cabecera + `FormArray` de líneas. */
function documentoForm(): FormGroup {
  return new FormGroup({
    contacto: new FormControl<string | null>(null),
    fecha: new FormControl<string | null>(null),
    detalles: new FormArray([new FormGroup({ cantidad: new FormControl(1) })]),
  });
}

/** `ConfirmationService` de mentira: guarda la confirmación y deja responderla. */
function fakeConfirmation(): {
  service: ConfirmationService;
  responder: (aceptar: boolean) => void;
} {
  let pending: Confirmation | null = null;
  return {
    service: {
      confirm: (c: Confirmation) => {
        pending = c;
      },
    } as ConfirmationService,
    responder: (aceptar) => (aceptar ? pending?.accept?.() : pending?.reject?.()),
  };
}

const labels = { leaveHeader: 'h', leaveMessage: 'm', leaveConfirm: 'c' };

describe('isHeaderDirty', () => {
  it('es falso con el form recién hidratado (patchValue no ensucia)', () => {
    const form = documentoForm();
    form.patchValue({ contacto: 'ACME', fecha: '2026-01-01' });
    expect(isHeaderDirty(form)).toBe(false);
  });

  it('es verdadero cuando la persona editó un campo del encabezado', () => {
    const form = documentoForm();
    form.controls['contacto'].markAsDirty();
    expect(isHeaderDirty(form)).toBe(true);
  });

  it('ignora el array de líneas: lo cubre el contador de pendientes', () => {
    const form = documentoForm();
    form.controls['detalles'].markAsDirty();
    expect(isHeaderDirty(form)).toBe(false);
  });

  it('ignora también las tablas extra que se declaren (factura de compra)', () => {
    const form = documentoForm();
    form.addControl('cuentas', new FormArray([]));
    form.controls['cuentas'].markAsDirty();
    expect(isHeaderDirty(form, ['detalles', 'cuentas'])).toBe(false);
    expect(isHeaderDirty(form)).toBe(true);
  });
});

describe('canLeaveDocumentForm', () => {
  const call = (form: FormGroup, pendingLines: number, confirmation: ConfirmationService) =>
    canLeaveDocumentForm({
      form,
      pendingLines,
      confirmation,
      labels,
      cancelLabel: 'Cancelar',
    });

  it('deja salir sin preguntar cuando no hay nada pendiente', () => {
    const { service } = fakeConfirmation();
    expect(call(documentoForm(), 0, service)).toBe(true);
  });

  it('pregunta cuando solo cambió el encabezado (el caso que se perdía)', async () => {
    const { service, responder } = fakeConfirmation();
    const form = documentoForm();
    form.controls['fecha'].markAsDirty();

    const result = call(form, 0, service);
    if (!isObservable(result)) throw new Error('debía preguntar');

    const salida = firstValueFrom(result);
    responder(true);
    await expect(salida).resolves.toBe(true);
  });

  it('pregunta cuando quedan líneas sin guardar, con el encabezado limpio', async () => {
    const { service, responder } = fakeConfirmation();
    const result = call(documentoForm(), 1, service);
    if (!isObservable(result)) throw new Error('debía preguntar');

    const salida = firstValueFrom(result);
    responder(true);
    await expect(salida).resolves.toBe(true);
  });

  it('cancela la navegación si la persona vuelve al formulario', async () => {
    const { service, responder } = fakeConfirmation();
    const form = documentoForm();
    form.controls['contacto'].markAsDirty();
    const result = call(form, 0, service);
    if (!isObservable(result)) throw new Error('debía preguntar');

    const salida = firstValueFrom(result);
    responder(false);
    await expect(salida).resolves.toBe(false);
  });

  it('deja salir cuando el guardado marcó el form como limpio', () => {
    const { service } = fakeConfirmation();
    const form = documentoForm();
    form.controls['contacto'].markAsDirty();
    form.markAsPristine();
    expect(call(form, 0, service)).toBe(true);
  });
});
