import { Component, DestroyRef, computed, inject, input, signal, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { InicioInvitacionComponent } from '@erp/core/components/inicio-invitacion/inicio-invitacion.component';
import {
  ParametroService,
  type AsistenteElectronicoModulo,
} from '@erp/core/services/parametro.service';
import { ElectronicoService } from '../../electronico.service';
import { ASISTENTE_VARIANTES } from '../../asistente-variante';

/**
 * Invitación al asistente electrónico en el inicio de un módulo (Venta,
 * Humano): la tira compartida de los inicios con «Omitir» y «Completar».
 *
 * Auto-contenida: consulta su parámetro (`gen_asistente_electronico_<modulo>`)
 * y, si sigue en `true`, invita. «Omitir» cierra el asistente igual que
 * terminarlo; «Completar» lleva a él. El inicio solo la pone.
 */
@Component({
  selector: 'app-asistente-invitacion',
  standalone: true,
  imports: [ButtonModule, InicioInvitacionComponent],
  templateUrl: './asistente-invitacion.component.html',
})
export class AsistenteInvitacionComponent implements OnInit {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly parametro = inject(ParametroService);
  private readonly electronico = inject(ElectronicoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;

  readonly variante = input.required<AsistenteElectronicoModulo>();

  protected readonly config = computed(() => ASISTENTE_VARIANTES[this.variante()]);
  protected readonly textos = computed(
    () => this.t().asistenteElectronico.variantes[this.variante()].invitacion,
  );

  /**
   * `null` = todavía no sabemos (petición en vuelo o fallida).
   *
   * Los tres estados importan: solo con un `true` **confirmado** invitamos. Si
   * arrancara en `true` la tira parpadearía en toda entrada al módulo, incluso
   * en contenedores que ya terminaron u omitieron el asistente.
   */
  private readonly pendiente = signal<boolean | null>(null);

  protected readonly visible = computed(() => this.pendiente() === true);

  /** «Omitir» en vuelo: carga en su botón y bloquea «Completar». */
  protected readonly omitiendo = signal(false);

  ngOnInit(): void {
    // En `ngOnInit` y no en el constructor: la variante es un input.
    this.parametro
      .asistenteElectronico(this.variante())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pendiente) => this.pendiente.set(pendiente),
        // Sin dato no hay invitación: preferimos no ofrecer nada antes que
        // insistirle a quien quizá ya lo terminó.
        error: () => this.pendiente.set(null),
      });
  }

  /**
   * La empresa no quiere el asistente: se cierra igual que al terminarlo y la
   * tira se va. Si falla, el interceptor ya avisó; solo se libera el botón.
   */
  protected omitir(): void {
    if (this.omitiendo()) return;
    this.omitiendo.set(true);
    this.electronico
      .terminarAsistente(this.variante())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.omitiendo.set(false);
          this.pendiente.set(false);
        },
        error: () => this.omitiendo.set(false),
      });
  }

  /**
   * Al asistente, que vive fuera del módulo: lo que completa son datos de la
   * **empresa**, no del módulo.
   */
  protected completar(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, this.config().ruta]);
  }
}
