import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import type { CriterioBusqueda, ModoBusqueda } from '../../catalogo.store';

/** Espera tras la última tecla antes de buscar por nombre (ms). */
const ESPERA_BUSQUEDA_MS = 300;

/**
 * Buscador del catálogo con dos modos:
 *
 * - **Nombre:** busca mientras se escribe (con espera), por nombre o código.
 * - **Código:** busca solo al presionar Enter y por código exacto. Es el modo
 *   del lector de barras, que teclea el código y manda Enter; al terminar deja
 *   el texto seleccionado para que la siguiente lectura lo reemplace.
 *
 * El foco arranca en el campo y vuelve a él al cambiar de modo: en la caja se
 * busca sin tocar el mouse.
 */
@Component({
  selector: 'app-buscador-productos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buscador-productos.component.html',
})
export class BuscadorProductosComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;

  readonly buscar = output<CriterioBusqueda>();
  /** Crear un ítem; lleva el código escrito si se estaba buscando por código. */
  readonly nuevoItem = output<string>();

  /** Clases del botón del modo activo. */
  protected readonly activo = 'bg-[rgba(20,48,73,0.08)] text-brand-text';
  protected readonly inactivo = 'text-brand-muted hover:text-brand-text';

  protected readonly modo = signal<ModoBusqueda>('nombre');
  protected readonly texto = signal('');

  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');
  private readonly tecleo = new Subject<string>();

  constructor() {
    this.tecleo
      .pipe(debounceTime(ESPERA_BUSQUEDA_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => this.emitir(texto));
    afterNextRender(() => this.enfocar());
  }

  protected cambiarModo(modo: ModoBusqueda): void {
    if (this.modo() === modo) return;
    this.modo.set(modo);
    this.enfocar();
    // Lo escrito se reinterpreta en el modo nuevo.
    if (this.texto().trim()) this.emitir(this.texto());
  }

  protected onInput(valor: string): void {
    this.texto.set(valor);
    if (this.modo() === 'nombre') this.tecleo.next(valor);
    // En modo código, vaciar el campo devuelve el catálogo completo sin esperar Enter.
    else if (!valor.trim()) this.emitir('');
  }

  protected onEnter(): void {
    this.emitir(this.texto());
    if (this.modo() === 'codigo') this.campo().nativeElement.select();
  }

  protected onNuevoItem(): void {
    this.nuevoItem.emit(this.modo() === 'codigo' ? this.texto().trim() : '');
  }

  protected limpiar(): void {
    this.texto.set('');
    this.emitir('');
    this.enfocar();
  }

  private emitir(texto: string): void {
    this.buscar.emit({ modo: this.modo(), texto });
  }

  private enfocar(): void {
    this.campo().nativeElement.focus();
  }
}
