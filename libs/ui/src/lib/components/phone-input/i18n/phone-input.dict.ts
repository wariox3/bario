export interface PhoneInputDict {
  /** Etiqueta accesible del selector de país (el label visible del form apunta al número). */
  countryLabel: string;
  /** Placeholder del buscador dentro del panel de países. */
  searchPlaceholder: string;
}

export interface PhoneInputTranslationsHost {
  phoneInput: PhoneInputDict;
}
