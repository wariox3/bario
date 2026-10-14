import type { ContenedoresTranslationsHost } from '@reddoc/feature-contenedores/i18n';
import type {
  AccesosContenedorTranslationsHost,
  AppSwitcherTranslationsHost,
  AuthTranslationsHost,
  PhoneInputTranslationsHost,
} from '@reddoc/ui';
import type { PosNavKey } from '../layouts/workspace-layout/workspace-menu';
import type { FaseCobro } from '../features/caja/cobro/cobro.model';
import type { MedioPagoId } from '../features/caja/cobro/medios-pago';

/**
 * Diccionario del POS. Hereda los bloques que traen los libs compartidos (auth,
 * app-switcher, contenedores…) y suma solo lo propio de la app.
 */
export interface AppDict
  extends
    AuthTranslationsHost,
    AppSwitcherTranslationsHost,
    PhoneInputTranslationsHost,
    ContenedoresTranslationsHost,
    AccesosContenedorTranslationsHost {
  layout: {
    menuLabel: string;
    drawerHeader: string;
    tenantBadge: {
      ariaLabel: string;
    };
    /** Etiqueta de cada sección del sidebar; las claves salen de `WORKSPACE_MENU`. */
    nav: Record<PosNavKey, string>;
    userMenu: {
      label: string;
      myContainers: string;
      manageAccount: string;
      settings: string;
      logout: string;
    };
  };
  /** Pantalla de las secciones que todavía no están construidas. */
  proximamente: {
    desc: string;
  };
  caja: {
    title: string;
    configuracion: { title: string; desc: string; accion: string };
    buscador: {
      modo: string;
      porNombre: string;
      porCodigo: string;
      placeholderNombre: string;
      placeholderCodigo: string;
      limpiar: string;
    };
    producto: {
      agregar: string;
      enVenta: string;
      disponibles: string;
      agotado: string;
      marcarFavorito: string;
      quitarFavorito: string;
    };
    estados: {
      error: string;
      reintentar: string;
      sinProductos: string;
      sinProductosDesc: string;
      sinResultados: string;
      sinResultadosDesc: string;
      cargarMas: string;
    };
    toasts: {
      favoritoError: { title: string; desc: string };
      sinStock: { title: string; desc: string };
      agregarError: { title: string; desc: string };
      codigoNoEncontrado: { title: string; desc: string };
      ventaBloqueada: { title: string; desc: string };
    };
    tabs: {
      label: string;
      nueva: string;
      opciones: string;
      renombrar: string;
      nombre: string;
      guardar: string;
      cerrar: string;
      confirmarCierre: { header: string; message: string; aceptar: string };
      cobroPendiente: { title: string; desc: string };
    };
    carrito: {
      /** Prefijo del nombre de las ventas nuevas: "Venta 1", "Venta 2"… */
      prefijoVenta: string;
      cliente: string;
      clientePlaceholder: string;
      vacio: string;
      vacioDesc: string;
      cancelar: string;
      cobrar: string;
      retomarCobro: string;
      /** Aviso del panel; le sigue el número del documento. */
      cobroPendiente: string;
      resumen: {
        productos: string;
        cantidad: string;
        subtotal: string;
        total: string;
      };
      vaciar: { boton: string; header: string; message: string; aceptar: string };
      linea: {
        editar: string;
        retirar: string;
        cantidad: string;
        sumar: string;
        restar: string;
        precioEditado: string;
      };
      editar: {
        title: string;
        precio: string;
        precioMin: string;
        cantidad: string;
        cantidadMin: string;
        cantidadMax: string;
        cancelar: string;
        guardar: string;
      };
    };
    cobro: {
      titulo: string;
      total: string;
      medios: Record<MedioPagoId, string> & { proximamente: string };
      efectivo: {
        recibido: string;
        recibidoMinimo: string;
        exacto: string;
        cambio: string;
        cuenta: string;
        asesor: string;
        volver: string;
        cobrar: string;
      };
      fases: Record<FaseCobro, string>;
      exito: {
        titulo: string;
        desc: string;
        documento: string;
        cambio: string;
        imprimir: string;
        nuevaVenta: string;
      };
      pendiente: {
        titulo: string;
        /** Le sigue el número del documento. */
        desc: string;
        faltaPago: string;
        faltaAprobar: string;
        reintentar: string;
        descartar: string;
        descartarConfirm: { header: string; message: string; aceptar: string };
      };
      requisitos: {
        configuracion: { title: string; desc: string };
        productos: { title: string; desc: string };
        cliente: { title: string; desc: string };
      };
      errores: {
        generico: string;
        configuracion: string;
        metodoPago: string;
        plazoContado: string;
        descartar: string;
        imprimir: { title: string; desc: string };
      };
    };
  };
  configuracion: {
    title: string;
    subtitle: string;
    documento: { title: string; hint: string };
    tipos: { pos: string; posElectronica: string };
    operacion: { title: string; hint: string };
    campos: {
      almacen: string;
      cuentaEfectivo: string;
      cuentaEfectivoHint: string;
      sede: string;
      asesor: string;
    };
    sinGuardar: string;
    guardar: string;
    toasts: {
      guardada: { title: string; desc: string };
    };
  };
}
