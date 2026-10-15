import type { ContenedoresTranslationsHost } from '@reddoc/feature-contenedores/i18n';
import type {
  AccesosContenedorTranslationsHost,
  AppSwitcherTranslationsHost,
  AuthTranslationsHost,
  PhoneInputTranslationsHost,
} from '@reddoc/ui/i18n';
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
  common: {
    comingSoon: string;
    actions: {
      new: string;
      actions: string;
      view: string;
      edit: string;
      delete: string;
      deleteSelected: string;
      cancel: string;
      back: string;
      save: string;
      menuLabel: string;
      filters: string;
      clearFilters: string;
      clearSearch: string;
      refresh: string;
      exportExcel: string;
      import: string;
      export: string;
    };
    search: {
      placeholder: string;
    };
    list: {
      records: string;
      of: string;
      empty: { title: string; sub: string };
    };
    confirms: {
      deleteHeader: string;
      deleteMessage: string;
    };
    toasts: {
      loadError: { title: string; desc: string };
      deleteSuccess: { title: string; desc: string };
      deleteError: { title: string; desc: string };
      exportError: { title: string; desc: string };
    };
    boolean: { true: string; false: string };
    imageUpload: {
      change: string;
      remove: string;
      removeConfirm: string;
      tooLarge: string;
      hint: string;
      dialogTitle: string;
      empty: string;
    };
    filters: {
      title: string;
      subtitle: string;
      addCondition: string;
      removeCondition: string;
      where: string;
      and: string;
      apply: string;
      clear: string;
      cancel: string;
      noValue: string;
      valuePlaceholder: string;
      empty: { title: string; sub: string };
      operators: {
        contiene: string;
        es: string;
        noEs: string;
        comienzaCon: string;
        terminaCon: string;
        vacio: string;
        noVacio: string;
        mayor: string;
        mayorIgual: string;
        menor: string;
        menorIgual: string;
        esVerdadero: string;
        esFalso: string;
      };
    };
    import: {
      dropzone: {
        primary: string;
        secondary: string;
        /** Soporta los placeholders `{types}` y `{max}`. */
        hint: string;
        invalidType: string;
        tooLarge: string;
      };
      fileMeta: {
        /** Soporta los placeholders `{size}` y `{time}`. */
        uploadedAt: string;
      };
      removeFile: string;
      tabs: { errors: string; masters: string };
      emptyStates: { errors: string; masters: string };
      errors: {
        rowHeader: string;
        messageHeader: string;
        /** Soporta los placeholders `{shown}` y `{total}`. */
        truncated: string;
      };
      example: {
        download: string;
        downloading: string;
        error: { title: string; desc: string };
      };
      submit: string;
      submitting: string;
      cancel: string;
      toasts: {
        success: { title: string; desc: string };
        error: { title: string; desc: string };
      };
    };
  };
  layout: {
    menuLabel: string;
    drawerHeader: string;
    tenantBadge: {
      ariaLabel: string;
    };
    /** Etiqueta de cada sección del sidebar; las claves salen de `WORKSPACE_MENU`. */
    nav: Record<PosNavKey, string>;
    sidebar: { colapsar: string; expandir: string };
    /** Otra pestaña del navegador tiene la caja de esta empresa. */
    pestanaOcupada: { titulo: string; desc: string; esperando: string; cambiarEmpresa: string };
    userMenu: {
      label: string;
      myContainers: string;
      manageAccount: string;
      settings: string;
      logout: string;
    };
  };
  caja: {
    title: string;
    configuracion: { title: string; desc: string; accion: string };
    /** No se pudo leer el tipo de documento de la empresa. */
    configuracionError: { title: string; desc: string; accion: string };
    buscador: {
      modo: string;
      porNombre: string;
      porCodigo: string;
      placeholderNombre: string;
      placeholderCodigo: string;
      limpiar: string;
      nuevoItem: string;
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
    compacta: { verVenta: string; titulo: string };
    tabs: {
      label: string;
      nueva: string;
      atajoNueva: string;
      opciones: string;
      renombrar: string;
      renombrarSubtitulo: string;
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
      nuevoCliente: string;
      vacio: string;
      vacioDesc: string;
      cancelar: string;
      cobrar: string;
      atajoCobrar: string;
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
    cliente: {
      titulo: string;
      subtitulo: string;
      nota: string;
      guardar: string;
      campos: {
        tipoPersona: string;
        identificacion: string;
        numero: string;
        dv: string;
        nombre1: string;
        nombre2: string;
        apellido1: string;
        apellido2: string;
        razonSocial: string;
        correo: string;
        telefono: string;
        direccion: string;
        ciudad: string;
      };
      errores: { existente: string };
      toasts: { creado: { title: string; desc: string }; error: string };
    };
    item: {
      titulo: string;
      subtitulo: string;
      guardar: string;
      avisoInventario: string;
      tipos: { producto: string; servicio: string };
      campos: {
        codigo: string;
        nombre: string;
        precio: string;
        tipo: string;
        inventario: string;
        favorito: string;
        impuestos: string;
        impuestosPlaceholder: string;
      };
      toasts: { creado: { title: string; desc: string }; error: string };
    };
    cobro: {
      titulo: string;
      cerrar: string;
      total: string;
      medio: string;
      medios: Record<MedioPagoId, string> & { proximamente: string };
      efectivo: {
        recibido: string;
        recibidoMinimo: string;
        exacto: string;
        cambioEntregar: string;
        faltaRecibir: string;
        cobrar: string;
      };
      tarjeta: { datafono: string; datafonoPlaceholder: string; aprobacion: string };
      transferencia: {
        cuentaDestino: string;
        cuentaDestinoPlaceholder: string;
        referencia: string;
        referenciaPlaceholder: string;
      };
      noDisponible: string;
      ingreso: {
        ingresaA: string;
        cambiar: string;
        ocultar: string;
        cuenta: string;
        asesor: string;
      };
      fases: Record<FaseCobro, string>;
      exito: {
        titulo: string;
        desc: string;
        documento: string;
        total: string;
        recibido: string;
        imprimir: string;
        nuevaVenta: string;
      };
      pendiente: {
        titulo: string;
        desc: string;
        documento: string;
        pago: string;
        aprobacion: string;
        hecho: string;
        falta: string;
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
  acceso: {
    sinVenta: { title: string; desc: string };
  };
  historial: {
    buscar: string;
    columns: {
      numero: string;
      fecha: string;
      tipo: string;
      identificacion: string;
      contacto: string;
      subtotal: string;
      impuesto: string;
      total: string;
      aprobado: string;
      anulado: string;
      electronico: string;
    };
    filtros: { aprobado: string; anulado: string; electronico: string };
    acciones: { imprimir: string };
    toasts: { imprimirError: { title: string; desc: string } };
  };
  configuracion: {
    title: string;
    subtitle: string;
    documento: { title: string; hint: string; error: string; reintentar: string };
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
      tipoError: { title: string; desc: string };
    };
  };
}
