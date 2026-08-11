import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ToastService } from '@reddoc/core';
import { CambiarPasswordDialogComponent } from './components/cambiar-password-dialog/cambiar-password-dialog.component';
import { MfaMetodosCardComponent } from './components/mfa-metodos-card/mfa-metodos-card.component';
import { MfaMetodoFila } from './models/mfa-metodo.model';

@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [ButtonModule, CambiarPasswordDialogComponent, MfaMetodosCardComponent],
  templateUrl: './seguridad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguridadComponent {
  private readonly toast = inject(ToastService);

  readonly dialogVisible = signal(false);

  openDialog(): void {
    this.dialogVisible.set(true);
  }

  onMfaActivado(fila: MfaMetodoFila): void {
    this.toast.success(
      'Verificación activada',
      `A partir de ahora te pediremos un código de ${fila.nombre.toLowerCase()} al iniciar sesión.`,
    );
  }

  onMfaDesactivado(fila: MfaMetodoFila): void {
    this.toast.success(
      'Verificación desactivada',
      `Ya no te pediremos el código de ${fila.nombre.toLowerCase()} al iniciar sesión.`,
    );
  }
}
