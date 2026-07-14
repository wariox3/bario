import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Contenedor, ContenedorService, I18nService, ToastService } from '@reddoc/core';
import type { ContenedoresTranslationsHost } from '../../i18n';

@Component({
  selector: 'lib-contenedor-delete-form',
  standalone: true,
  imports: [ButtonModule, InputTextModule],
  templateUrl: './contenedor-delete-form.component.html',
  styleUrl: './contenedor-delete-form.component.scss',
})
export class ContenedorDeleteFormComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly contenedor = input<Contenedor | null>(null);
  readonly deleted = output<void>();
  readonly cancelled = output<void>();

  readonly isDeleting = signal(false);
  readonly confirmValue = signal('');
  readonly confirmTouched = signal(false);

  readonly canDelete = computed(() => this.confirmValue().trim() === this.contenedor()?.nombre);

  onConfirmInput(event: Event): void {
    this.confirmValue.set((event.target as HTMLInputElement).value);
  }

  onSubmit(): void {
    const c = this.contenedor();
    if (!c || !this.canDelete() || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.contenedorService
      .deleteContenedor(c.cliente_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          const toasts = this.t().contenedores.delete.toasts;
          this.toastService.success(toasts.success.title, toasts.success.desc);
          this.deleted.emit();
        },
        error: () => {
          this.isDeleting.set(false);
          const toasts = this.t().contenedores.delete.toasts;
          this.toastService.error(toasts.error.title, toasts.error.desc);
        },
      });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
