import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type Observable, type Subscription, map } from 'rxjs';
import { ConfiguracionService } from '@erp/features/configuracion/configuracion.service';
import { ParametroService } from '@erp/core/services/parametro.service';
import { ElectronicoService } from './electronico.service';
import type { AsistenteStepId } from './asistente.constants';
import type { AsistenteVariante } from './asistente-variante';
import { EMPRESA_OBLIGATORIOS, empresaCompleta } from './asistente-estado';

/** Pasos cuyo «hecho» se puede comprobar contra el backend. */
export type PasoVerificable = Extract<
  AsistenteStepId,
  'empresa' | 'rededoc' | 'certificado' | 'habilitaciones' | 'finalizar'
>;

const PASOS: readonly PasoVerificable[] = [
  'empresa',
  'rededoc',
  'certificado',
  'habilitaciones',
  'finalizar',
];

/** Lo que no debe interrumpir con un toast: es una sonda, no algo que se pidió ver. */
const SIN_TOAST = { errorToast: false } as const;

/**
 * Qué pasos del asistente están hechos, **según el backend**.
 *
 * El check del riel no es memoria de la pantalla: sale de comprobar cada paso
 * contra su fuente (la configuración, el emisor, el certificado, el software,
 * el parámetro del asistente). Así sobrevive a recargar, a otro navegador o a
 * otro usuario, y se cae solo si algo se deshace (desvincular, eliminar).
 *
 * Cada paso se consulta por su lado: el que falla queda «sin saber» (sin
 * check) y no arrastra a los demás. Mientras no se sabe, tampoco hay check:
 * mejor un número que un check que después desaparezca.
 *
 * Vive con el asistente (se provee en su componente) y muere con él.
 */
@Injectable()
export class AsistenteEstadoStore {
  private readonly configuracion = inject(ConfiguracionService);
  private readonly electronico = inject(ElectronicoService);
  private readonly parametro = inject(ParametroService);
  private readonly destroyRef = inject(DestroyRef);

  private variante: AsistenteVariante | null = null;

  /** `true` hecho, `false` no hecho; ausente = todavía no se sabe, falló o no vino. */
  private readonly hechos = signal<Partial<Record<PasoVerificable, boolean>>>({});

  readonly completados = computed<ReadonlySet<AsistenteStepId>>(() => {
    const hechos = this.hechos();
    return new Set(PASOS.filter((paso) => hechos[paso] === true));
  });

  /** Lecturas en vuelo por paso; releer uno cancela solo el suyo. */
  private readonly lecturas = new Map<PasoVerificable, Subscription>();

  /** Arranca (o rearranca, si cambió la variante) todas las comprobaciones. */
  iniciar(variante: AsistenteVariante): void {
    this.variante = variante;
    this.hechos.set({});
    PASOS.forEach((paso) => this.refrescar(paso));
  }

  /** Vuelve a comprobar un paso; lo llaman los pasos al cambiar algo. */
  refrescar(paso: PasoVerificable): void {
    const variante = this.variante;
    if (!variante) return;
    this.lecturas.get(paso)?.unsubscribe();
    this.lecturas.set(
      paso,
      this.comprobar(paso, variante)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (hecho) =>
            hecho === null
              ? this.olvidar(paso)
              : this.hechos.update((previos) => ({ ...previos, [paso]: hecho })),
          error: () => this.olvidar(paso),
        }),
    );
  }

  private olvidar(paso: PasoVerificable): void {
    this.hechos.update((previos) => {
      const resto = { ...previos };
      delete resto[paso];
      return resto;
    });
  }

  /** `null` = la fuente no alcanza para decidir (sin check). */
  private comprobar(
    paso: PasoVerificable,
    variante: AsistenteVariante,
  ): Observable<boolean | null> {
    switch (paso) {
      case 'empresa':
        return this.configuracion
          .obtener(EMPRESA_OBLIGATORIOS, SIN_TOAST)
          .pipe(map(empresaCompleta));
      case 'rededoc':
        return this.electronico.consultarEmisor().pipe(map((consulta) => consulta.registrado));
      case 'certificado':
        return this.electronico.consultarCertificado().pipe(map((cert) => cert !== null));
      case 'habilitaciones':
        return this.electronico
          .consultarSoftware(variante.softwareModulo)
          .pipe(map((software) => software.length > 0));
      case 'finalizar':
        // El parámetro dice si todavía hay que ofrecer el asistente: apagado =
        // terminado. Si no vino, no se sabe: nada de check.
        return this.parametro
          .asistenteElectronico(variante.id)
          .pipe(map((pendiente) => (pendiente === null ? null : !pendiente)));
    }
  }
}
