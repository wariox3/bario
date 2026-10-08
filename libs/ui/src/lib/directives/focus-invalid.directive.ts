import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  type OnInit,
  afterNextRender,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroupDirective } from '@angular/forms';

/**
 * Campos que todavía no dejan guardar, en orden de pantalla.
 *
 * `.ng-invalid` la pone Angular en el host de cada `formControlName`, sea
 * `<input>` o componente propio. `.ng-pending` cubre al que está esperando su
 * validador async —identificación única, por ejemplo—: no está mal, pero es
 * igual de bloqueante y sin él el clic no haría nada visible.
 *
 * `[formcontrolname]` deja fuera a los `formGroupName`, que heredan las clases
 * pero no son un campo al que saltar.
 */
const SELECTOR_PENDIENTE = '[formcontrolname].ng-invalid, [formcontrolname].ng-pending';

/**
 * Al intentar guardar con el formulario inválido, marca todo como tocado —así
 * cada `<lib-field-error>` aparece— y lleva a la persona al primer campo con
 * error, en orden de pantalla.
 *
 * ```html
 * <form [formGroup]="form" (ngSubmit)="onSubmit()" libFocusInvalid>
 *   <p-button type="submit" [disabled]="isSaving()" … />
 * ```
 *
 * El botón de guardar **no** se deshabilita por `form.invalid`: un botón muerto
 * no explica qué falta ni deja avanzar, y con 20 campos obligatorios en cuatro
 * cards encontrar el que falta a ojo es el problema. La página solo conserva su
 * guard `if (form.invalid) return` en el handler.
 */
@Directive({
  selector: 'form[libFocusInvalid]',
  standalone: true,
})
export class FocusInvalidDirective implements OnInit {
  private readonly formDirective = inject(FormGroupDirective);
  private readonly host = inject<ElementRef<HTMLFormElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  /**
   * Nuestro suscriptor corre después del `(ngSubmit)` de la página —se anotó
   * antes al mismo emitter—, así que su guard ya devolvió. El salto espera al
   * render: al marcar todo como tocado aparecen los mensajes de error y la
   * página crece; medir antes dejaría el scroll corto.
   */
  ngOnInit(): void {
    this.formDirective.ngSubmit.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const form = this.formDirective.form;
      // `valid` y no `!invalid`: un form PENDING —esperando un validador async—
      // tampoco pasó, y hay que decirlo. Uno entero deshabilitado no es un
      // intento fallido, es una pantalla de solo lectura.
      if (form.valid || form.disabled) return;
      form.markAllAsTouched();
      afterNextRender(() => this.irAlPrimero(), { injector: this.injector });
    });
  }

  /**
   * `block: 'center'` y no `'start'`: el header y la barra de acciones son
   * sticky, así que un campo pegado al tope del scrollport queda tapado justo
   * por el chrome que lo mandó ahí. El foco va al control interno —los
   * componentes de `@reddoc/ui` no son focusables ellos mismos— y con
   * `preventScroll` para no pelear con el scroll suave que ya está en curso.
   */
  private irAlPrimero(): void {
    const el = this.host.querySelector<HTMLElement>(SELECTOR_PENDIENTE);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = el.matches('input, select, textarea')
      ? el
      : el.querySelector<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
        );
    focusable?.focus({ preventScroll: true });
  }
}
