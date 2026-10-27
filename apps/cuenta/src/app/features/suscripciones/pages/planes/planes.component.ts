import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { getInitials, resolvePlanCategory, ToastService } from '@reddoc/core';
import {
  formatSuscripcionFechaFin,
  getSuscripcionFrecuenciaLabel,
  getSuscripcionStatus,
} from '../../suscripcion.utils';
import { BillingProfile } from '../../models/billing-profile.model';
import { WompiCheckoutError } from '../../models/pago.model';
import { Suscripcion } from '../../models/suscripcion.model';
import {
  SUSCRIPCION_CATEGORIA_ERP,
  SUSCRIPCION_CATEGORIA_FACTURACION,
  SuscripcionTipo,
} from '../../models/suscripcion-tipo.model';
import { BillingProfilesService } from '../../services/billing-profiles.service';
import { CambioPlanService } from '../../services/cambio-plan.service';
import { SuscripcionTiposService } from '../../services/suscripcion-tipos.service';
import { SuscripcionesService } from '../../services/suscripciones.service';
import { WompiPaymentOrchestrator } from '../../services/wompi-payment-orchestrator.service';
import { calcularCambioPlan, calcularSaldoNoConsumido } from '../../utils/cambio-plan';
import { BillingProfileCardComponent } from './components/billing-profile-card/billing-profile-card.component';
import { BillingProfileCreateDialogComponent } from './components/billing-profile-create-dialog/billing-profile-create-dialog.component';
import { BillingProfileDeleteDialogComponent } from './components/billing-profile-delete-dialog/billing-profile-delete-dialog.component';
import { PlanCardComponent } from './components/plan-card/plan-card.component';
import { PlanConfirmStepComponent } from './components/plan-confirm-step/plan-confirm-step.component';
import { PlanStepperComponent } from './components/plan-stepper/plan-stepper.component';
import { PlanSummaryCardComponent } from './components/plan-summary-card/plan-summary-card.component';
import { PlanUpdateConfirmDialogComponent } from './components/plan-update-confirm-dialog/plan-update-confirm-dialog.component';
import { displayedMonthly, formatCop } from './utils/plan-pricing';

type Track = 'facturacion' | 'erp';

const STEP_LABELS = ['Plan', 'Facturación', 'Confirmar'] as const;

// Cuando la suscripción actual es una "Prueba" (no aparece en el listado de
// planes comprables), preseleccionamos Expansión Facturación.
const FALLBACK_PRESELECTED_PLAN_ID = 5;

// Clase comercial: agrupa todos los planes de Facturación y ERP comprables.
const SUSCRIPCION_CLASE_COMERCIAL = 1;

@Component({
  selector: 'app-planes',
  standalone: true,
  imports: [
    RouterLink,
    PlanCardComponent,
    PlanStepperComponent,
    BillingProfileCardComponent,
    BillingProfileCreateDialogComponent,
    BillingProfileDeleteDialogComponent,
    PlanSummaryCardComponent,
    PlanConfirmStepComponent,
    PlanUpdateConfirmDialogComponent,
  ],
  templateUrl: './planes.component.html',
})
export class PlanesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tiposService = inject(SuscripcionTiposService);
  private readonly suscripcionesService = inject(SuscripcionesService);
  private readonly billingService = inject(BillingProfilesService);
  private readonly wompiOrchestrator = inject(WompiPaymentOrchestrator);
  private readonly cambioPlanService = inject(CambioPlanService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly allPlanes = signal<SuscripcionTipo[]>([]);
  readonly suscripcionId = signal<number | null>(null);
  readonly suscripcion = signal<Suscripcion | null>(null);

  readonly step = signal<0 | 1 | 2>(0);
  readonly track = signal<Track>('facturacion');
  readonly annual = signal(false);
  readonly selectedPlanId = signal<number | null>(null);

  // Step 2: billing profile state
  readonly billingProfiles = signal<BillingProfile[]>([]);
  readonly selectedBillingProfileId = signal<number | null>(null);
  readonly showCreateBillingDialog = signal(false);
  readonly editingBillingProfile = signal<BillingProfile | null>(null);
  readonly deletingBillingProfile = signal<BillingProfile | null>(null);
  readonly isDeletingBilling = signal(false);

  // Step 3: payment
  readonly isStartingPayment = signal(false);
  readonly isUpdatingPlan = signal(false);
  readonly showUpdateConfirmDialog = signal(false);

  readonly stepLabels = STEP_LABELS;

  readonly visiblePlanes = computed(() => {
    const categoria =
      this.track() === 'erp' ? SUSCRIPCION_CATEGORIA_ERP : SUSCRIPCION_CATEGORIA_FACTURACION;
    return this.allPlanes().filter((p) => p.suscripcion_categoria_id === categoria);
  });

  readonly selectedPlan = computed<SuscripcionTipo | null>(() => {
    const id = this.selectedPlanId();
    if (id === null) return null;
    return this.allPlanes().find((p) => p.id === id) ?? null;
  });

  readonly clienteIniciales = computed(() => {
    const s = this.suscripcion();
    return s ? getInitials(s.cliente_nombre) : '';
  });

  readonly currentSuscripcionTipoId = computed(() => this.suscripcion()?.suscripcion_tipo ?? null);

  readonly suscripcionStats = computed(() => {
    const s = this.suscripcion();
    if (!s) return null;
    const status = getSuscripcionStatus(s);
    const frecuenciaLabel = getSuscripcionFrecuenciaLabel(s.frecuencia);
    const saldoRestante = formatCop(calcularSaldoNoConsumido(s));
    return {
      daysLeft: status.left,
      tone: status.tone,
      fechaFin: formatSuscripcionFechaFin(s.fecha_fin),
      frecuenciaLabel,
      saldoRestante,
      expired: status.expired,
    };
  });

  readonly cambioPlanCalc = computed(() => {
    const sus = this.suscripcion();
    const plan = this.selectedPlan();
    if (!sus || !plan) return null;
    return calcularCambioPlan({
      suscripcionActual: sus,
      planNuevo: plan,
      periodoNuevo: this.annual() ? 'A' : 'M',
    });
  });

  readonly cobroSinPagoWompi = computed(() => {
    const calc = this.cambioPlanCalc();
    return calc !== null && !calc.requiereCobro;
  });

  readonly selectedBillingProfile = computed<BillingProfile | null>(() => {
    const id = this.selectedBillingProfileId();
    if (id === null) return null;
    return this.billingProfiles().find((p) => p.id === id) ?? null;
  });

  readonly canGoNext = computed(() => {
    if (this.step() === 0) return this.selectedPlanId() !== null;
    if (this.step() === 1) return this.selectedBillingProfileId() !== null;
    return true;
  });

  readonly showSummary = computed(() => this.step() === 1 && this.selectedPlan() !== null);

  readonly stepHeader = computed<{ title: string; subtitle: string }>(() => {
    switch (this.step()) {
      case 0:
        return {
          title: 'Selecciona un plan',
          subtitle: 'Elige entre planes de Facturación o ERP y la frecuencia de facturación.',
        };
      case 1:
        return {
          title: 'Datos de facturación',
          subtitle: 'Elige a quién emitir la factura electrónica o registra un nuevo destinatario.',
        };
      case 2:
      default:
        return {
          title: 'Confirma y activa',
          subtitle: 'Revisa el resumen antes de procesar el pago.',
        };
    }
  });

  readonly skeletonCells = [0, 1, 2, 3];

  readonly selectedMonthlyLabel = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return '';
    return formatCop(displayedMonthly(plan.precio, this.annual()));
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    this.suscripcionId.set(id);
    this.loadSuscripcion(id);
    this.loadPlanes();
    this.loadBillingProfiles();
  }

  private loadSuscripcion(id: number | null): void {
    // Si venimos por el botón "Actualizar" tenemos el detalle en router state:
    // lo usamos para pintar el header sin esperar al API. Luego el GET lo refresca.
    const navState = (history.state ?? {}) as { suscripcion?: Suscripcion };
    if (navState.suscripcion && navState.suscripcion.id === id) {
      this.suscripcion.set(navState.suscripcion);
    }
    if (id === null) return;
    this.suscripcionesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.suscripcion.set(res);
          this.tryPreselectPlan();
        },
        error: (err) => console.error('[planes] error GET suscripcion detalle:', err),
      });
  }

  private loadPlanes(): void {
    this.tiposService
      .getClase(SUSCRIPCION_CLASE_COMERCIAL)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.allPlanes.set([...res.results]);
          this.isLoading.set(false);
          this.tryPreselectPlan();
        },
        error: (err) => {
          console.error('[planes] error:', err);
          this.isLoading.set(false);
          this.toast.error('Error', 'No se pudieron cargar los planes.');
        },
      });
  }

  private loadBillingProfiles(): void {
    this.billingService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profiles) => {
          this.billingProfiles.set([...profiles]);
          if (profiles.length > 0 && this.selectedBillingProfileId() === null) {
            this.selectedBillingProfileId.set(profiles[0].id);
          }
        },
        error: (err) => console.error('[planes] error billing profiles:', err),
      });
  }

  private tryPreselectPlan(): void {
    const planes = this.allPlanes();
    const sus = this.suscripcion();
    if (planes.length === 0 || sus === null) return;
    if (this.selectedPlanId() !== null) return;
    const current = planes.find((p) => p.id === sus.suscripcion_tipo);
    if (current) {
      this.selectedPlanId.set(current.id);
      const category = resolvePlanCategory(current.suscripcion_categoria_id);
      if (category === 'erp' || category === 'facturacion') {
        this.track.set(category);
      }
      if (sus.frecuencia === 'A') this.annual.set(true);
    } else {
      this.selectedPlanId.set(FALLBACK_PRESELECTED_PLAN_ID);
    }
  }

  selectBillingProfile(profile: BillingProfile): void {
    this.selectedBillingProfileId.set(profile.id);
  }

  openCreateBillingDialog(): void {
    this.editingBillingProfile.set(null);
    this.showCreateBillingDialog.set(true);
  }

  onEditBillingProfile(profile: BillingProfile): void {
    this.editingBillingProfile.set(profile);
    this.showCreateBillingDialog.set(true);
  }

  onCreateDialogVisibleChange(visible: boolean): void {
    this.showCreateBillingDialog.set(visible);
    if (!visible) this.editingBillingProfile.set(null);
  }

  onBillingProfileCreated(profile: BillingProfile): void {
    this.billingProfiles.update((list) => [...list, profile]);
    this.selectedBillingProfileId.set(profile.id);
  }

  onBillingProfileUpdated(profile: BillingProfile): void {
    this.billingProfiles.update((list) => list.map((p) => (p.id === profile.id ? profile : p)));
  }

  onRequestRemoveBillingProfile(profile: BillingProfile): void {
    this.deletingBillingProfile.set(profile);
  }

  onDeleteDialogVisibleChange(visible: boolean): void {
    if (!visible) this.deletingBillingProfile.set(null);
  }

  confirmRemoveBillingProfile(profile: BillingProfile): void {
    if (this.isDeletingBilling()) return;
    this.isDeletingBilling.set(true);
    this.billingService
      .remove(profile.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeletingBilling.set(false);
          this.billingProfiles.update((list) => list.filter((p) => p.id !== profile.id));
          if (this.selectedBillingProfileId() === profile.id) {
            const restantes = this.billingProfiles();
            this.selectedBillingProfileId.set(restantes[0]?.id ?? null);
          }
          this.deletingBillingProfile.set(null);
          this.toast.success('Perfil eliminado', `${profile.nombre} se eliminó.`);
        },
        error: (err) => {
          console.error('[planes] error remove billing profile:', err);
          this.isDeletingBilling.set(false);
          this.toast.error('Error', 'No se pudo eliminar el perfil de facturación.');
        },
      });
  }

  isBillingProfileSelected(profile: BillingProfile): boolean {
    return this.selectedBillingProfileId() === profile.id;
  }

  setTrack(t: Track): void {
    this.track.set(t);
  }

  toggleAnnual(): void {
    this.annual.update((v) => !v);
  }

  onPlanSelected(plan: SuscripcionTipo): void {
    this.selectedPlanId.set(plan.id);
  }

  goNext(): void {
    if (!this.canGoNext()) return;
    if (this.step() < 2) {
      this.step.update((s) => (s + 1) as 0 | 1 | 2);
    }
  }

  goBack(): void {
    if (this.step() === 0) {
      this.router.navigate(['/suscripciones']);
      return;
    }
    this.step.update((s) => (s - 1) as 0 | 1 | 2);
  }

  isPopular(plan: SuscripcionTipo): boolean {
    return plan.nombre.startsWith('Expansión');
  }

  isCurrent(plan: SuscripcionTipo): boolean {
    const tipoId = this.currentSuscripcionTipoId();
    return tipoId !== null && tipoId === plan.id;
  }

  isSelected(plan: SuscripcionTipo): boolean {
    return this.selectedPlanId() === plan.id;
  }

  goToStep(step: 0 | 1 | 2): void {
    this.step.set(step);
  }

  confirmarCambio(): void {
    if (this.cobroSinPagoWompi()) {
      this.showUpdateConfirmDialog.set(true);
    } else {
      this.pagar();
    }
  }

  onUpdateConfirmDialogVisibleChange(visible: boolean): void {
    if (this.isUpdatingPlan()) return;
    this.showUpdateConfirmDialog.set(visible);
  }

  onConfirmActualizarPlan(): void {
    this.actualizarPlan();
  }

  private pagar(): void {
    if (this.isStartingPayment()) return;

    const plan = this.selectedPlan();
    const bp = this.selectedBillingProfile();
    const id = this.suscripcionId();
    const suscripcion = this.suscripcion();
    const calc = this.cambioPlanCalc();
    if (!plan || !bp || id === null || !suscripcion || !calc) {
      this.toast.error('Error', 'Faltan datos para procesar el pago.');
      return;
    }

    this.isStartingPayment.set(true);
    this.wompiOrchestrator
      .iniciarPago({
        suscripcionId: id,
        clienteId: suscripcion.cliente,
        plan,
        billingProfile: bp,
        periodo: this.annual() ? 'A' : 'M',
        saldoNoConsumido: calc.saldoNoConsumido,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => {
          this.isStartingPayment.set(false);
          const message =
            err instanceof WompiCheckoutError
              ? err.message
              : 'No se pudo iniciar el pago. Intenta de nuevo.';
          console.error('[planes] error iniciar pago:', err);
          this.toast.error('Error', message);
        },
      });
  }

  private actualizarPlan(): void {
    if (this.isUpdatingPlan()) return;

    const plan = this.selectedPlan();
    const bp = this.selectedBillingProfile();
    const id = this.suscripcionId();
    if (!plan || !bp || id === null) {
      this.toast.error('Error', 'Faltan datos para actualizar el plan.');
      return;
    }

    this.isUpdatingPlan.set(true);
    this.cambioPlanService
      .actualizarPlan({
        suscripcion_id: id,
        suscripcion_tipo_id: plan.id,
        frecuencia: this.annual() ? 'A' : 'M',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isUpdatingPlan.set(false);
          this.showUpdateConfirmDialog.set(false);
          this.toast.success('Plan actualizado', `Ahora tu plan es ${plan.nombre}.`);
          this.router.navigate(['/suscripciones']);
        },
        error: (err) => {
          this.isUpdatingPlan.set(false);
          // Race condition: el saldo del cliente quedó desfasado del servidor.
          // Caemos al flujo Wompi automáticamente con el cálculo actualizado.
          if (err?.error?.code === 'INSUFFICIENT_BALANCE') {
            this.showUpdateConfirmDialog.set(false);
            this.toast.warn(
              'Saldo insuficiente',
              'Tu saldo cambió. Continuamos con el pago de la diferencia.',
            );
            this.pagar();
            return;
          }
          console.error('[planes] error actualizar plan:', err);
          this.toast.error('Error', 'No se pudo actualizar el plan. Intenta de nuevo.');
        },
      });
  }
}
