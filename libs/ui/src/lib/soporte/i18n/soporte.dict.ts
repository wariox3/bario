export interface SoporteDict {
  /** Texto del botón del header y nombre accesible del panel. */
  trigger: string;
  lede: string;
  correo: string;
  whatsapp: string;
  copiar: string;
  copiado: string;
  /** Primera línea del mensaje de WhatsApp, antes de los datos de contexto. */
  saludo: string;
  /** Explica la ficha de contexto: por qué el mensaje ya sale con datos. */
  contexto: string;
  empresa: string;
  aplicacion: string;
  pantalla: string;
  /** Asunto del correo; `{app}` se reemplaza por el nombre de la app. */
  asunto: string;
}

export interface SoporteTranslationsHost {
  soporte: SoporteDict;
}
