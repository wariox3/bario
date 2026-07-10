import { Component, OnDestroy, OnInit, input, signal } from '@angular/core';

interface Paso {
  icon: string;
  label: string;
}

@Component({
  selector: 'lib-contenedor-creation-overlay',
  standalone: true,
  imports: [],
  templateUrl: './contenedor-creation-overlay.component.html',
  styleUrl: './contenedor-creation-overlay.component.scss',
})
export class ContenedorCreationOverlayComponent implements OnInit, OnDestroy {
  readonly nombreEmpresa = input<string>('');

  protected readonly pasos: Paso[] = [
    { icon: 'pi-building', label: 'Registrando tu empresa' },
    { icon: 'pi-database', label: 'Configurando la base de datos' },
    { icon: 'pi-credit-card', label: 'Activando tu plan de suscripción' },
    { icon: 'pi-cog', label: 'Preparando tus módulos' },
    { icon: 'pi-check-circle', label: 'Finalizando configuración' },
  ];

  protected readonly savingStep = signal(0);

  private stepInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.stepInterval = setInterval(() => {
      this.savingStep.update((s) => Math.min(s + 1, this.pasos.length - 1));
    }, 6000);
  }

  ngOnDestroy(): void {
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
      this.stepInterval = null;
    }
  }
}
