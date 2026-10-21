/**
 * Entry point de `PegarNumeroDirective`.
 *
 * La directiva inyecta `InputNumber` de PrimeNG, y ese módulo no se descarta por
 * tree-shaking: desde el barrel, cualquier app que importe `@reddoc/ui` (turnos,
 * eager) cargaba `primeng/inputnumber` en su bundle inicial aunque no la usara.
 * Desde aquí entra solo en quien la importa. Mismo motivo que `@reddoc/ui/auth`.
 */
export {
  PegarNumeroDirective,
  interpretarNumeroPegado,
} from './lib/directives/pegar-numero.directive';
