import { formatRecencia } from '@reddoc/core';

/**
 * Registro de accesos a la cuenta (`GET /seguridad/acceso/`).
 *
 * El endpoint registra **pasos**, no logins: entrar con segundo factor deja dos renglones
 * —`mfa_pendiente` cuando se pide el código y `ok` cuando se ingresa—. La vista habla de
 * logins, así que esos pares se unen acá (ver `agruparAccesos`).
 *
 * ⚠️ PENDIENTE con backend: qué otros valores toma `resultado` además de `ok` y
 * `mfa_pendiente` — sobre todo si se registra la contraseña incorrecta. Los que este front
 * no conoce se muestran con su `resultado_nombre`, sin inventarles significado.
 */
export interface AccesoRegistro {
  readonly id: number;
  /** `ok`, `mfa_pendiente`, y lo que el backend agregue. */
  readonly resultado: string;
  /** El nombre que le da el backend, ya en el idioma del usuario ("Ingreso exitoso"). */
  readonly resultado_nombre: string;
  readonly ip: string;
  /** User-agent crudo: lo interpreta el front. */
  readonly user_agent: string | null;
  /** `correo`, `sms`, `totp`… `null` si la cuenta no pide segundo factor. */
  readonly metodo_mfa: string | null;
  /** Entró sin código porque el equipo estaba recordado. */
  readonly dispositivo_recordado: boolean;
  /** Usó uno de sus códigos de respaldo en vez del código del método. */
  readonly codigo_respaldo: boolean;
  /** ISO 8601 con offset: `2026-08-11T14:08:06.206412-05:00`. */
  readonly fecha: string;
}

export const ACCESO_OK = 'ok';
export const ACCESO_MFA_PENDIENTE = 'mfa_pendiente';

/**
 * Qué fue, en términos del usuario:
 *
 * - `ingreso` — entró.
 * - `incompleto` — se pidió el código y nadie lo ingresó. **La contraseña sí era correcta**:
 *   es el único renglón que amerita mirarse dos veces.
 * - `otro` — un `resultado` que este front todavía no conoce. Se muestra sin interpretarlo.
 */
export type AccesoTipo = 'ingreso' | 'incompleto' | 'otro';

/** Un acceso listo para pintar. */
export interface AccesoFila {
  readonly id: number;
  readonly tipo: AccesoTipo;
  /** `Chrome en Linux`. Lo primero que se lee: es como uno se reconoce. */
  readonly equipo: string;
  /** Glifo de la familia del equipo. */
  readonly icono: string;
  readonly ip: string;
  /** `hace 5 minutos`, `ayer, 12:03`. */
  readonly recencia: string;
  /** Fecha completa, para el `title`: la recencia es cómoda, no precisa. */
  readonly fechaExacta: string;
  /** `con código por correo`, `sin código: equipo recordado`… `null` si no aplica. */
  readonly comoEntro: string | null;
  /** El nombre del backend. Se pinta solo en los `otro`: ahí es lo único que sabemos. */
  readonly resultadoNombre: string;
  /** El `resultado` crudo, para el `title` de los `otro` — sirve al depurar. */
  readonly resultadoCrudo: string;
}

/** La fecha completa que acompaña a la recencia en el `title`. */
const FECHA_COMPLETA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeStyle: 'short' });

/** Lo que se puede sacar de un user-agent sin traerse una librería entera. */
interface EquipoDetectado {
  readonly navegador: string | null;
  readonly sistema: string | null;
  readonly icono: string;
}

/*
 * Heurística deliberadamente corta. El user-agent es un campo mentiroso por diseño —Edge dice
 * "Chrome", Chrome dice "Safari", la app de Google dice las dos— así que el orden de estas
 * reglas es lo que las hace funcionar: de lo más específico a lo más genérico.
 */
const NAVEGADORES: readonly (readonly [RegExp, string])[] = [
  [/edg[ea]?\//i, 'Edge'],
  [/opr\/|opera/i, 'Opera'],
  [/\bgsa\//i, 'App de Google'],
  [/firefox\/|fxios\//i, 'Firefox'],
  [/chrome\/|crios\//i, 'Chrome'],
  [/safari\//i, 'Safari'],
];

const SISTEMAS: readonly (readonly [RegExp, string, string])[] = [
  [/windows/i, 'Windows', 'pi pi-desktop'],
  [/iphone|ipod/i, 'iPhone', 'pi pi-mobile'],
  [/ipad/i, 'iPad', 'pi pi-tablet'],
  [/android/i, 'Android', 'pi pi-mobile'],
  [/mac os x|macintosh/i, 'macOS', 'pi pi-desktop'],
  [/linux|ubuntu|fedora|x11/i, 'Linux', 'pi pi-desktop'],
];

/** Sin sistema reconocido, un glifo neutro antes que uno inventado. */
const ICONO_FALLBACK = 'pi pi-globe';

export function detectarEquipo(userAgent: string | null): EquipoDetectado {
  if (!userAgent) return { navegador: null, sistema: null, icono: ICONO_FALLBACK };

  const navegador = NAVEGADORES.find(([patron]) => patron.test(userAgent))?.[1] ?? null;
  const sistema = SISTEMAS.find(([patron]) => patron.test(userAgent));

  return { navegador, sistema: sistema?.[1] ?? null, icono: sistema?.[2] ?? ICONO_FALLBACK };
}

/** `Chrome en Linux`, o lo que se sepa: media verdad antes que un "Desconocido". */
function describirEquipo({ navegador, sistema }: EquipoDetectado): string {
  if (navegador && sistema) return `${navegador} en ${sistema}`;
  return navegador ?? sistema ?? 'Equipo no identificado';
}

/** Nombre del método tal como lo diría el usuario. */
const METODO_MFA_ETIQUETA: Record<string, string> = {
  correo: 'por correo',
  sms: 'por SMS',
  totp: 'de tu app autenticadora',
};

/**
 * Cómo se resolvió el segundo factor. El orden importa: el código de respaldo es lo más
 * notable que puede pasar acá, y el equipo recordado explica por qué no se pidió nada.
 */
function describirComoEntro(registro: AccesoRegistro): string | null {
  if (registro.codigo_respaldo) return 'con un código de respaldo';
  if (registro.dispositivo_recordado) return 'sin código: equipo recordado';
  if (!registro.metodo_mfa) return null;

  const metodo = METODO_MFA_ETIQUETA[registro.metodo_mfa] ?? `por ${registro.metodo_mfa}`;
  return `con código ${metodo}`;
}

function tipoDe(resultado: string): AccesoTipo {
  if (resultado === ACCESO_OK) return 'ingreso';
  if (resultado === ACCESO_MFA_PENDIENTE) return 'incompleto';
  return 'otro';
}

function aFila(registro: AccesoRegistro, ahora: number): AccesoFila {
  const equipo = detectarEquipo(registro.user_agent);
  const fecha = new Date(registro.fecha);

  return {
    id: registro.id,
    tipo: tipoDe(registro.resultado),
    equipo: describirEquipo(equipo),
    icono: equipo.icono,
    ip: registro.ip,
    recencia: formatRecencia(fecha, ahora),
    fechaExacta: FECHA_COMPLETA.format(fecha),
    comoEntro: describirComoEntro(registro),
    resultadoNombre: registro.resultado_nombre,
    resultadoCrudo: registro.resultado,
  };
}

/**
 * Cuánto puede tardar el `ok` en seguir a su `mfa_pendiente` para contarlos como el mismo
 * login. El código vive 5 minutos; con 15 se cubre a quien va a buscar el correo y vuelve,
 * sin llegar a fundir dos intentos distintos de la misma tarde.
 */
const VENTANA_PAR_MS = 15 * 60_000;

/** Mismo equipo, misma IP: lo más cerca que estamos de "la misma persona sentada ahí". */
function claveOrigen(registro: AccesoRegistro): string {
  return `${registro.ip}|${registro.user_agent ?? ''}`;
}

/**
 * Los renglones de la tabla convertidos en **logins**.
 *
 * Cada `ok` se empareja con el `mfa_pendiente` **inmediatamente anterior** del mismo origen,
 * y ese par se pinta una sola vez. El emparejamiento es uno a uno a propósito: si aparece un
 * `mfa_pendiente` nuevo antes de que llegue el `ok`, el anterior queda huérfano —que es
 * exactamente lo que pasó: se pidió un código y nadie lo ingresó—. Con una regla más laxa
 * ("¿hay algún ok cerca?") un intento abandonado a las 13:57 se comería el ok de las 14:08 y
 * desaparecería de la lista, borrando el único renglón que esta pantalla existe para mostrar.
 *
 * Ordena de lo más reciente a lo más viejo, que es como se lee la pantalla.
 */
export function agruparAccesos(
  registros: readonly AccesoRegistro[],
  ahora: number,
): readonly AccesoFila[] {
  const cronologico = [...registros].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );

  /** Ids de los `mfa_pendiente` que resultaron ser el paso 1 de un login completo. */
  const consumidos = new Set<number>();
  const pendientePorOrigen = new Map<string, AccesoRegistro>();

  for (const registro of cronologico) {
    const clave = claveOrigen(registro);

    if (registro.resultado === ACCESO_MFA_PENDIENTE) {
      // Pisa al anterior: si había uno esperando, ya no va a completarse nunca.
      pendientePorOrigen.set(clave, registro);
      continue;
    }

    if (registro.resultado !== ACCESO_OK) continue;

    const pendiente = pendientePorOrigen.get(clave);
    if (pendiente) {
      const distancia = new Date(registro.fecha).getTime() - new Date(pendiente.fecha).getTime();
      if (distancia <= VENTANA_PAR_MS) consumidos.add(pendiente.id);
      pendientePorOrigen.delete(clave);
    }
  }

  return cronologico
    .filter((registro) => !consumidos.has(registro.id))
    .reverse()
    .map((registro) => aFila(registro, ahora));
}
