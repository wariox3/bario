import type { Translation } from 'primeng/api';
import { FORMATO_FECHA } from '../utils/date.utils';

/**
 * Traducción al español de los strings internos de PrimeNG (calendario, botones de
 * confirmación, filtros de tabla…). Se inyecta vía `providePrimeNG({ translation })`
 * en cada SPA.
 *
 * Cubre lo que el `LOCALE_ID: 'es-CO'` de Angular NO toca: el `LOCALE_ID` solo afecta
 * a los pipes de fecha/moneda/número, no a los nombres de mes/día ni a las etiquetas
 * ("Hoy", "Limpiar", "Sí"/"No") que renderizan los componentes de PrimeNG.
 *
 * Convención de textos del repo: minúscula salvo la primera palabra.
 */
export const REDDOC_PRIMENG_ES: Partial<Translation> = {
  // Botones de confirmación / diálogos
  accept: 'Sí',
  reject: 'No',

  // Calendario — semana arranca en lunes
  firstDayOfWeek: 1,
  today: 'Hoy',
  clear: 'Limpiar',
  // El formato sale de la constante del sistema: todos los `<p-datepicker>` lo
  // heredan de acá, así que ninguno declara `dateFormat` salvo que muestre otra
  // cosa (`mm/yy` para elegir un mes).
  dateFormat: FORMATO_FECHA.primeng,
  weekHeader: 'Sm',
  dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  monthNames: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
  monthNamesShort: [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ],
  chooseYear: 'Elegir año',
  chooseMonth: 'Elegir mes',
  chooseDate: 'Elegir fecha',
  prevDecade: 'Década anterior',
  nextDecade: 'Década siguiente',
  prevYear: 'Año anterior',
  nextYear: 'Año siguiente',
  prevMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  prevHour: 'Hora anterior',
  nextHour: 'Hora siguiente',
  prevMinute: 'Minuto anterior',
  nextMinute: 'Minuto siguiente',
  prevSecond: 'Segundo anterior',
  nextSecond: 'Segundo siguiente',
  am: 'a. m.',
  pm: 'p. m.',

  // Filtros / tablas / multiselect
  emptyMessage: 'No se encontraron resultados',
  emptyFilterMessage: 'No se encontraron resultados',
  emptySelectionMessage: 'Ningún elemento seleccionado',
  selectionMessage: '{0} elementos seleccionados',
  matchAll: 'Coincidir con todos',
  matchAny: 'Coincidir con alguno',
  addRule: 'Agregar regla',
  removeRule: 'Quitar regla',
  apply: 'Aplicar',
  startsWith: 'Comienza con',
  contains: 'Contiene',
  notContains: 'No contiene',
  endsWith: 'Termina con',
  equals: 'Igual a',
  notEquals: 'Distinto de',
  noFilter: 'Sin filtro',
  lt: 'Menor que',
  lte: 'Menor o igual que',
  gt: 'Mayor que',
  gte: 'Mayor o igual que',
  dateIs: 'La fecha es',
  dateIsNot: 'La fecha no es',
  dateBefore: 'La fecha es anterior a',
  dateAfter: 'La fecha es posterior a',

  // Contraseña
  weak: 'Débil',
  medium: 'Media',
  strong: 'Fuerte',
  passwordPrompt: 'Escribe una contraseña',
};
