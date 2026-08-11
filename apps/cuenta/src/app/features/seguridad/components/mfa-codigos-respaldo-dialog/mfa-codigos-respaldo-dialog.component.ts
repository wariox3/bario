import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/services/auth.service';

/** Cuánto dura el "¡Copiado!" antes de volver a la etiqueta normal. */
const COPIADO_MS = 2000;

@Component({
  selector: 'app-mfa-codigos-respaldo-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, CheckboxModule, FormsModule],
  templateUrl: './mfa-codigos-respaldo-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaCodigosRespaldoDialogComponent {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Los códigos que devolvió `activar/`. Vacío = no hay nada que mostrar. */
  readonly codigos = input<readonly string[]>([]);
  readonly visible = input(false);

  /** El usuario confirmó que los guardó. Es la única salida del modal. */
  readonly confirmado = output<void>();

  /** Marca explícita: sin esto no se puede cerrar. */
  readonly guardados = signal(false);
  readonly copiado = signal(false);
  readonly descargado = signal(false);

  /** Dos columnas: 10 códigos se leen mejor en bloque que en una lista larga. */
  readonly columnas = computed(() => {
    const lista = this.codigos();
    const mitad = Math.ceil(lista.length / 2);
    return [lista.slice(0, mitad), lista.slice(mitad)];
  });

  private copiadoTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Cada apertura empieza sin confirmar: la marca no se hereda de la vez anterior.
    effect(() => {
      if (this.visible()) {
        this.guardados.set(false);
        this.copiado.set(false);
        this.descargado.set(false);
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.copiadoTimer !== null) clearTimeout(this.copiadoTimer);
    });
  }

  /** Un código por línea: es el formato que sirve para pegar en cualquier parte. */
  private comoTexto(): string {
    return this.codigos().join('\n');
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.comoTexto());
      this.copiado.set(true);
      if (this.copiadoTimer !== null) clearTimeout(this.copiadoTimer);
      this.copiadoTimer = setTimeout(() => this.copiado.set(false), COPIADO_MS);
    } catch {
      // Sin permiso de portapapeles queda la descarga, que no depende del navegador.
      this.copiado.set(false);
    }
  }

  descargar(): void {
    const email = this.authService.currentUser()?.email ?? '';
    const contenido = [
      'Códigos de respaldo de RedDoc',
      email ? `Cuenta: ${email}` : '',
      `Generados: ${new Date().toLocaleString('es-CO')}`,
      '',
      'Cada código sirve una sola vez para entrar si pierdes acceso a tu método de verificación.',
      '',
      this.comoTexto(),
      '',
    ]
      .filter(Boolean)
      .join('\n');

    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/plain;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'reddoc-codigos-respaldo.txt';
    enlace.click();
    URL.revokeObjectURL(url);

    this.descargado.set(true);
  }

  confirmar(): void {
    if (!this.guardados()) return;
    this.confirmado.emit();
  }
}
