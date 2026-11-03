import type { FraseId, SaludoId } from '../saludo.catalogo';

/**
 * Textos del saludo. Los `Record` sobre los ids del catálogo obligan a traducir
 * cada saludo y cada frase en los dos idiomas.
 *
 * Tono: español neutro con tuteo, sin juzgar a qué hora trabaja la persona y sin
 * suponer su género. Los saludos van sin nombre: el componente le suma ", Mario".
 */
export interface SaludoDict {
  saludos: Record<SaludoId, string>;
  frases: Record<FraseId, string>;
}

export interface SaludoTranslationsHost {
  saludo: SaludoDict;
}
