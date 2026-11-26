import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { resolvePlanCategory, ToastService } from '@reddoc/core';
import { BillingProfile } from '../../models/billing-profile.model';
import { WompiCheckoutError } from '../../models/pago.model';
import { Suscripcion } from '../../models/suscripcion.model';
import {
  SUSCRIPCION_CATEGORIA_ERP,
  SUSCRIPCION_CATEGORIA_FACTURACION,
  SUSCRIPCION_CLASE,
  SuscripcionTipo,
} from '../../models/suscripcion-tipo.model';
import { BillingProfilesService } from '../../services/billing-profiles.service';
import { CambioPlanService } from '../../services/cambio-plan.service';
import { SuscripcionTiposService } from '../../services/suscripcion-tipos.service';
import { SuscripcionesService } from '../../services/suscripciones.service';
import { WompiPaymentOrchestrator } from '../../services/wompi-payment-orchestrator.service';
import { calcularCambioPlan } from '../../utils/cambio-plan';
import { PlanFijo, planFijoDeSuscripcion } from '../../utils/plan-por-clase';
import { BillingProfileCardComponent } from './components/billing-profile-card/billing-profile-card.component';
import { BillingProfileCreateDialogComponent } from './components/billing-profile-create-dialog/billing-profile-create-dialog.component';
import { BillingProfileDeleteDialogComponent } from './components/billing-profile-delete-dialog/billing-profile-delete-dialog.component';
import {
  PlanCatalogoStepComponent,
  PlanTrack,
} from './components/plan-catalogo-step/plan-catalogo-step.component';
import { PlanFijoPanelComponent } from './components/plan-fijo-panel/plan-fijo-panel.component';
import { PlanConfirmStepComponent } from './components/plan-confirm-step/plan-confirm-step.component';
import { PlanStepperComponent } from './components/plan-stepper/plan-stepper.component';
import { PlanSummaryCardComponent } from './components/plan-summary-card/plan-summary-card.component';
import {
  PlanWizardActionsComponent,
  PlanWizardStep,
} from './components/plan-wizard-actions/plan-wizard-actions.component';
import { SuscripcionActualHeaderComponent } from './components/suscripcion-actual-header/suscripcion-actual-header.component';
import { PlanUpdateConfirmDialogComponent } from './components/plan-update-confirm-dialog/plan-update-confirm-dialog.component';
import { displayedMonthly, formatCop, tienePrecio } from './utils/plan-pricing';

const STEP_LABELS = ['Plan', 'Facturación', 'Confirmar'] as const;

// Cuando la suscripción actual es una "Prueba" (no aparece en el listado de
// planes comprables), preseleccionamos Expansión Facturación.
const FALLBACK_PRESELECTED_PLAN_ID = 5;

@Component({
  selector: 'app-planes',
  standalone: true,
  imports: [
    RouterLink,
    PlanCatalogoStepComponent,
    PlanFijoPanelComponent,
    PlanStepperComponent,
    BillingProfileCardComponent,
    BillingProfileCreateDialogComponent,
    BillingProfileDeleteDialogComponent,
    PlanSummaryCardComponent,
    PlanConfirmStepComponent,
    PlanUpdateConfirmDialogComponent,
    PlanWizardActionsComponent,
    SuscripcionActualHeaderComponent,
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

  private readonly cargandoCatalogo = signal(true);
  /** El GET de la suscripción terminó (bien o mal): ya se sabe qué modo de plan aplica. */
  private readonly suscripcionResuelta = signal(false);
  readonly allPlanes = signal<SuscripcionTipo[]>([]);
  readonly suscripcionId = signal<number | null>(null);
  readonly suscripcion = signal<Suscripcion | null>(null);

  /**
   * Plan de una suscripción que no elige del catálogo (Personalizado, Contador): se renueva
   * el mismo, con el precio que define su clase. `null` → se elige del catálogo.
   */
  readonly planFijo = computed<PlanFijo | null>(() => {
    const s = this.suscripcion();
    return s ? planFijoDeSuscripcion(s) : null;
  });

  // Hasta saber la clase de la suscripción no se pinta el catálogo, que no aplica a todas.
  readonly isLoading = computed(
    () => this.cargandoCatalogo() || (this.suscripcionId() !== null && !this.suscripcionResuelta()),
  );

  private readonly planesDisponibles = computed<readonly SuscripcionTipo[]>(() => {
    const fijo = this.planFijo();
    return fijo ? [fijo.plan] : this.allPlanes();
  });

  readonly step = signal<PlanWizardStep>(0);
  readonly track = signal<PlanTrack>('facturacion');
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

  readonly visiblePlanes = computed<readonly SuscripcionTipo[]>(() => {
    const fijo = this.planFijo();
    if (fijo) return [fijo.plan];
    const categoria =
      this.track() === 'erp' ? SUSCRIPCION_CATEGORIA_ERP : SUSCRIPCION_CATEGORIA_FACTURACION;
    return this.allPlanes().filter((p) => p.suscripcion_categoria_id === categoria);
  });

  readonly selectedPlan = computed<SuscripcionTipo | null>(() => {
    const id = this.selectedPlanId();
    if (id === null) return null;
    return this.planesDisponibles().find((p) => p.id === id) ?? null;
  });

  readonly currentSuscripcionTipoId = computed(() => this.suscripcion()?.suscripcion_tipo ?? null);

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

  /**
   * El plan elegido llega sin precio (p. ej. un personalizado al que aún no le fijaron valor).
   * No se deja avanzar: con costo 0 el cambio saldría «cubierto con saldo» y se activaría gratis.
   */
  readonly planSinPrecio = computed(() => {
    const plan = this.selectedPlan();
    return plan !== null && !tienePrecio(plan.precio);
  });

  readonly canGoNext = computed(() => {
    if (this.step() === 0) return this.selectedPlan() !== null && !this.planSinPrecio();
    if (this.step() === 1) return this.selectedBillingProfileId() !== null;
    return true;
  });

  readonly showSummary = computed(() => this.step() === 1 && this.selectedPlan() !== null);

  readonly stepHeader = computed<{ title: string; subtitle: string }>(() => {
    switch (this.step()) {
      case 0:
        if (this.planFijo()) {
          return {
            title: 'Renueva tu plan',
            subtitle: 'Elige cada cuánto quieres pagar.',
          };
        }
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
          this.suscripcionResuelta.set(true);
          this.tryPreselectPlan();
        },
        error: (err) => {
          this.suscripcionResuelta.set(true);
          console.error('[planes] error GET suscripcion detalle:', err);
        },
      });
  }

  private loadPlanes(): void {
    this.tiposService
      .getClase(SUSCRIPCION_CLASE.COMERCIAL)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.allPlanes.set([...res.results]);
          this.cargandoCatalogo.set(false);
          this.tryPreselectPlan();
        },
        error: (err) => {
          console.error('[planes] error:', err);
          this.cargandoCatalogo.set(false);
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
    const sus = this.suscripcion();
    if (sus === null || this.selectedPlanId() !== null) return;
    const fijo = this.planFijo();
    if (fijo) {
      this.selectedPlanId.set(fijo.plan.id);
      if (sus.frecuencia === 'A') this.annual.set(true);
      return;
    }
    const planes = this.allPlanes();
    if (planes.length === 0) return;
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

  setTrack(t: PlanTrack): void {
    this.track.set(t);
  }

  setAnnual(annual: boolean): void {
    this.annual.set(annual);
  }

  onPlanSelected(plan: SuscripcionTipo): void {
    this.selectedPlanId.set(plan.id);
  }

  goNext(): void {
    if (!this.canGoNext()) return;
    if (this.step() < 2) {
      this.step.update((s) => (s + 1) as PlanWizardStep);
    }
  }

  goBack(): void {
    if (this.step() === 0) {
      this.router.navigate(['/suscripciones']);
      return;
    }
    this.step.update((s) => (s - 1) as PlanWizardStep);
  }

  goToStep(step: PlanWizardStep): void {
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
