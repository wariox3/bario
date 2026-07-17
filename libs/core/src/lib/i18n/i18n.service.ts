import { Injectable, computed, inject, signal } from '@angular/core';
import { I18N_DICTIONARIES } from './i18n.tokens';
import { DEFAULT_LANG, Lang, STORAGE_KEY, SUPPORTED_LANGS } from './i18n.types';

@Injectable({ providedIn: 'root' })
export class I18nService<TDict = unknown> {
  private readonly dicts = inject<Record<Lang, TDict>>(I18N_DICTIONARIES);
  private readonly _lang = signal<Lang>(this.readStoredLang());

  readonly lang = this._lang.asReadonly();
  readonly t = computed<TDict>(() => this.dicts[this._lang()]);

  /**
   * Resuelve una clave i18n con notación de punto (p. ej. `modules.compra.name`)
   * contra el diccionario del idioma activo. Devuelve la propia clave si la ruta
   * no existe o no termina en un string, para que la UI no muestre vacío.
   */
  translate(key: string): string {
    let current: unknown = this.t();
    for (const part of key.split('.')) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }

  setLang(lang: Lang): void {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    this._lang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }

  toggle(): void {
    this.setLang(this._lang() === 'es' ? 'en' : 'es');
  }

  private readStoredLang(): Lang {
    if (typeof localStorage === 'undefined') return DEFAULT_LANG;
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGS.includes(stored as Lang) ? (stored as Lang) : DEFAULT_LANG;
  }
}
