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

export function iconoDeGrupo(nombre: string): string {
  const clave = normalizar(nombre);
  // El más largo primero: «punto de venta» no debe caer en «venta».
  const match = [...ICONO_POR_MODULO]
    .sort(([a], [b]) => b.length - a.length)
    .find(([prefijo]) => clave.startsWith(prefijo));
  return match?.[1] ?? ICONO_GENERICO;
}
