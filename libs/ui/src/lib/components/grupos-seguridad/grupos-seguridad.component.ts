import { Component, computed, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { I18nService, type GrupoSeguridad } from '@reddoc/core';
import type { GruposSeguridadTranslationsHost } from './i18n';

/**
 * Icono de cada grupo, el mismo de su módulo en el topbar del ERP
 * (`<modulo>.module-descriptor.ts`). El backend solo manda `id` y `nombre`,
 * así que se cruza por el nombre: sin tildes, en minúscula y por prefijo, para
 * que «Venta» y «Ventas» o «Tesorería» y «Tesoreria» caigan en el mismo.
 */
const ICONO_POR_MODULO: readonly (readonly [prefijo: string, icono: string])[] = [
  ['general', 'pi pi-cog'],
  ['venta', 'pi pi-tag'],
  ['compra', 'pi pi-shopping-cart'],
  ['tesorer', 'pi pi-wallet'],
  ['cartera', 'pi pi-credit-card'],
  ['inventario', 'pi pi-box'],
  ['humano', 'pi pi-users'],
  ['nomina', 'pi pi-users'],
  ['contab', 'pi pi-calculator'],
  ['seguridad', 'pi pi-shield'],
  ['turno', 'pi pi-clock'],
  ['transporte', 'pi pi-truck'],
  ['pos', 'pi pi-shop'],
  ['punto de venta', 'pi pi-shop'],
];

/** Un grupo que no corresponde a ningún módulo conocido. */
const ICONO_GENERICO = 'pi pi-th-large';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function iconoDeGrupo(nombre: string): string {
  const clave = normalizar(nombre);
  // El más largo primero: «punto de venta» no debe caer en «venta».
  const match = [...ICONO_POR_MODULO]
    .sort(([a], [b]) => b.length - a.length)
    .find(([prefijo]) => clave.startsWith(prefijo));
  return match?.[1] ?? ICONO_GENERICO;
}

/**
 * Grilla de grupos de seguridad con los que entra alguien a un contenedor.
 *
 * Es el bloque compartido entre las dos pantallas que invitan: la de usuarios
 * del contenedor activo (ERP · seguridad) y la de la lista de empresas
 * (`@reddoc/feature-contenedores`). Es tonto: el host carga el catálogo y arma
 * el payload (`grupo_ids`) con lo que quede marcado.
 */
@Component({
  selector: 'lib-grupos-seguridad',
  standalone: true,
  imports: [FormsModule, CheckboxModule],
  templateUrl: './grupos-seguridad.component.html',
})
export class GruposSeguridadComponent {
  private readonly i18n = inject<I18nService<GruposSeguridadTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Catálogo de grupos (verticales del schema público). */
  readonly grupos = input<readonly GrupoSeguridad[]>([]);
  readonly loading = input(false);

  /** Ids marcados. Arranca vacío en los dos hosts: se asigna lo que se marque. */
  readonly selected = model<readonly number[]>([]);

  /** Prefijo de los `id` del DOM, por si conviven dos grillas en una pantalla. */
  readonly inputIdPrefix = input('grupos-seguridad');

  protected readonly todos = computed(
    () => this.grupos().length > 0 && this.selected().length === this.grupos().length,
  );

  protected readonly iconoDeGrupo = iconoDeGrupo;

  protected isSelected(id: number): boolean {
    return this.selected().includes(id);
  }

  protected toggle(id: number): void {
    this.selected.update((ids) =>
      ids.includes(id) ? ids.filter((actual) => actual !== id) : [...ids, id],
    );
  }

  /** Atajo del encabezado: marca todos los grupos o los desmarca todos. */
  protected toggleTodos(): void {
    this.selected.set(this.todos() ? [] : this.grupos().map((grupo) => grupo.id));
  }
}
