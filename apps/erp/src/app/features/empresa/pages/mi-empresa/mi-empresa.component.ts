import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { forkJoin, map, of, switchMap } from 'rxjs';
import {
  CIUDAD_FUENTE,
  CiudadService,
  ErpSelectDataService,
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
  formatCiudad,
} from '@reddoc/core';
import type { Ciudad, ErpSelectOption } from '@reddoc/core';
import { ConfiguracionService } from '@erp/features/configuracion/configuracion.service';
import { EMPRESA_CAMPOS } from '@erp/features/configuracion/configuracion.constants';
import type { ConfiguracionRead } from '@erp/features/configuracion/configuracion.model';
import type { AppDict } from '@erp/i18n';
import { EmpresaLogoComponent } from '../../components/empresa-logo/empresa-logo.component';
import { EmpresaEditDialogComponent } from '../../components/empresa-edit-dialog/empresa-edit-dialog.component';

/** Nombre de la opción con ese id dentro de un catálogo `seleccionar`. */
function nombrePorId(catalogo: readonly ErpSelectOption[], id: number | null | undefined): string {
  return (id != null && catalogo.find((o) => o.id === id)?.nombre) || '';
}

/**
 * «Mi empresa» — ficha de la identidad de la empresa.
 *
 * Se lee, no se edita: los datos legales de la empresa se consultan mucho más de
 * lo que se corrigen, y un formulario permanente obliga a distinguir a ojo qué
 * está guardado de qué se está escribiendo. Editar abre el modal.
 *
 * El logotipo es la excepción y se cambia acá mismo: persiste solo al elegir la
 * imagen, así que meterlo en el modal serían dos clics para lo único que no
 * necesita formulario.
 *
 * Es lo que sale impreso en cada documento, por eso vive aparte de Configuración,
 * que guarda parámetros de operación (UVT, nómina, tipos de documento). Solo
 * entra el propietario del contenedor; el guard de la ruta lo sostiene y el
 * user-menu esconde la entrada al resto.
 */
@Component({
  selector: 'app-mi-empresa',
  standalone: true,
  imports: [ButtonModule, EmpresaLogoComponent, EmpresaEditDialogComponent],
  templateUrl: './mi-empresa.component.html',
  styleUrl: './mi-empresa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Ancho acotado como Configuración: es una ficha, no una tabla.
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class MiEmpresaComponent {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly selectData = inject(ErpSelectDataService);
  private readonly ciudadService = inject(CiudadService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly editVisible = signal(false);

  private readonly config = signal<Partial<ConfiguracionRead> | null>(null);
  private readonly tiposPersona = signal<readonly ErpSelectOption[]>([]);
  private readonly identificaciones = signal<readonly ErpSelectOption[]>([]);
  private readonly ciudad = signal<Ciudad | null>(null);

  /**
   * Lo que pinta la ficha, ya resuelto.
   *
   * La configuración guarda ids pelados, así que los tres nombres salen de sus
   * catálogos: tipo de persona e identificación de sus `seleccionar` completos
   * —listas cortas— y la ciudad de una consulta por id, que es lo único que
   * puede resolver una entre mil.
   */
  protected readonly ficha = computed(() => {
    const c = this.config();
    if (!c) return null;
    return {
      razonSocial: c.gen_empresa_razon_social ?? '',
      nombreCorto: c.gen_empresa_nombre_corto ?? '',
      tipoPersona: nombrePorId(this.tiposPersona(), c.gen_empresa_tipo_persona),
      identificacion: nombrePorId(this.identificaciones(), c.gen_empresa_identificacion),
      ciudad: formatCiudad(this.ciudad()?.nombre, this.ciudad()?.departamento_nombre),
      // Número y DV se unen acá y no con dos interpolaciones vecinas: al
      // formatear, el HTML las parte en líneas y el colapso de espacios metería
      // un blanco en medio del identificador.
      documento: unirDocumento(
        c.gen_empresa_numero_identificacion,
        c.gen_empresa_digito_verificacion,
      ),
      direccion: c.gen_empresa_direccion ?? '',
      telefono: c.gen_empresa_telefono ?? '',
      correo: c.gen_empresa_correo ?? '',
    };
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    // Dos olas: los catálogos salen en paralelo con la configuración, y la ciudad
    // solo después, porque su id viene en esa respuesta. La ficha no se cae si la
    // ciudad no se resuelve — se pinta con la raya, como cualquier campo vacío.
    forkJoin({
      config: this.configuracionService.obtener(EMPRESA_CAMPOS),
      tiposPersona: this.selectData.fetchOptions(SELECT_ENDPOINTS.tipoPersona),
      identificaciones: this.selectData.fetchOptions(SELECT_ENDPOINTS.identificacion),
    })
      .pipe(
        switchMap((datos) =>
          (datos.config.gen_empresa_ciudad != null
            ? this.ciudadService.byId(datos.config.gen_empresa_ciudad, CIUDAD_FUENTE.erp)
            : of(null)
          ).pipe(map((ciudad) => ({ ...datos, ciudad }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ config, tiposPersona, identificaciones, ciudad }) => {
          this.config.set(config);
          this.tiposPersona.set(tiposPersona);
          this.identificaciones.set(identificaciones);
          this.ciudad.set(ciudad);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  protected onEdit(): void {
    this.editVisible.set(true);
  }
}

/** `numero` + `-dv`, sin dejar el guion colgando cuando falta alguna de las dos partes. */
function unirDocumento(numero: string | null | undefined, dv: string | null | undefined): string {
  const n = numero?.trim() ?? '';
  const d = dv?.trim() ?? '';
  if (!n) return '';
  return d ? `${n}-${d}` : n;
}
