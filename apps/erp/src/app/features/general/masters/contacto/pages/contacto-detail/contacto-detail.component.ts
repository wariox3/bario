import {
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import { ArchivosDialogComponent } from '@erp/core/components/archivos-dialog/archivos-dialog.component';
import type { ArchivoOwner } from '@erp/core/components/archivos-dialog/archivo.types';
import type { AppDict } from '@erp/i18n';
import { ContactoService } from '../../contacto.service';
import { CONTACTO_LIST_PATH, TIPO_PERSONA } from '../../contacto.constants';
import type { Contacto } from '../../contacto.model';

/** Une las partes con valor descartando nulos y vacíos; '' si no queda ninguna. */
function unir(partes: readonly (string | null | undefined)[], separador: string): string {
  return partes
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => !!parte)
    .join(separador);
}

/** Rol comercial activo del contacto, con su clave i18n y color de pill. */
interface ContactoRol {
  readonly key: 'cliente' | 'proveedor' | 'empleado';
  readonly tone: 'emerald' | 'amber' | 'sky';
}

/**
 * Detalle (ficha) de un contacto — solo lectura.
 *
 * Master del módulo General (camino B). Llega desde el listado (`detalle/:id`)
 * para verificar de un vistazo identidad, contacto y rol comercial antes de
 * editar/llamar/facturar. Ningún campo se oculta por venir vacío: se pinta con
 * «—» atenuado para que la ficha conserve siempre la misma forma. Lo que sí
 * queda fuera del template son los FK que el backend devuelve únicamente como
 * id, sin su `_nombre` acompañante: no hay nada legible que mostrar.
 *
 * A diferencia del resto de los detalles, no usa `<lib-detail-header>`: esa
 * card gastaba alto en repetir el documento y el nombre que ya están entre los
 * campos. La identidad la dan la miga, el `h1` accesible y el propio grupo.
 */
@Component({
  selector: 'app-contacto-detail',
  standalone: true,
  imports: [ButtonModule, MenuModule, BreadcrumbComponent, ArchivosDialogComponent],
  templateUrl: './contacto-detail.component.html',
  styleUrl: './contacto-detail.component.scss',
})
export class ContactoDetailComponent implements OnInit {
  private readonly contactoService = inject(ContactoService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del contacto (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly contacto = signal<Contacto | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Diálogo de archivos adjuntos, que abre "Opciones → Archivos". */
  protected readonly archivosVisible = signal(false);

  private readonly opcionesMenu = viewChild.required<Menu>('opcionesMenu');

  /**
   * Entradas del menú "Opciones". Es un `computed` —y no un array armado en el
   * template— para que la referencia sea estable entre change detections: si
   * `p-menu` recibe un modelo nuevo en cada CD, pierde el primer click. Solo
   * cambia al cambiar el idioma.
   */
  protected readonly opcionesItems = computed<MenuItem[]>(() => [
    {
      label: this.t().common.archivos.title,
      icon: 'pi pi-folder',
      command: () => this.archivosVisible.set(true),
    },
  ]);

  /** Dueño de los archivos: este contacto. `null` hasta que la ficha carga. */
  protected readonly archivosOwner = computed<ArchivoOwner | null>(() => {
    const c = this.contacto();
    return c ? { kind: 'modelo', modelo: 'contacto', codigo: c.id } : null;
  });

  /** Migas: módulo General → listado de contactos → nombre del contacto abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const contacto = this.contacto();
    const moduleId = currentModuleId(this.activeModule);
    const items: BreadcrumbItem[] = [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.contacto.name,
        routerLink: slug ? ['/t', slug, moduleId, ...CONTACTO_LIST_PATH] : undefined,
      },
    ];
    if (contacto) items.push({ label: contacto.nombre_corto });
    return items;
  });

  /**
   * Número de identificación con su dígito de verificación: `900123456-7`.
   *
   * El DV es el checksum módulo-11 del **NIT**: una cédula no lo tiene. En
   * persona natural no se pinta aunque el registro lo traiga — el form calcula
   * el DV a partir del número sin mirar el tipo de persona y lo persiste
   * (`contacto.mapper.ts`, vía `getRawValue()` sobre el control deshabilitado),
   * así que hay contactos naturales con un DV guardado que no les corresponde.
   * Acá solo se deja de mostrar; limpiar lo guardado es tarea del backend.
   */
  protected readonly numeroDocumento = computed(() => {
    const c = this.contacto();
    if (!c?.numero_identificacion) return '';
    const dv = c.tipo_persona === TIPO_PERSONA.NATURAL ? null : c.digito_verificacion;
    return dv ? `${c.numero_identificacion}-${dv}` : c.numero_identificacion;
  });

  /**
   * Nombre completo en una sola línea. Las partes desglosadas solo llegan en
   * persona natural; en jurídica el nombre real es `nombre_corto`, así que cae
   * ahí — si no, la ficha de una empresa no mostraría su nombre en ningún lado.
   */
  protected readonly nombreCompleto = computed(() => {
    const c = this.contacto();
    if (!c) return '';
    return unir([c.nombre1, c.nombre2, c.apellido1, c.apellido2], ' ') || c.nombre_corto || '';
  });

  /**
   * Ubicación como bloque de sobre en vez de cuatro campos sueltos: calle y
   * barrio arriba, ciudad/departamento y código postal abajo. Se arma acá para
   * que el template no encadene un `@if` por cada separador.
   */
  protected readonly direccionLineas = computed<readonly string[]>(() => {
    const c = this.contacto();
    if (!c) return [];
    const ciudad = unir([c.ciudad_nombre, c.departamento_nombre], ' — ');
    return [unir([c.direccion, c.barrio], ' · '), unir([ciudad, c.codigo_postal], ' · ')].filter(
      (linea) => !!linea,
    );
  });

  /** Pills de rol activas según los flags del contacto. */
  protected readonly roles = computed<readonly ContactoRol[]>(() => {
    const c = this.contacto();
    if (!c) return [];
    const roles: ContactoRol[] = [];
    if (c.cliente) roles.push({ key: 'cliente', tone: 'emerald' });
    if (c.proveedor) roles.push({ key: 'proveedor', tone: 'amber' });
    if (c.empleado) roles.push({ key: 'empleado', tone: 'sky' });
    return roles;
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadContacto(id);
  }

  protected onBack(): void {
    this.navigate(...CONTACTO_LIST_PATH);
  }

  protected toggleOpciones(event: Event): void {
    this.opcionesMenu().toggle(event);
  }

  protected onEdit(): void {
    const c = this.contacto();
    if (!c) return;
    this.navigate(...CONTACTO_LIST_PATH, 'editar', c.id);
  }

  private loadContacto(id: number): void {
    this.contactoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.contacto.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.contacto.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Navega dentro del tenant activo: `/t/<slug>/<...path>`. */
  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, currentModuleId(this.activeModule), ...subPath]);
  }
}
