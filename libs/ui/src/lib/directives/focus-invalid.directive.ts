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
 *
 * Los campos se localizan por la clase `.ng-invalid` que Angular pone en el
 * host de cada `formControlName`, sea `<input>` o componente propio: no hay
 * nada que declarar. `[formcontrolname]` deja fuera a los `formGroupName`, que
 * heredan la clase pero no son un campo al que saltar.
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
      if (!form.invalid) return;
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
    const el = this.host.querySelector<HTMLElement>('[formcontrolname].ng-invalid');
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
