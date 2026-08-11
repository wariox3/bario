import { HttpContextToken } from '@angular/common/http';

/**
 * ¿El `errorInterceptor` debe avisar del error con un toast?
 *
 * Default `true`: un error que nadie muestra es un error invisible. Se declara
 * `false` cuando **la pantalla se hace cargo** — por ejemplo un listado que ante
 * un 403 renderiza su propio estado de "no tienes acceso" en el lugar de la
 * tabla. Ahí el toast sería el mismo mensaje dos veces.
 *
 * Silenciar el toast **no** silencia el error: el observable sigue fallando y el
 * componente lo recibe en su `error:`. Lo único que se pierde es el aviso
 * genérico, que es justamente lo que se está reemplazando.
 *
 * No aplica al 401: el refresh de token corre igual, porque no es un aviso sino
 * un mecanismo.
 */
export const ERROR_TOAST = new HttpContextToken<boolean>(() => true);
