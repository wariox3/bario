import { DestroyRef, Directive, effect, inject, input } from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { exhaustMap, map } from 'rxjs';
import { I18nService } from '@reddoc/core';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import { MODELO, PermissionsService } from '@erp/core/permissions';
import { formModal } from '@erp/core/components/form-modal/form-modal';
import type { AppDict } from '@erp/i18n';
import type { Contacto } from './contacto.model';
import { contactoToSeleccionarOption } from './contacto.mapper';
import type {
  ContactoFormDialogData,
  ContactoRolInicial,
} from './pages/contacto-form/contacto-form.types';

/**
 * Rol del tercero a crear, deducido del filtro del propio selector: un documento
 * de compra filtra `proveedor`, uno de venta `cliente`. Sin ese rol el tercero
 * creado no pasaría el filtro y el selector no podría mostrarlo.
 *
 * El filtro viaja como query-param DRF (`'True'`), pero `extraParams` admite
 * también el booleano: se comparan como texto para que ambos premarquen.
 */
export function rolDesdeFiltro(
  params: Readonly<Record<string, unknown>>,
): ContactoRolInicial | undefined {
  const activo = (clave: string) => String(params[clave]).toLowerCase() === 'true';
  if (activo('proveedor')) return 'proveedor';
  if (activo('cliente')) return 'cliente';
  if (activo('empleado')) return 'empleado';
  return undefined;
}

/**
 * Rol con que abre el modal: el **explícito** del atributo
 * (`appCrearTercero="empleado"`) manda; sin él se deduce del filtro. El
 * explícito existe para los selectores cuyo filtro no dice el rol (un egreso, un
 * asiento), donde lo deducido caería al default del form.
 */
export function rolInicial(
  explicito: ContactoRolInicial | '',
  params: Readonly<Record<string, unknown>>,
): ContactoRolInicial | undefined {
  return explicito || rolDesdeFiltro(params);
}

/**
 * Alta de tercero sin salir del documento: sobre un `<lib-contacto-select>`,
 * ofrece "Nuevo contacto" al pie de sus sugerencias, abre el formulario de
 * contacto como modal y deja elegido el contacto creado.
 *
 * ```html
 * <lib-contacto-select formControlName="contacto" [extraParams]="contactoParams" appCrearTercero />
 * <lib-contacto-select formControlName="contacto" appCrearTercero="empleado" />
 * ```
 *
 * - **Permiso:** la opción aparece solo si el usuario puede crear contactos. Los
 *   grants de contacto no están en cache dentro de un documento (se piden al
 *   entrar a `/contactos`), así que se preguntan aquí; la respuesta queda en
 *   cache para el resto de la sesión.
 * - **Rol:** llega premarcado, y editable: el del atributo si se declara, si no
 *   el que dice el filtro del selector (ver `rolInicial`).
 * - **Selección:** el creado se traduce al shape de `contacto/seleccionar/` y se
 *   fija como una selección más, así el plazo y la lista de precios se
 *   autocompletan igual que al elegirlo de la lista — ningún form se entera.
 *
 * El formulario se carga lazy: el documento no paga el master hasta que alguien
 * pide crear. El modal (sin descartes accidentales, sin quedar huérfano, chunk
 * caído) lo resuelve `formModal`, igual que "Crear ítem" en la línea de un
 * documento.
 */
@Directive({
  selector: 'lib-contacto-select[appCrearTercero]',
  standalone: true,
})
export class CrearTerceroDirective {
  private readonly select = inject(ErpContactoSelectComponent, { self: true });
  private readonly permissions = inject(PermissionsService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formModal = formModal();

  /** Rol explícito; vacío (atributo sin valor) = deducirlo del filtro. */
  readonly appCrearTercero = input<ContactoRolInicial | ''>('');

  constructor() {
    effect(() => {
      this.select.createLabel.set(this.i18n.t().entities.contacto.form.createTercero);
    });

    this.permissions
      .canResolve(MODELO.general.contacto, 'crear')
      .pipe(takeUntilDestroyed())
      .subscribe((puede) => this.select.allowCreate.set(puede));

    // `exhaustMap`: un doble clic mientras carga el chunk no abre dos modales.
    outputToObservable(this.select.createRequested)
      .pipe(
        exhaustMap(() => this.abrirAlta()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((option) => this.select.selectCreated(option));
  }

  private abrirAlta() {
    const data: ContactoFormDialogData = {
      rol: rolInicial(this.appCrearTercero(), this.select.extraParams()),
    };
    return this.formModal
      .abrir<Contacto>(
        () =>
          import('./pages/contacto-form/contacto-form.component').then(
            (m) => m.ContactoFormComponent,
          ),
        { data, width: 'min(80rem, 95vw)' },
      )
      .pipe(map(contactoToSeleccionarOption));
  }
}
