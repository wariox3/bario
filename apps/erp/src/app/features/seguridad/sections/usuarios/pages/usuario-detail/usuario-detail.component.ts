import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  AUTH_SERVICE,
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  getInitials,
  type UsuarioClienteGrupo,
  type UsuarioClientePermiso,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { UsuarioGruposPanelComponent } from '../../components/usuario-grupos-panel/usuario-grupos-panel.component';
import { UsuarioPermisosPanelComponent } from '../../components/usuario-permisos-panel/usuario-permisos-panel.component';
import { SEGURIDAD_USUARIOS_PATH } from '../../usuarios.constants';
import { SeguridadUsuariosService } from '../../usuarios.service';
import { rolDeMiembro, type UsuarioFila } from '../../usuarios.utils';

/**
 * Detalle de un usuario del contenedor.
 *
 * El backend no expone el miembro suelto: se pide la lista del contenedor y se
 * busca el `id` de la URL. Cuesta lo mismo que ya cuesta la lista y evita
 * inventar un endpoint; el día que exista, solo cambia `load()`.
 *
 * La información del miembro va en su propia card; debajo, la card de acceso
 * con pestañas "Grupos" y "Permisos" alimentadas por
 * `/seguridad/usuario-cliente-grupo/` y `/seguridad/usuario-cliente-permiso/`,
 * ambos filtrados por la membresía (`usuario_cliente_id` = el `id` de la URL).
 * Misma receta de deep-link `?tab=` que Configuración usa con `?seccion=`.
 */
@Component({
  selector: 'app-usuario-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    TabsModule,
    BreadcrumbComponent,
    UsuarioGruposPanelComponent,
    UsuarioPermisosPanelComponent,
  ],
  templateUrl: './usuario-detail.component.html',
  styleUrl: './usuario-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class UsuarioDetailComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly auth = inject(AUTH_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** `id` de la membresía (`usuario-cliente`), no del usuario. */
  readonly id = input.required<string>();

  /** Pestaña activa (query-param `?tab=`); por defecto "grupos". */
  readonly tab = input<string>();
  protected readonly activeTab = computed(() => this.tab() || 'grupos');

  protected readonly usuario = signal<UsuarioFila | null>(null);
  /** Mientras viaja el cambio de administrador. */
  protected readonly cambiandoAdmin = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly notFound = signal(false);

  /** Grupos de la membresía (`usuario-cliente-grupo`). */
  protected readonly grupos = signal<readonly UsuarioClienteGrupo[]>([]);
  /** Permisos personalizados de la membresía (`usuario-cliente-permiso`). */
  protected readonly permisos = signal<readonly UsuarioClientePermiso[]>([]);
  protected readonly isLoadingPermiso = signal(false);

  /**
   * El propietario no se gestiona: los caminos de la lista están podados, pero
   * la URL directa igual llega acá — se muestra el panel explicativo en vez
   * del detalle.
   */
  protected readonly esPropietario = computed(() => this.usuario()?.propietario === true);

  /**
   * ¿La ficha es la de quien la mira? Un administrador no se quita el rol a sí
   * mismo desde acá: perdería en el acto la pantalla en la que está.
   */
  protected readonly esYo = computed(() => {
    const me = this.auth.currentUser()?.id;
    return me != null && this.usuario()?.usuario_id === me;
  });

  /** Seguridad → Usuarios → <persona>. La hoja no lleva link (es esta página). */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const usuario = this.usuario();
    return [
      { label: this.t().seguridad.title, routerLink: slug ? ['/t', slug, 'seguridad'] : undefined },
      {
        label: this.t().seguridad.menu.usuarios,
        routerLink: slug ? ['/t', slug, ...SEGURIDAD_USUARIOS_PATH] : undefined,
      },
      { label: usuario ? usuario.usuario_nombre_corto || usuario.usuario_email : '…' },
    ];
  });

  /** Iniciales para el avatar; el backend no expone la foto de otros usuarios. */
  protected readonly initials = computed(() => {
    const usuario = this.usuario();
    return usuario ? getInitials(usuario.usuario_nombre_corto || usuario.usuario_email) : '';
  });

  constructor() {
    // Reacciona al `id` de la URL y a que el contenedor termine de resolverse.
    effect(() => {
      const membershipId = Number(this.id());
      if (Number.isNaN(membershipId) || this.service.clienteId() == null) return;
      this.load(membershipId);
    });
  }

  protected onTabChange(value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: value },
      queryParamsHandling: 'merge',
    });
  }

  protected onBack(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...SEGURIDAD_USUARIOS_PATH]);
  }

  /** Confirma y marca o desmarca administrador según lo que la persona es hoy. */
  protected onCambiarAdmin(): void {
    const usuario = this.usuario();
    if (!usuario || usuario.propietario || usuario.soporte || this.esYo()) return;

    const textos = this.t().seguridad.usuarios.detalle.administrador;
    const hacer = !usuario.administrador;
    const nombre = usuario.usuario_nombre_corto || usuario.usuario_email;
    const conNombre = (texto: string) => texto.replace('{nombre}', nombre);
    this.confirmation.confirm({
      header: conNombre(hacer ? textos.confirmar.hacerHeader : textos.confirmar.quitarHeader),
      message: hacer ? textos.confirmar.hacerMessage : textos.confirmar.quitarMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: hacer ? textos.hacer : textos.quitar,
      rejectLabel: textos.confirmar.cancel,
      // Dar el rol construye (navy); quitarlo retira acceso (rojo).
      acceptButtonStyleClass: hacer ? undefined : 'p-button-danger',
      accept: () => this.cambiarAdmin(usuario, hacer, nombre),
    });
  }

  private cambiarAdmin(usuario: UsuarioFila, administrador: boolean, nombre: string): void {
    const toasts = this.t().seguridad.usuarios.detalle.administrador.toasts;
    this.cambiandoAdmin.set(true);
    this.service
      .setAdministrador(usuario.id, administrador)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cambiandoAdmin.set(false)),
      )
      .subscribe({
        next: () => {
          const actualizado = { ...usuario, administrador };
          this.usuario.set({ ...actualizado, rol: rolDeMiembro(actualizado) });
          const aviso = administrador ? toasts.hecho : toasts.quitado;
          this.toast.success(aviso.title, aviso.desc.replace('{nombre}', nombre));
        },
        error: (err: unknown) => {
          this.toast.error(toasts.error.title, extractErrorMessage(err, toasts.error.desc));
        },
      });
  }

  private load(membershipId: number): void {
    this.isLoading.set(true);
    this.notFound.set(false);
    this.service
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (members) => {
          const member = members.find((m) => m.id === membershipId);
          this.usuario.set(member ?? null);
          this.notFound.set(!member);
          // Al propietario no se le piden permisos: no se va a mostrar nada.
          if (member && !member.propietario) {
            this.loadPermisos(member.id);
          }
        },
        error: () => {
          this.usuario.set(null);
          this.notFound.set(true);
          const toasts = this.t().seguridad.usuarios.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  /**
   * Grupos y permisos de la membresía. Si alguno falla, su pestaña muestra el
   * empty state (sin toast: el detalle ya cargó y esto es información
   * secundaria); el otro se pinta igual.
   */
  private loadPermisos(usuarioClienteId: number): void {
    this.isLoadingPermiso.set(true);
    forkJoin({
      grupos: this.service.getGruposMiembro(usuarioClienteId).pipe(catchError(() => of([]))),
      permisos: this.service.getPermisosMiembro(usuarioClienteId).pipe(catchError(() => of([]))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingPermiso.set(false)),
      )
      .subscribe(({ grupos, permisos }) => {
        this.grupos.set(grupos);
        this.permisos.set(permisos);
      });
  }
}
