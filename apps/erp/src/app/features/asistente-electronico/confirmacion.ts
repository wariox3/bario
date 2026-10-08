import type { Confirmation } from 'primeng/api';

/** Textos de una confirmación, con la misma forma en todo el diccionario del módulo. */
export interface TextosConfirmacion {
  readonly header: string;
  readonly message: string;
  readonly accept: string;
}

/**
 * Arma la confirmación estándar del asistente: ícono de advertencia y la acción
 * en rojo si destruye (desvincular, eliminar) o en navy si construye
 * (reasignar). Cancelar no se configura: lo pinta el estándar global de
 * `_overlays.scss`.
 */
export function confirmacion(
  textos: TextosConfirmacion,
  cancelar: string,
  onAccept: () => void,
  { destructiva = false }: { readonly destructiva?: boolean } = {},
): Confirmation {
  return {
    header: textos.header,
    message: textos.message,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: textos.accept,
    rejectLabel: cancelar,
    ...(destructiva ? { acceptButtonStyleClass: 'p-button-danger' } : {}),
    accept: onAccept,
  };
}
