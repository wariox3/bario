import type { AsistenteElectronicoModulo } from '@erp/core/services/parametro.service';
import type { SoftwareModulo } from './electronico.model';

/** Estación del «qué sigue» del cierre; cada variante elige las suyas. */
export type EstacionClave = 'enviada' | 'revision' | 'resoluciones' | 'emitir';

/**
 * Lo que distingue un asistente electrónico de otro. Los pasos son los mismos
 * (empresa, RedEDoc y certificado son de la **empresa** y se comparten); cambia
 * contra qué módulo se consulta el software, qué parámetro se apaga al
 * terminar y a dónde se vuelve.
 *
 * Los textos no viajan acá: salen del dict bajo `variantes.<id>`, así cada
 * idioma queda completo y tipado.
 */
export interface AsistenteVariante {
  /** Módulo dueño del asistente: `asistente-terminar/` y su parámetro. */
  readonly id: AsistenteElectronicoModulo;
  /** Módulo de `software-consultar/`; de él salen las tarjetas de habilitaciones. */
  readonly softwareModulo: SoftwareModulo;
  /** Segmento de la URL del asistente bajo `/t/:slug/`. */
  readonly ruta: string;
  /** Segmentos bajo `/t/:slug/` a donde se vuelve al finalizar. */
  readonly destino: readonly string[];
  /** Glifo del dominio, para la invitación del inicio y el acceso en Configuración. */
  readonly icono: string;
  /** El «qué sigue» del cierre, en orden. */
  readonly estaciones: readonly EstacionClave[];
}

export const ASISTENTE_VARIANTES = {
  venta: {
    id: 'venta',
    softwareModulo: 'facturacion',
    ruta: 'facturacion-electronica',
    destino: ['venta', 'inicio'],
    icono: 'pi-file-check',
    estaciones: ['enviada', 'revision', 'resoluciones'],
  },
  nomina: {
    id: 'nomina',
    softwareModulo: 'nomina',
    ruta: 'nomina-electronica',
    destino: ['humano', 'inicio'],
    icono: 'pi-wallet',
    // Nómina electrónica no lleva resoluciones: aprobada, ya se transmite.
    estaciones: ['enviada', 'revision', 'emitir'],
  },
} as const satisfies Record<AsistenteElectronicoModulo, AsistenteVariante>;
