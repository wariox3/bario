import type { ContenedoresTranslationsHost } from '@reddoc/feature-contenedores/i18n';
import type { AppSwitcherTranslationsHost, AuthTranslationsHost } from '@reddoc/ui';

/**
 * Los 42 campos de la línea liquidada del aporte a seguridad social.
 *
 * Se declara aparte porque el diccionario lo usa dos veces con las mismas claves:
 * `siglas` (el encabezado corto de la tabla) y `nombres` (qué significa cada uno,
 * para la leyenda). Tenerlo tipado una sola vez impide que una de las dos se
 * quede corta. Las claves las consume `aporte.detalles.ts`.
 */
export interface AporteDetalleCampos {
  id: string;
  identificacion: string;
  empleado: string;
  contrato: string;
  ing: string;
  ret: string;
  vsp: string;
  vst: string;
  sln: string;
  ige: string;
  lma: string;
  vac: string;
  lrm: string;
  dIrp: string;
  si: string;
  salario: string;
  h: string;
  dP: string;
  dS: string;
  dR: string;
  dC: string;
  bcP: string;
  bcS: string;
  bcR: string;
  bcC: string;
  tP: string;
  tS: string;
  tR: string;
  tC: string;
  tSena: string;
  tIcbf: string;
  cP: string;
  fSol: string;
  fSub: string;
  volAfi: string;
  volApo: string;
  cS: string;
  cR: string;
  cC: string;
  cSena: string;
  cIcbf: string;
  total: string;
}

export interface AppDict
  extends AuthTranslationsHost, AppSwitcherTranslationsHost, ContenedoresTranslationsHost {
  common: {
    comingSoon: string;
    accessDenied: {
      title: string;
      sub: string;
      subPermission: string;
      subModule: string;
      back: string;
    };
    actions: {
      new: string;
      actions: string;
      view: string;
      edit: string;
      delete: string;
      deleteSelected: string;
      cancel: string;
      back: string;
      close: string;
      save: string;
      menuLabel: string;
      filters: string;
      clearFilters: string;
      clearSearch: string;
      refresh: string;
      exportExcel: string;
      exportPdf: string;
      import: string;
      export: string;
    };
    search: {
      placeholder: string;
    };
    /** Meses del año en orden, índices 0..11. */
    months: string[];
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
    nav: {
      dashboard: string;
      home: string;
      account: string;
      empty: string;
      sections: {
        master: string;
        document: string;
        process: string;
        movement: string;
        utility: string;
        report: string;
      };
    };
    userMenu: {
      label: string;
      myContainers: string;
      manageAccount: string;
      security: string;
      settings: string;
      logout: string;
    };
  };
  documentActions: {
    generar: {
      buttonLabel: string;
      modalHeader: string;
      modalSubtitle: string;
      periodoLabel: string;
      submit: string;
      cancel: string;
      success: { title: string; desc: string };
      error: { title: string; desc: string };
    };
    generarRecurrente: {
      seleccionadosLabel: string;
      noSelection: { title: string; desc: string };
      success: { title: string; desc: string };
      empty: { title: string; desc: string };
      error: { title: string; desc: string };
    };
    detail: {
      aprobar: string;
      desaprobar: string;
      acciones: string;
      imprimir: string;
      opciones: string;
      archivos: string;
      anular: string;
      emitir: string;
      confirmAprobar: { message: string; header: string };
      confirmDesaprobar: { message: string; header: string };
      confirmAnular: { message: string; header: string };
      confirmEmitir: { message: string; header: string };
      toasts: {
        aprobarSuccess: { title: string; desc: string };
        aprobarError: { title: string; desc: string };
        desaprobarSuccess: { title: string; desc: string };
        desaprobarError: { title: string; desc: string };
        anularSuccess: { title: string; desc: string };
        anularError: { title: string; desc: string };
        emitirSuccess: { title: string; desc: string };
        emitirError: { title: string; desc: string };
        imprimirError: { title: string; desc: string };
        editBloqueado: { title: string; desc: string };
      };
    };
    estados: {
      aprobado: string;
      contabilizado: string;
      electronico: string;
      enviadoDian: string;
      notificado: string;
      generado: string;
      anulado: string;
    };
    afectacion: {
      title: string;
      subtitle: string;
      empty: string;
      cols: {
        id: string;
        documento: string;
        item: string;
        cantidad: string;
        precio: string;
        periodo: string;
        puesto: string;
        modalidad: string;
        subtotal: string;
        baseImpuesto: string;
        impuesto: string;
        total: string;
      };
      cards: { documento: string; documentoAfectado: string };
      campos: { detalleId: string; documentoId: string; fecha: string; contacto: string };
      programaciones: {
        title: string;
        empty: string;
        cols: {
          contrato: string;
          horas: string;
          horasDiurnas: string;
          horasNocturnas: string;
        };
      };
      close: string;
      loadError: { title: string; desc: string };
    };
  };
  documentImport: {
    buttonLabel: string;
    disabledHint: string;
    modalHeader: string;
    modalSubtitle: string;
    selected: string;
    submit: string;
    cancel: string;
    columns: {
      documento: string;
      fecha: string;
      contacto: string;
      item: string;
      cantidad: string;
      precio: string;
      total: string;
      pendiente: string;
    };
    toasts: {
      loadError: { title: string; desc: string };
      addSuccess: { title: string; desc: string };
      addError: { title: string; desc: string };
    };
  };
  documentAdd: {
    buttonLabel: string;
    modalHeader: string;
    modalSubtitle: string;
    showAllContacts: string;
    selected: string;
    totalSelected: string;
    submit: string;
    cancel: string;
    columns: {
      tipo: string;
      numero: string;
      fecha: string;
      fechaVence: string;
      contacto: string;
      total: string;
      afectado: string;
      pendiente: string;
    };
    toasts: {
      loadError: { title: string; desc: string };
      addSuccess: { title: string; desc: string };
      addError: { title: string; desc: string };
    };
  };
  modules: {
    general: { name: string };
    compra: { name: string };
    venta: { name: string };
    inventario: { name: string };
    contabilidad: { name: string };
    tesoreria: { name: string };
    cartera: { name: string };
    humano: { name: string };
  };
  entities: {
    almacen: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; nombre: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: { nombre: string };
        validation: { required: string; maxLength: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    asesor: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; nombreCorto: string; celular: string; correo: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: { nombreCorto: string; celular: string; correo: string };
        validation: { required: string; email: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    cuentaBanco: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; nombre: string; tipo: string; clase: string; numeroCuenta: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        sections: { contabilidad: string };
        sectionsHint: { contabilidad: string };
        fields: {
          nombre: string;
          tipo: string;
          clase: string;
          numeroCuenta: string;
          cuenta: string;
          selectPlaceholder: string;
          cuentaPlaceholder: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    precio: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; nombre: string; venta: string; compra: string; fechaVence: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: { nombre: string; venta: string; compra: string; fechaVence: string };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    resolucion: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        prefijo: string;
        numero: string;
        consecutivoDesde: string;
        consecutivoHasta: string;
        fechaDesde: string;
        fechaHasta: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: {
          prefijo: string;
          numero: string;
          consecutivoDesde: string;
          consecutivoHasta: string;
          fechaDesde: string;
          fechaHasta: string;
        };
        validation: {
          required: string;
          prefijoMax: string;
          numeroDigitos: string;
          consecutivoMax: string;
          consecutivoOrden: string;
          fechaOrden: string;
        };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        vigencia: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    contacto: {
      name: string;
      searchPlaceholder: string;
      import: { title: string; subtitle: string };
      columns: {
        id: string;
        nombre: string;
        identificacion: string;
        identificacion_abreviatura: string;
        correo: string;
        telefono: string;
        celular: string;
        cliente: string;
        proveedor: string;
        empleado: string;
      };
      form: {
        createTitle: string;
        createSubtitle: string;
        editTitle: string;
        editSubtitle: string;
        sections: { principal: string; cliente: string; proveedor: string };
        sectionsHint: { principal: string; cliente: string; proveedor: string };
        clasificacion: string;
        fields: {
          tipoPersona: string;
          responsabilidad: string;
          regimen: string;
          identificacion: string;
          numeroIdentificacion: string;
          digitoVerificacion: string;
          nombreCorto: string;
          nombre1: string;
          nombre2: string;
          apellido1: string;
          apellido2: string;
          telefono: string;
          celular: string;
          ciudad: string;
          ciudadPlaceholder: string;
          direccion: string;
          barrio: string;
          correo: string;
          cliente: string;
          proveedor: string;
          empleado: string;
          plazoPago: string;
          precio: string;
          asesor: string;
          correoFacturacion: string;
          banco: string;
          bancoPlaceholder: string;
          numeroCuenta: string;
          cuentaBancoClase: string;
          plazoPagoProveedor: string;
        };
        tipoPersonaOptions: { juridica: string; natural: string };
        pendingPlaceholder: string;
        validation: {
          required: string;
          emailInvalid: string;
          numeroIdentificacionExistente: string;
        };
        submitCreate: string;
        submitEdit: string;
        cancel: string;
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
        dian: {
          button: string;
          notFound: { title: string; desc: string };
          error: { title: string; desc: string };
        };
      };
      detail: {
        title: string;
        subtitle: string;
        eyebrow: string;
        sections: {
          general: string;
          contacto: string;
          ubicacion: string;
          cliente: string;
          proveedor: string;
        };
        labels: { codigoCiiu: string; codigoPostal: string };
        notFound: { title: string; desc: string };
      };
    };
    item: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        codigo: string;
        nombre: string;
        referencia: string;
        precio: string;
        producto: string;
        servicio: string;
        inventario: string;
      };
      form: {
        createTitle: string;
        createSubtitle: string;
        editTitle: string;
        editSubtitle: string;
        sections: { principal: string; preciosImpuestos: string; cuentas: string };
        sectionsHint: { principal: string; preciosImpuestos: string; cuentas: string };
        clasificacion: string;
        fields: {
          codigo: string;
          nombre: string;
          referencia: string;
          tipo: string;
          precio: string;
          costo: string;
          inventario: string;
          negativo: string;
          venta: string;
          favorito: string;
          inactivo: string;
          impuestosVenta: string;
          impuestosCompra: string;
          impuestosPlaceholder: string;
          cuentaVenta: string;
          cuentaCompra: string;
          cuentaCostoVenta: string;
          cuentaInventario: string;
          cuentaPlaceholder: string;
        };
        tipoOptions: { producto: string; servicio: string };
        validation: { required: string };
        submitCreate: string;
        submitEdit: string;
        cancel: string;
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        sections: { precios: string; impuestos: string; cuentas: string };
        labels: { impuestosVenta: string; impuestosCompra: string; sinImpuestos: string };
        notFound: { title: string; desc: string };
        toasts: {
          imageUploadSuccess: { title: string; desc: string };
          imageUploadError: { title: string; desc: string };
          imageRemoveSuccess: { title: string; desc: string };
          imageRemoveError: { title: string; desc: string };
        };
      };
    };
    seguridadSocial: {
      name: string;
      columns: {
        id: string;
        numero: string;
        desde: string;
        hasta: string;
        identificacion: string;
        empleado: string;
        salario: string;
        devengado: string;
        deduccion: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: { aprobado: string; anulado: string; contabilizado: string };
      /** Columnas de la tabla de lineas de la ficha. */
      detalle: { id: string; detalle: string; pago: string };
      detail: {
        sections: { general: string; montos: string; aportes: string };
        fields: {
          numero: string;
          desde: string;
          hasta: string;
          empleado: string;
          contrato: string;
          programacionDetalle: string;
          salario: string;
          baseCotizacion: string;
          basePrestacion: string;
          devengado: string;
          deduccion: string;
          total: string;
          cue: string;
        };
        verEnDian: string;
        notFound: { title: string; desc: string };
      };
    };
    sucursal: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; codigo: string; nombre: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: { codigo: string; nombre: string };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    grupo: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; nombre: string; periodo: string };
      periodos: { 1: string; 2: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: { nombre: string; periodo: string; periodoPlaceholder: string };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    cargo: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; codigo: string; nombre: string; estado: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: { codigo: string; nombre: string; estadoInactivo: string };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        activo: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    centroCosto: {
      name: string;
      searchPlaceholder: string;
      import: { title: string; subtitle: string };
      columns: { id: string; codigo: string; nombre: string; estado: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        cancel: string;
        submitCreate: string;
        submitEdit: string;
        sections: { principal: string };
        sectionsHint: { principal: string };
        fields: { codigo: string; nombre: string };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    formaPago: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; nombre: string; cuenta: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: { nombre: string; cuenta: string; cuentaPlaceholder: string };
        validation: { required: string; maxlength: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    sede: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; codigo: string; nombre: string; centroCosto: string };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: {
          nombre: string;
          codigo: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
        };
        validation: { required: string; maxlength: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    cuenta: {
      name: string;
      searchPlaceholder: string;
      import: { title: string; subtitle: string };
      columns: {
        id: string;
        codigo: string;
        nombre: string;
        movimiento: string;
        exigeBase: string;
        exigeContacto: string;
        exigeGrupo: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        sections: { clasificacion: string; comportamiento: string };
        sectionsHint: { clasificacion: string; comportamiento: string };
        fields: {
          codigo: string;
          nombre: string;
          cuentaClase: string;
          cuentaGrupo: string;
          cuentaCuenta: string;
          selectPlaceholder: string;
          permiteMovimiento: string;
          exigeBase: string;
          exigeContacto: string;
          exigeGrupo: string;
        };
        validation: {
          required: string;
          maxlength: string;
          soloDigitos: string;
          longitudPar: string;
          noIniciaCero: string;
        };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    activo: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        codigo: string;
        nombre: string;
        activoGrupo: string;
        centroCosto: string;
        valorCompra: string;
        fechaCompra: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        sections: { depreciacion: string; contabilidad: string };
        sectionsHint: { depreciacion: string; contabilidad: string };
        fields: {
          codigo: string;
          nombre: string;
          marca: string;
          serie: string;
          modelo: string;
          activoGrupo: string;
          centroCosto: string;
          metodoDepreciacion: string;
          duracion: string;
          valorCompra: string;
          depreciacionInicial: string;
          fechaCompra: string;
          fechaActivacion: string;
          fechaBaja: string;
          cuentaGasto: string;
          cuentaDepreciacion: string;
          selectPlaceholder: string;
          cuentaPlaceholder: string;
        };
        validation: { required: string; maxLength: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    periodo: {
      name: string;
      /** 13 entradas: enero..diciembre (índices 0..11) + cierre (12). */
      meses: string[];
      panel: { emptyAnios: string; emptyTitle: string; emptySub: string };
      estados: { abierto: string; bloqueado: string; cerrado: string; inconsistencia: string };
      acciones: {
        nuevoAnio: string;
        verInconsistencias: string;
        bloquear: string;
        desbloquear: string;
        cerrar: string;
      };
      confirms: { cerrar: { header: string; message: string } };
      anioNuevo: {
        title: string;
        subtitle: string;
        field: { anio: string; anioPlaceholder: string };
        validation: { required: string; rango: string };
        submit: string;
      };
      inconsistencias: {
        title: string;
        columns: { comprobante: string; numero: string; documento: string; descripcion: string };
        empty: string;
        loadError: string;
      };
      toasts: {
        bloquearSuccess: { title: string; desc: string };
        bloquearError: { title: string; desc: string };
        desbloquearSuccess: { title: string; desc: string };
        desbloquearError: { title: string; desc: string };
        cerrarSuccess: { title: string; desc: string };
        cerrarError: { title: string; desc: string };
        crearSuccess: { title: string; desc: string };
        crearError: { title: string; desc: string };
        loadError: { title: string; desc: string };
      };
    };
    empleado: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        identificacion: string;
        identificacion_abreviatura: string;
        nombre: string;
        correo: string;
        celular: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        sections: { banca: string };
        sectionsHint: { banca: string };
        fields: {
          identificacion: string;
          numeroIdentificacion: string;
          nombre1: string;
          nombre2: string;
          apellido1: string;
          apellido2: string;
          telefono: string;
          celular: string;
          ciudad: string;
          ciudadPlaceholder: string;
          direccion: string;
          barrio: string;
          correo: string;
          banco: string;
          bancoPlaceholder: string;
          numeroCuenta: string;
          cuentaBancoClase: string;
        };
        validation: {
          required: string;
          emailInvalid: string;
          numeroIdentificacionExistente: string;
        };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        sections: { general: string; contacto: string; ubicacion: string; banca: string };
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    credito: {
      name: string;
      searchPlaceholder: string;
      columns: {
        contrato: string;
        concepto: string;
        inicio: string;
        total: string;
        cuota: string;
        cantidadCuotas: string;
        abono: string;
        saldo: string;
        cuotaActual: string;
        pagado: string;
        inactivo: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        sections: { datos: string; valores: string };
        sectionsHint: { datos: string; valores: string };
        fields: {
          contrato: string;
          contratoPlaceholder: string;
          concepto: string;
          conceptoPlaceholder: string;
          inicio: string;
          total: string;
          cuota: string;
          cantidadCuotas: string;
          inactivo: string;
          aplicaPrima: string;
          aplicaCesantia: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    adicional: {
      name: string;
      searchPlaceholder: string;
      columns: {
        contrato: string;
        concepto: string;
        valor: string;
        horas: string;
        detalle: string;
        aplicaDiaLaborado: string;
        permanente: string;
        inactivo: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        sections: { datos: string; valores: string };
        sectionsHint: { datos: string; valores: string };
        fields: {
          contrato: string;
          contratoPlaceholder: string;
          concepto: string;
          conceptoPlaceholder: string;
          valor: string;
          detalle: string;
          aplicaDiaLaborado: string;
          inactivo: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        eyebrow: string;
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    novedad: {
      name: string;
      searchPlaceholder: string;
      columns: {
        novedadTipo: string;
        contrato: string;
        fechaDesde: string;
        fechaHasta: string;
        dias: string;
        total: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        sections: { vacaciones: string };
        sectionsHint: { vacaciones: string };
        fields: {
          novedadTipo: string;
          contrato: string;
          contratoPlaceholder: string;
          fechaDesde: string;
          fechaHasta: string;
          detalle: string;
          selectPlaceholder: string;
          novedadReferencia: string;
          fechaDesdePeriodo: string;
          fechaHastaPeriodo: string;
          diasDinero: string;
          diasDisfrutados: string;
          diasDisfrutadosReales: string;
        };
        validation: { required: string; min: string; rangoFechas: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
    };
    contrato: {
      name: string;
      searchPlaceholder: string;
      columns: {
        empleado: string;
        contratoTipo: string;
        fechaDesde: string;
        fechaHasta: string;
        grupo: string;
        salario: string;
        terminado: string;
      };
      form: {
        createTitle: string;
        createSubtitle: string;
        editTitle: string;
        editSubtitle: string;
        cancel: string;
        submitCreate: string;
        submitEdit: string;
        sections: {
          datos: string;
          remuneracion: string;
          seguridadSocial: string;
          terminacion: string;
        };
        sectionsHint: {
          datos: string;
          remuneracion: string;
          seguridadSocial: string;
          terminacion: string;
        };
        fields: {
          contacto: string;
          contactoPlaceholder: string;
          contratoTipo: string;
          cargo: string;
          grupo: string;
          sucursal: string;
          tiempo: string;
          fechaDesde: string;
          fechaHasta: string;
          habilitadoTurno: string;
          salario: string;
          aplicaAuxilioTransporte: string;
          salarioIntegral: string;
          tipoCosto: string;
          centroCosto: string;
          salud: string;
          entidadSalud: string;
          pension: string;
          entidadPension: string;
          entidadCesantias: string;
          entidadCaja: string;
          riesgo: string;
          tipoCotizante: string;
          subtipoCotizante: string;
          ciudadContrato: string;
          ciudadLabora: string;
          ciudadPlaceholder: string;
          motivoTerminacion: string;
          fechaUltimoPago: string;
          fechaUltimoPagoPrima: string;
          fechaUltimoPagoCesantia: string;
          fechaUltimoPagoVacacion: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      terminar: {
        action: string;
        title: string;
        subtitle: string;
        aviso: string;
        submit: string;
        fields: { fecha: string; motivo: string; seleccionar: string };
        validation: { required: string };
        toasts: {
          success: { title: string; desc: string };
          error: { title: string };
        };
      };
      parametrosIniciales: {
        action: string;
        title: string;
        subtitle: string;
        hint: string;
        fields: { general: string; prima: string; cesantia: string; vacacion: string };
        toasts: {
          success: { title: string; desc: string };
          error: { title: string };
        };
      };
      detail: {
        eyebrow: string;
        sections: { datos: string; remuneracion: string; seguridadSocial: string };
        estado: { activo: string; terminado: string };
        boolean: { si: string; no: string };
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    pedidoCliente: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          cliente: string;
          clientePlaceholder: string;
          fecha: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          cliente: string;
          fecha: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    remision: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          cliente: string;
          clientePlaceholder: string;
          fecha: string;
          sede: string;
          sedePlaceholder: string;
          asesor: string;
          asesorPlaceholder: string;
          comentario: string;
          comentarioPlaceholder: string;
        };
        validation: { required: string; comentarioMax: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          cliente: string;
          fecha: string;
          sede: string;
          asesor: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    facturaVenta: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          cliente: string;
          clientePlaceholder: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          plazoPagoPlaceholder: string;
          sede: string;
          sedePlaceholder: string;
          metodoPago: string;
          metodoPagoPlaceholder: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          cliente: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          sede: string;
          metodoPago: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    facturaPos: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
    };
    /**
     * Factura POS electrónica (tipo 24). Mismo listado que la factura POS: las
     * páginas (form y detalle) las comparte la familia y viven en
     * `posDocumento`; acá solo van el nombre visible y las etiquetas del listado.
     */
    facturaPosElectronica: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
    };
    /**
     * Cuenta de cobro (tipo 17). Documento de la familia POS (cabecera + detalles
     * + pagos) pero sin efecto de inventario ni transmisión electrónica; las
     * páginas las comparte la familia y viven en `posDocumento`. Acá solo van el
     * nombre visible y las etiquetas del listado.
     */
    cuentaCobro: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
    };
    /**
     * Textos del **form y la ficha compartidos por la familia POS** (factura POS,
     * factura POS electrónica…). El nombre del documento no vive acá: lo resuelve
     * cada página desde el `displayNameKey` de su `DocumentEntityConfig`.
     */
    /** Nota crédito de venta (tipo 2). Listado; form/ficha en `notaVenta`. */
    notaCredito: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: { aprobado: string; anulado: string; contabilizado: string };
    };
    /** Nota débito de venta (tipo 3). Listado; form/ficha en `notaVenta`. */
    notaDebito: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: { aprobado: string; anulado: string; contabilizado: string };
    };
    /**
     * Textos del **form y la ficha compartidos por las notas de venta** (nota
     * crédito, nota débito). El nombre del documento no vive acá: lo resuelve cada
     * página desde el `displayNameKey` de su `DocumentEntityConfig`.
     */
    notaVenta: {
      form: {
        createHint: string;
        editHint: string;
        tabs: { detalles: string; pagos: string; informacion: string };
        fields: {
          cliente: string;
          clientePlaceholder: string;
          fecha: string;
          documentoReferencia: string;
          documentoReferenciaPlaceholder: string;
          documentoReferenciaDisabled: string;
          sede: string;
          sedePlaceholder: string;
          metodoPago: string;
          metodoPagoPlaceholder: string;
          comentario: string;
          comentarioPlaceholder: string;
        };
        validation: { required: string; comentarioMax: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string; pagos: string };
        labels: {
          numero: string;
          cliente: string;
          fecha: string;
          documentoReferencia: string;
          sede: string;
          metodoPago: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    /**
     * Sección de pagos compartida (`<app-documento-pagos>`): factura POS, nota
     * crédito de venta y demás documentos que se cobran en el acto.
     */
    documentoPago: {
      hint: string;
      add: string;
      empty: string;
      cuentaBanco: string;
      cuentaBancoPlaceholder: string;
      monto: string;
      totalDocumento: string;
      totalRecibido: string;
      saldo: string;
      excedenHint: string;
      toasts: { exceden: { title: string; desc: string } };
    };
    posDocumento: {
      form: {
        createHint: string;
        editHint: string;
        /** Ayuda de la sección de pagos, matiz propio del POS (cobro en el acto). */
        pagosHint: string;
        tabs: { detalles: string; pagos: string; informacion: string };
        fields: {
          cliente: string;
          clientePlaceholder: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          plazoPagoPlaceholder: string;
          sede: string;
          sedePlaceholder: string;
          metodoPago: string;
          metodoPagoPlaceholder: string;
          asesor: string;
          asesorPlaceholder: string;
          ordenCompra: string;
          ordenCompraPlaceholder: string;
          comentario: string;
          comentarioPlaceholder: string;
        };
        validation: { required: string; ordenCompraMax: string; comentarioMax: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string; pagos: string };
        labels: {
          numero: string;
          cliente: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          sede: string;
          metodoPago: string;
          asesor: string;
          ordenCompra: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    facturaVentaRecurrente: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          cliente: string;
          clientePlaceholder: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          plazoPagoPlaceholder: string;
          sede: string;
          sedePlaceholder: string;
          metodoPago: string;
          metodoPagoPlaceholder: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          cliente: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          sede: string;
          metodoPago: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    facturaCompra: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        proveedor: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          proveedor: string;
          proveedorPlaceholder: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          plazoPagoPlaceholder: string;
          sede: string;
          sedePlaceholder: string;
          metodoPago: string;
          metodoPagoPlaceholder: string;
        };
        tabs: { detalles: string; cuentas: string };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          proveedor: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          sede: string;
          metodoPago: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    documentoSoporte: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        proveedor: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          proveedor: string;
          proveedorPlaceholder: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          plazoPagoPlaceholder: string;
          metodoPago: string;
          metodoPagoPlaceholder: string;
          formaPago: string;
          formaPagoPlaceholder: string;
          resolucion: string;
          resolucionPlaceholder: string;
          sede: string;
          sedePlaceholder: string;
          ordenCompra: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          proveedor: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          sede: string;
          metodoPago: string;
          formaPago: string;
          resolucion: string;
          ordenCompra: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    notaCreditoCompra: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        proveedor: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          proveedor: string;
          proveedorPlaceholder: string;
          fecha: string;
          documentoReferencia: string;
          documentoReferenciaPlaceholder: string;
          documentoReferenciaDisabled: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          proveedor: string;
          fecha: string;
          documentoReferencia: string;
          centroCosto: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    notaDebitoCompra: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        proveedor: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          proveedor: string;
          proveedorPlaceholder: string;
          fecha: string;
          documentoReferencia: string;
          documentoReferenciaPlaceholder: string;
          documentoReferenciaDisabled: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          proveedor: string;
          fecha: string;
          documentoReferencia: string;
          centroCosto: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    facturaCompraRecurrente: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        proveedor: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        adicionales: { title: string; hint: string };
        fields: {
          proveedor: string;
          proveedorPlaceholder: string;
          fecha: string;
          plazoPago: string;
          plazoPagoPlaceholder: string;
          formaPago: string;
          formaPagoPlaceholder: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
          sede: string;
          sedePlaceholder: string;
          ordenCompra: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          proveedor: string;
          fecha: string;
          plazoPago: string;
          formaPago: string;
          centroCosto: string;
          sede: string;
          ordenCompra: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    notaAjuste: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        proveedor: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          proveedor: string;
          proveedorPlaceholder: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          plazoPagoPlaceholder: string;
          metodoPago: string;
          metodoPagoPlaceholder: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
          ordenCompra: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          proveedor: string;
          fecha: string;
          fechaVence: string;
          plazoPago: string;
          metodoPago: string;
          centroCosto: string;
          ordenCompra: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    pago: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        cliente: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          cliente: string;
          clientePlaceholder: string;
          fecha: string;
          cuentaBanco: string;
          cuentaBancoPlaceholder: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
          negativeTotal: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          cliente: string;
          fecha: string;
          cuentaBanco: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    saldoInicial: {
      name: string;
    };
    cierre: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        sections: { lineas: string };
        lineasHint: string;
        cargar: string;
        eliminarTodos: string;
        confirmDeleteAll: { header: string; message: string };
        fields: {
          contacto: string;
          contactoPlaceholder: string;
          fecha: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
          comentario: string;
        };
        validation: { required: string; noEs31Diciembre: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
          cargarSuccess: { title: string; desc: string };
          cargarError: { title: string; desc: string };
          deleteAllSuccess: { title: string; desc: string };
          deleteAllError: { title: string; desc: string };
        };
      };
      cargar: {
        modalHeader: string;
        modalSubtitle: string;
        submit: string;
        fields: { cuentaDesde: string; cuentaHasta: string; cuentaCierre: string };
        validation: { required: string };
      };
      detail: {
        sections: { general: string; lineas: string };
        labels: {
          numero: string;
          contacto: string;
          fecha: string;
          centroCosto: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    depreciacion: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        sections: { activos: string };
        activosHint: string;
        cargarActivos: string;
        confirmReload: { header: string; message: string };
        fields: {
          contacto: string;
          contactoPlaceholder: string;
          fecha: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
          cargarSuccess: { title: string; desc: string };
          cargarError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; activos: string };
        labels: {
          numero: string;
          contacto: string;
          fecha: string;
          centroCosto: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    depreciacionLinea: {
      empty: string;
      removeLine: string;
      confirmDeleteLine: string;
      total: string;
      columns: {
        linea: string;
        activo: string;
        codigo: string;
        nombre: string;
        dias: string;
        valor: string;
        acciones: string;
      };
    };
    asiento: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        soporte: string;
        identificacion: string;
        contacto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          contacto: string;
          contactoPlaceholder: string;
          fecha: string;
          soporte: string;
          soportePlaceholder: string;
          comprobante: string;
          comprobantePlaceholder: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
          centroCostoHint: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
          unbalanced: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          contacto: string;
          fecha: string;
          soporte: string;
          comprobante: string;
          centroCosto: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    egreso: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        proveedor: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        fields: {
          proveedor: string;
          proveedorPlaceholder: string;
          fecha: string;
          cuentaBanco: string;
          cuentaBancoPlaceholder: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
          negativeTotal: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          proveedor: string;
          fecha: string;
          cuentaBanco: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    comercialDetalle: {
      title: string;
      hint: string;
      empty: string;
      addLine: string;
      removeLine: string;
      saveLine: string;
      saveAll: string;
      pendingSuffix: string;
      leaveHeader: string;
      leaveMessage: string;
      leaveConfirm: string;
      impuestosTitle: string;
      impuestosAdd: string;
      itemPlaceholder: string;
      detallePlaceholder: string;
      confirmDeleteLine: string;
      columns: {
        linea: string;
        ref: string;
        item: string;
        cantidad: string;
        precio: string;
        descuento: string;
        subtotal: string;
        impuesto: string;
        neto: string;
        detalle: string;
        acciones: string;
      };
      resumen: {
        subtotal: string;
        descuento: string;
        total: string;
      };
      toasts: {
        lineSaveSuccess: { title: string; desc: string };
        lineSaveError: { title: string; desc: string };
        allSaved: { title: string; desc: string };
        incompleteLines: { title: string; desc: string };
      };
    };
    entrada: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
    };
    salida: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
    };
    traslado: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
    };
    movimientoContable: {
      name: string;
      import: { title: string; subtitle: string };
      columns: {
        id: string;
        numero: string;
        comprobante: string;
        fecha: string;
        contacto: string;
        identificacion: string;
        cuenta: string;
        centroCosto: string;
        debito: string;
        credito: string;
        base: string;
        detalle: string;
      };
    };
    movimientoInventario: {
      form: {
        createHint: string;
        editHint: string;
        fields: {
          contacto: string;
          contactoPlaceholder: string;
          almacen: string;
          almacenPlaceholder: string;
          fecha: string;
          comentario: string;
        };
        validation: { required: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          contacto: string;
          almacen: string;
          fecha: string;
          comentario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
    inventarioDetalle: {
      title: string;
      hint: string;
      empty: string;
      addLine: string;
      removeLine: string;
      saveLine: string;
      saveAll: string;
      pendingSuffix: string;
      leaveHeader: string;
      leaveMessage: string;
      leaveConfirm: string;
      itemPlaceholder: string;
      almacenPlaceholder: string;
      confirmDeleteLine: string;
      columns: {
        linea: string;
        item: string;
        almacen: string;
        operacion: string;
        cantidad: string;
        costo: string;
        total: string;
        acciones: string;
      };
      /** Sentido del movimiento por línea; solo lo usa el traslado. */
      operaciones: {
        suma: string;
        resta: string;
      };
      resumen: {
        cantidad: string;
        subtotal: string;
        total: string;
      };
      toasts: {
        lineSaveSuccess: { title: string; desc: string };
        lineSaveError: { title: string; desc: string };
        allSaved: { title: string; desc: string };
        incompleteLines: { title: string; desc: string };
      };
    };
    cuentaDetalle: {
      empty: string;
      addLine: string;
      removeLine: string;
      saveLine: string;
      saveAll: string;
      pendingSuffix: string;
      cuentaPlaceholder: string;
      contactoPlaceholder: string;
      centroCostoPlaceholder: string;
      detallePlaceholder: string;
      confirmDeleteLine: string;
      naturaleza: { debito: string; credito: string };
      columns: {
        linea: string;
        numero: string;
        documento: string;
        cuenta: string;
        contacto: string;
        naturaleza: string;
        centroCosto: string;
        valor: string;
        base: string;
        detalle: string;
        acciones: string;
      };
      resumen: { debitos: string; creditos: string; total: string; diferencia: string };
      toasts: {
        lineSaveSuccess: { title: string; desc: string };
        lineSaveError: { title: string; desc: string };
        allSaved: { title: string; desc: string };
        incompleteLines: { title: string; desc: string };
      };
    };
    contratoServicio: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        horas: string;
        horasDiurnas: string;
        horasNocturnas: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
    };
    pedidoServicio: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        horas: string;
        horasDiurnas: string;
        horasNocturnas: string;
        subtotal: string;
        impuesto: string;
        total: string;
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
    };
    pendienteFacturar: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        cod: string;
        puesto: string;
        item: string;
        modalidad: string;
        cantidad: string;
        horas: string;
        horasDiurnas: string;
        horasNocturnas: string;
        valor: string;
        total: string;
        afectado: string;
        valorPendiente: string;
      };
    };
    programacion: {
      name: string;
      columns: {
        id: string;
        nombre: string;
        pagoTipo: string;
        grupo: string;
        periodo: string;
        fechaDesde: string;
        fechaHasta: string;
        dias: string;
        contratos: string;
        total: string;
        generado: string;
        aprobado: string;
      };
      estados: { borrador: string; generada: string; aprobada: string };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        conceptosHint: string;
        sections: { conceptos: string };
        fields: {
          pagoTipo: string;
          grupo: string;
          grupoHint: string;
          nombre: string;
          nombrePlaceholder: string;
          fechaDesde: string;
          fechaHasta: string;
          fechaHastaPeriodo: string;
          fechaHastaPeriodoHint: string;
          comentario: string;
          seleccionar: string;
        };
        validation: {
          required: string;
          rangoInvalido: string;
          duracionPeriodo: string;
          duracionEsperada: string;
          duracionActual: string;
        };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
          noEditable: { title: string; desc: string };
        };
      };
      resumen: {
        sinNombre: string;
        conceptos: string;
        sinConceptos: string;
        labels: {
          fechaDesde: string;
          fechaHasta: string;
          contratos: string;
          devengado: string;
          deduccion: string;
          total: string;
          comentario: string;
        };
      };
      workspace: {
        tabs: { renglones: string; adicionales: string };
        renglonesHint: string;
        adicionalesHint: string;
        notFound: { title: string; desc: string };
      };
      editarRenglon: {
        title: string;
        subtitle: string;
        diasTransporte: string;
        salario: string;
        salarioPromedio: string;
        cesantiaPropuesta: string;
        interesPropuesto: string;
        banderasHint: string;
        sections: { horas: string; banderas: string };
        horas: {
          diurna: string;
          nocturna: string;
          festiva_diurna: string;
          festiva_nocturna: string;
          extra_diurna: string;
          extra_nocturna: string;
          extra_festiva_diurna: string;
          extra_festiva_nocturna: string;
          recargo_nocturno: string;
          recargo_festivo_diurno: string;
          recargo_festivo_nocturno: string;
        };
        banderas: {
          pago_horas: string;
          pago_auxilio_transporte: string;
          pago_incapacidad: string;
          pago_licencia: string;
          pago_vacacion: string;
          descuento_salud: string;
          descuento_pension: string;
          descuento_fondo_solidaridad: string;
          descuento_retencion_fuente: string;
          descuento_credito: string;
          descuento_embargo: string;
          adicional: string;
        };
        toasts: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      adicionales: {
        createTitle: string;
        editTitle: string;
        subtitle: string;
        fields: {
          contrato: string;
          contratoPlaceholder: string;
          concepto: string;
          conceptoPlaceholder: string;
          valor: string;
          horas: string;
          horasHint: string;
          detalle: string;
          aplicaDiaLaborado: string;
        };
        validation: { required: string; valorMinimo: string };
        columns: {
          id: string;
          empleado: string;
          concepto: string;
          valor: string;
          horas: string;
          detalle: string;
          aplicaDiaLaborado: string;
        };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
        };
      };
      importarHoras: {
        title: string;
        subtitle: string;
        plantillaNoDisponible: string;
      };
      acciones: {
        generar: string;
        desgenerar: string;
        aprobar: string;
        desaprobar: string;
        notificar: string;
        importarHoras: string;
        imprimir: string;
        imprimirNominas: string;
        exportRenglones: string;
        exportNomina: string;
        exportNominaDetalle: string;
        confirmaciones: {
          generar: { header: string; message: string };
          desgenerar: { header: string; message: string };
          aprobar: { header: string; message: string };
          desaprobar: { header: string; message: string };
          notificar: { header: string; message: string };
        };
        toasts: {
          generar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          desgenerar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          aprobar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          desaprobar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          notificar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
      };
      renglones: {
        cargarContratos: string;
        verNomina: string;
        confirmEliminar: { header: string; message: string };
        confirmRecargar: { header: string; message: string };
        leyenda: { titulo: string; contenido: string };
        toasts: {
          cargarSuccess: { title: string; desc: string };
          cargarError: { title: string; desc: string };
          sinNomina: { title: string; desc: string };
        };
        columns: {
          id: string;
          identificacion: string;
          empleado: string;
          contrato: string;
          desde: string;
          hasta: string;
          salario: string;
          diasTransporte: string;
          dias: string;
          promedio: string;
          basePrestacion: string;
          total: string;
        };
        horas: {
          diurna: string;
          nocturna: string;
          festivaDiurna: string;
          festivaNocturna: string;
          extraDiurna: string;
          extraNocturna: string;
          extraFestivaDiurna: string;
          extraFestivaNocturna: string;
          recargoNocturno: string;
          recargoFestivoDiurno: string;
          recargoFestivoNocturno: string;
        };
      };
      grupos: { pagos: string; descuentos: string; prestaciones: string; base: string };
      banderas: {
        pagoHoras: string;
        pagoAuxilioTransporte: string;
        pagoIncapacidad: string;
        pagoLicencia: string;
        pagoVacacion: string;
        pagoPrima: string;
        pagoCesantia: string;
        pagoInteres: string;
        descuentoSalud: string;
        descuentoPension: string;
        descuentoFondoSolidaridad: string;
        descuentoRetencionFuente: string;
        descuentoCredito: string;
        descuentoEmbargo: string;
        adicional: string;
        basePrestacionMinimo: string;
        basePrestacionMinimoSalario: string;
      };
    };
    liquidacion: {
      name: string;
      columns: {
        id: string;
        contrato: string;
        identificacion: string;
        empleado: string;
        desde: string;
        hasta: string;
        salario: string;
        dias: string;
        cesantia: string;
        interes: string;
        prima: string;
        vacacion: string;
        adicion: string;
        deduccion: string;
        total: string;
        generado: string;
        aprobado: string;
      };
      estados: { borrador: string; generada: string; aprobada: string };
      prestaciones: { cesantia: string; interes: string; prima: string; vacacion: string };
      resumen: {
        sinEmpleado: string;
        prestacionesTitle: string;
        labels: {
          contrato: string;
          fecha: string;
          desde: string;
          hasta: string;
          ultimoPago: string;
          dias: string;
          salario: string;
          prestacion: string;
          valor: string;
          adicion: string;
          deduccion: string;
          total: string;
        };
      };
      workspace: {
        adicionalesHint: string;
        notFound: { title: string; desc: string };
      };
      acciones: {
        generar: string;
        reliquidar: string;
        desgenerar: string;
        aprobar: string;
        desaprobar: string;
        imprimir: string;
        confirmaciones: {
          generar: { header: string; message: string };
          reliquidar: { header: string; message: string };
          desgenerar: { header: string; message: string };
          aprobar: { header: string; message: string };
          desaprobar: { header: string; message: string };
          eliminar: { header: string; message: string };
        };
        toasts: {
          generar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          reliquidar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          desgenerar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          aprobar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          desaprobar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
      };
      adicionales: {
        nuevaAdicion: string;
        nuevaDeduccion: string;
        createAdicionTitle: string;
        createDeduccionTitle: string;
        editTitle: string;
        subtitleAdicion: string;
        subtitleDeduccion: string;
        confirmEliminar: { header: string; message: string };
        fields: {
          concepto: string;
          valor: string;
          detalle: string;
          detallePlaceholder: string;
          seleccionar: string;
        };
        validation: { required: string; valorMinimo: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
        columns: {
          id: string;
          codigo: string;
          concepto: string;
          detalle: string;
          adicional: string;
          deduccion: string;
        };
      };
      toasts: { loadError: { title: string; desc: string } };
    };
    aporte: {
      name: string;
      columns: {
        id: string;
        anio: string;
        mes: string;
        sucursal: string;
        empleados: string;
        contratos: string;
        lineas: string;
        cotizacionTotal: string;
        generado: string;
        aprobado: string;
      };
      estados: { borrador: string; generada: string; aprobada: string };
      presentaciones: { sucursal: string; unica: string };
      cotizaciones: {
        pension: string;
        solidaridad: string;
        subsistencia: string;
        voluntarioAfiliado: string;
        voluntarioAportante: string;
        salud: string;
        riesgos: string;
        caja: string;
        sena: string;
        icbf: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        entidadesTitle: string;
        entidadesHint: string;
        fields: {
          anio: string;
          mes: string;
          sucursal: string;
          presentacion: string;
          presentacionHint: string;
          entidadRiesgo: string;
          entidadSena: string;
          entidadIcbf: string;
          seleccionar: string;
        };
        validation: { required: string; anioRango: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
          noEditable: { title: string; desc: string };
        };
      };
      resumen: {
        cotizacionesTitle: string;
        labels: {
          empleados: string;
          contratos: string;
          lineas: string;
          baseCotizacion: string;
          entidadRiesgo: string;
          entidadSena: string;
          entidadIcbf: string;
          total: string;
        };
      };
      workspace: {
        tabs: { contratos: string; detalles: string; entidades: string };
        contratosHint: string;
        detallesHint: string;
        entidadesHint: string;
        notFound: { title: string; desc: string };
      };
      acciones: {
        generar: string;
        desgenerar: string;
        aprobar: string;
        desaprobar: string;
        planoOperador: string;
        imprimir: string;
        exportContratos: string;
        exportDetalles: string;
        exportEntidades: string;
        confirmaciones: {
          generar: { header: string; message: string };
          desgenerar: { header: string; message: string };
          aprobar: { header: string; message: string };
          desaprobar: { header: string; message: string };
        };
        toasts: {
          generar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          desgenerar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          aprobar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          desaprobar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
      };
      contratos: {
        cargarContratos: string;
        leyenda: { titulo: string; contenido: string };
        confirmEliminar: { header: string; message: string };
        confirmRecargar: { header: string; message: string };
        toasts: {
          cargarSuccess: { title: string; desc: string };
          cargarError: { title: string; desc: string };
        };
        columns: {
          id: string;
          codigo: string;
          identificacion: string;
          empleado: string;
          contrato: string;
          desde: string;
          hasta: string;
          novedad: string;
          baseCotizacion: string;
          dias: string;
          salario: string;
        };
        novedades: {
          ninguna: string;
          ingreso: string;
          retiro: string;
          ingresoRetiro: string;
          error: string;
        };
      };
      trazabilidad: {
        verNominas: string;
        title: string;
        subtitle: string;
        total: string;
        empty: { title: string; sub: string };
        nominas: {
          title: string;
          columns: {
            numero: string;
            desde: string;
            hasta: string;
            salario: string;
            ibc: string;
            ibp: string;
            devengado: string;
            deduccion: string;
            total: string;
          };
        };
        conceptos: {
          title: string;
          empty: string;
          columns: {
            nomina: string;
            concepto: string;
            dias: string;
            horas: string;
            ibc: string;
            ibp: string;
            devengado: string;
            deduccion: string;
          };
        };
      };
      entidades: {
        columns: { tipo: string; entidad: string; cotizacion: string };
        subtotal: string;
        totalGeneral: string;
        empty: { title: string; sub: string };
      };
      detalles: {
        columns: { id: string; empleado: string; contrato: string };
        leyendaTitulo: string;
        /** Valores de las banderas de novedad en la tabla (`Sí` / `—`). */
        novedad: { true: string; false: string };
        /**
         * Encabezados cortos. Son códigos PILA, iguales en los dos idiomas; su
         * significado va en `nombres`, con las mismas claves.
         */
        siglas: AporteDetalleCampos;
        nombres: AporteDetalleCampos;
      };
    };
    nomina: {
      name: string;
      columns: {
        id: string;
        numero: string;
        desde: string;
        hasta: string;
        identificacion: string;
        empleado: string;
        salario: string;
        devengado: string;
        deduccion: string;
        total: string;
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        contabilizado: string;
      };
      detail: {
        sections: { general: string; liquidacion: string; conceptos: string };
        labels: {
          numero: string;
          empleado: string;
          desde: string;
          hasta: string;
          contrato: string;
          programacionDetalle: string;
          comentario: string;
          cue: string;
          verDian: string;
          salario: string;
          basePrestacion: string;
          baseCotizacion: string;
          devengado: string;
          deduccion: string;
          total: string;
        };
        tooltips: { basePrestacion: string; baseCotizacion: string };
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    nominaDetalle: {
      empty: string;
      columns: {
        linea: string;
        codigo: string;
        concepto: string;
        detalle: string;
        credito: string;
        porcentaje: string;
        horas: string;
        dias: string;
        valorHora: string;
        operacion: string;
        devengado: string;
        deduccion: string;
        basePrestacion: string;
        baseCotizacion: string;
        baseImpuesto: string;
      };
      tooltips: {
        credito: string;
        horas: string;
        dias: string;
        basePrestacion: string;
        baseCotizacion: string;
      };
      operaciones: { suma: string; resta: string; neutro: string };
    };
    /** Piezas compartidas por los informes contables de saldos por cuenta. */
    informeCuentas: {
      generar: string;
      descuadre: string;
      params: {
        fechaDesde: string;
        fechaHasta: string;
        cuentaDesde: string;
        cuentaHasta: string;
        cuentaPlaceholder: string;
        contacto: string;
        contactoPlaceholder: string;
        numero: string;
        comprobante: string;
        incluirCierre: string;
        soloConMovimiento: string;
      };
      validation: {
        rangoInvertido: string;
        anioDistinto: string;
      };
      columns: {
        cuenta: string;
        nombre: string;
        identificacion: string;
        contacto: string;
        comprobante: string;
        numero: string;
        fecha: string;
        saldoAnterior: string;
        debito: string;
        credito: string;
        saldoActual: string;
        total: string;
      };
      empty: {
        notGenerated: string;
        noData: string;
      };
    };
    balancePrueba: { name: string };
    balancePruebaContacto: { name: string };
    auxiliarCuenta: { name: string };
    auxiliarGeneral: { name: string };
    auxiliarContacto: { name: string };
    conciliacion: {
      name: string;
      columns: { id: string; fechaDesde: string; fechaHasta: string; cuentaBanco: string };
      detalleColumns: {
        id: string;
        tipo: string;
        numero: string;
        fecha: string;
        cuenta: string;
        debito: string;
        credito: string;
        detalle: string;
        conciliado: string;
      };
      soporteColumns: {
        id: string;
        fecha: string;
        debito: string;
        credito: string;
        detalle: string;
        conciliado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        sectionHint: string;
        tabs: { detalles: string; soporte: string };
        fields: {
          cuentaBanco: string;
          cuentaBancoPlaceholder: string;
          fechaDesde: string;
          fechaHasta: string;
        };
        validation: { required: string; rangoInvalido: string };
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
      };
      detail: {
        sections: { general: string };
        tabs: { detalles: string; soporte: string };
        labels: {
          id: string;
          cuentaBanco: string;
          cuentaContable: string;
          fechaDesde: string;
          fechaHasta: string;
        };
        notFound: { title: string; desc: string };
      };
      detalleTab: {
        cargar: string;
        conciliar: string;
        limpiar: string;
        confirmLimpiar: { header: string; message: string };
        toasts: {
          cargar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          conciliar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
          limpiar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
      };
      soporteTab: {
        cargar: string;
        limpiar: string;
        plantillaNoDisponible: string;
        import: { title: string; subtitle: string };
        confirmLimpiar: { header: string; message: string };
        toasts: {
          limpiar: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
      };
    };
    contabilizar: {
      name: string;
      actions: { contabilizar: string; descontabilizar: string };
      columns: {
        id: string;
        documentoTipo: string;
        numero: string;
        fecha: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
      };
      descontabilizar: {
        title: string;
        subtitle: string;
        submit: string;
        warning: string;
        fields: {
          fechaDesde: string;
          fechaHasta: string;
          numeroDesde: string;
          numeroHasta: string;
          documentoTipo: string;
          documentoTipoPlaceholder: string;
        };
        validation: { rangoInvertido: string };
        toasts: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
          empty: { title: string; desc: string };
          parcial: { title: string; desc: string };
        };
      };
      toasts: {
        contabilizar: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
      };
    };
    estadoFinanciero: {
      columns: {
        clase: string;
        grupo: string;
        cuenta: string;
        cuentaNombre: string;
        saldo: string;
      };
    };
    estadoResultados: { name: string };
    estadoSituacionFinanciera: { name: string };
    certificadoRetencion: {
      name: string;
      columns: {
        identificacion: string;
        contacto: string;
        cuenta: string;
        cuentaNombre: string;
        baseRetenido: string;
        retenido: string;
      };
    };
    informeBase: {
      name: string;
      columns: {
        id: string;
        comprobante: string;
        numero: string;
        fecha: string;
        cuenta: string;
        cuentaNombre: string;
        identificacion: string;
        contacto: string;
        debito: string;
        credito: string;
        base: string;
        detalle: string;
      };
    };
    nominaInforme: {
      name: string;
      columns: {
        id: string;
        numero: string;
        desde: string;
        hasta: string;
        identificacion: string;
        empleado: string;
        salario: string;
        devengado: string;
        deduccion: string;
        total: string;
        aprobado: string;
        anulado: string;
      };
      filters: {
        empleadoIdentificacion: string;
        empleadoNombre: string;
        aprobado: string;
        anulado: string;
      };
    };
    nominaDetalleInforme: {
      name: string;
      columns: {
        id: string;
        documento: string;
        numero: string;
        identificacion: string;
        empleado: string;
        fecha: string;
        fechaDesde: string;
        fechaHasta: string;
        detalle: string;
        porcentaje: string;
        dias: string;
        valorHora: string;
        operacion: string;
        pago: string;
        basePrestacion: string;
        baseCotizacion: string;
      };
      filters: { empleadoIdentificacion: string; empleadoNombre: string };
      /** Claves = valor crudo de `operacion` (1 suma, -1 resta, 0 neutro). */
      operaciones: { '1': string; '0': string; '-1': string };
    };
    nominaElectronica: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        empleado: string;
        baseCotizacion: string;
        basePrestacion: string;
        devengado: string;
        deduccion: string;
        total: string;
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
      filters: {
        aprobado: string;
        anulado: string;
        electronico: string;
        contabilizado: string;
      };
      /** Columnas de la pestaña con las nóminas que componen el consolidado. */
      origen: {
        id: string;
        numero: string;
        desde: string;
        hasta: string;
        identificacion: string;
        empleado: string;
        salario: string;
        devengado: string;
        deduccion: string;
        total: string;
        aprobado: string;
        anulado: string;
      };
      /** Columnas de la pestaña con los conceptos consolidados. */
      detalle: {
        id: string;
        concepto: string;
        baseCotizacion: string;
        basePrestacion: string;
        devengado: string;
        deduccion: string;
        total: string;
      };
      detail: {
        sections: { general: string; montos: string; composicion: string };
        tabs: { origen: string; detalle: string };
        fields: {
          numero: string;
          fecha: string;
          empleado: string;
          identificacion: string;
          baseCotizacion: string;
          basePrestacion: string;
          devengado: string;
          deduccion: string;
          total: string;
          cune: string;
        };
        verEnDian: string;
        sinCune: string;
        emptyOrigen: string;
        emptyDetalle: string;
        notFound: { title: string; desc: string };
      };
      /** Acción "Generar" del toolbar de la lista. */
      generar: {
        buttonLabel: string;
        title: string;
        subtitle: string;
        periodo: string;
        submit: string;
        submitting: string;
        validation: { required: string };
        success: { title: string; desc: string };
        error: { title: string; desc: string };
        emitirAhora: { header: string; message: string; accept: string; reject: string };
      };
    };
    nominaElectronicaInforme: {
      name: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        empleado: string;
        contrato: string;
        salario: string;
        baseCotizacion: string;
        basePrestacion: string;
        devengado: string;
        deduccion: string;
        total: string;
        aprobado: string;
        anulado: string;
        electronico: string;
      };
      filters: {
        fechaHasta: string;
        empleadoIdentificacion: string;
        empleadoNombre: string;
        aprobado: string;
        anulado: string;
        electronico: string;
      };
    };
    existencia: {
      name: string;
      columns: {
        id: string;
        codigo: string;
        nombre: string;
        referencia: string;
        existencia: string;
        remision: string;
        disponible: string;
      };
    };
    existenciaAlmacen: {
      name: string;
      columns: {
        id: string;
        item: string;
        almacen: string;
        existencia: string;
        remision: string;
        disponible: string;
      };
    };
    inventarioValorizado: {
      name: string;
      columns: {
        id: string;
        codigo: string;
        nombre: string;
        referencia: string;
        existencia: string;
        remision: string;
        disponible: string;
        costoPromedio: string;
        costoTotal: string;
      };
    };
    historialMovimiento: {
      name: string;
      columns: {
        id: string;
        numero: string;
        documentoTipo: string;
        fecha: string;
        contacto: string;
        item: string;
        cantidad: string;
        costo: string;
        precio: string;
        subtotal: string;
      };
    };
    ventaItem: {
      name: string;
      columns: {
        id: string;
        documentoTipo: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        itemId: string;
        item: string;
        cantidad: string;
        precio: string;
        subtotal: string;
        impuesto: string;
        total: string;
      };
    };
    cuentaCobrar: {
      name: string;
      columns: {
        id: string;
        documentoTipo: string;
        numero: string;
        fecha: string;
        fechaVence: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        afectado: string;
        pendiente: string;
      };
    };
    cuentaCobrarCorte: {
      name: string;
      fechaCorte: string;
      generar: string;
      empty: { title: string; sub: string };
      columns: {
        id: string;
        documentoTipo: string;
        numero: string;
        fecha: string;
        fechaVence: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        saldo: string;
      };
    };
    cuentaPagar: {
      name: string;
      columns: {
        id: string;
        documentoTipo: string;
        numero: string;
        fecha: string;
        fechaVence: string;
        identificacion: string;
        contacto: string;
        subtotal: string;
        impuesto: string;
        total: string;
        afectado: string;
        pendiente: string;
      };
    };
    eventosDian: {
      name: string;
      subtitle: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        codigo: string;
        identificacion: string;
        proveedor: string;
        referenciaPrefijo: string;
        referenciaNumero: string;
        total: string;
        electronico: string;
        documento: string;
        recepcion: string;
        aceptacion: string;
      };
      eventoEstado: {
        PE: string;
        RZ: string;
        RC: string;
        AC: string;
        RM: string;
        EM: string;
        none: string;
      };
      actions: {
        editar: string;
        emitir: string;
        gestionar: string;
        descartar: string;
      };
      descartar: {
        confirm: {
          header: string;
          message: string;
          accept: string;
        };
      };
      editar: {
        title: string;
        subtitle: string;
        fields: {
          prefijo: string;
          numero: string;
          cue: string;
        };
        save: string;
      };
      gestion: {
        subtitle: string;
        hint: string;
        steps: {
          recibirDocumento: { title: string; button: string };
          recibirBien: { title: string; button: string };
          aceptar: { title: string; button: string };
        };
        fields: {
          nombre: string;
          apellido: string;
          identificacion: string;
          numeroIdentificacion: string;
          cargo: string;
          area: string;
        };
        validation: { required: string };
      };
      importar: {
        action: string;
        title: string;
        steps: {
          archivo: { label: string; desc: string };
          proveedor: { label: string; desc: string };
          confirmar: { label: string; desc: string };
        };
        archivo: {
          dropTitle: string;
          dropHint: string;
          importButton: string;
        };
        proveedor: {
          warning: string;
          fields: {
            identificacion: string;
            numeroIdentificacion: string;
            nombreCorto: string;
            ciudad: string;
            direccion: string;
            correo: string;
            plazoPago: string;
          };
          save: string;
        };
        confirmar: {
          grupo: string;
          formaPago: string;
          almacen: string;
          create: string;
          resumen: {
            contacto: string;
            identificacion: string;
            numero: string;
            prefijo: string;
            fecha: string;
            vence: string;
            cue: string;
            comentario: string;
          };
          detalles: {
            item: string;
            cantidad: string;
            precio: string;
            total: string;
            empty: string;
          };
        };
        validation: { required: string };
        errors: { read: string; parse: string };
        toasts: {
          proveedor: { error: { title: string; desc: string } };
          factura: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
      };
      toasts: {
        emitir: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
        descartar: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
        editar: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
        gestion: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
      };
    };
    documentoElectronico: {
      name: string;
      subtitle: string;
      actions: {
        emitir: string;
      };
      columns: {
        id: string;
        documentoTipo: string;
        numero: string;
        fecha: string;
        cliente: string;
        total: string;
        estado: string;
      };
      estado: {
        enviado: string;
        pendiente: string;
      };
      filters: {
        notificado: string;
        enviado: string;
      };
      toasts: {
        emitir: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
      };
    };
    enviarFacturaElectronica: {
      name: string;
      subtitle: string;
      tabs: {
        emitir: string;
        notificar: string;
      };
      actions: {
        emitir: string;
        notificar: string;
        descartar: string;
      };
      columns: {
        id: string;
        numero: string;
        fecha: string;
        cliente: string;
        total: string;
        estado: string;
      };
      estado: {
        descartado: string;
        enviado: string;
        pendiente: string;
      };
      filters: {
        notificado: string;
        enviado: string;
      };
      descartar: {
        confirm: {
          header: string;
          message: string;
          accept: string;
        };
      };
      toasts: {
        emitir: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
        notificar: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
        descartar: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
      };
    };
    enviarNominaElectronica: {
      name: string;
      actions: {
        emitir: string;
        descartar: string;
      };
      columns: {
        id: string;
        numero: string;
        fecha: string;
        empleado: string;
        total: string;
        estado: string;
      };
      estado: {
        enviado: string;
        pendiente: string;
      };
      filters: {
        notificado: string;
        enviado: string;
      };
      descartar: {
        confirm: {
          header: string;
          message: string;
          accept: string;
        };
      };
      toasts: {
        emitir: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
        descartar: {
          success: { title: string; desc: string };
          error: { title: string; desc: string };
        };
      };
    };
    regenerarAfectado: {
      name: string;
      description: string;
      run: string;
      confirm: {
        header: string;
        message: string;
        accept: string;
        cancel: string;
      };
      result: {
        successTitle: string;
        successDesc: string;
        updatedLabel: string;
        viewReport: string;
      };
      toasts: {
        success: { title: string; desc: string };
        error: { title: string; desc: string };
      };
    };
    servicioDocumento: {
      form: {
        createTitle: string;
        createSubtitle: string;
        editTitle: string;
        editSubtitle: string;
        section: string;
        sectionHint: string;
        sectorLockedHint: string;
        contactoLockedHint: string;
        fields: {
          contacto: string;
          contactoPlaceholder: string;
          fecha: string;
          sector: string;
          sectorPlaceholder: string;
          estrato: string;
          estratoPlaceholder: string;
          salario: string;
        };
        validation: { required: string };
        submitCreate: string;
        submitEdit: string;
        cancel: string;
        toasts: {
          createSuccess: { title: string; desc: string };
          createError: { title: string; desc: string };
          editSuccess: { title: string; desc: string };
          editError: { title: string; desc: string };
          loadError: { title: string; desc: string };
        };
        detalles: {
          title: string;
          hint: string;
          empty: string;
          addLine: string;
          editLine: string;
          removeLine: string;
          lineLabel: string;
          coverage: string;
          subtotalCol: string;
          documentoAfectadoCol: string;
          contractSummaryTitle: string;
          contractSubtotal: string;
          contractTotal: string;
          yes: string;
          no: string;
          modalCreateTitle: string;
          modalEditTitle: string;
          modalSubtitle: string;
          modalAdd: string;
          modalSave: string;
          confirmDeleteLine: string;
          fields: {
            item: string;
            itemPlaceholder: string;
            puesto: string;
            puestoPlaceholder: string;
            cantidad: string;
            precio: string;
            periodo: string;
            desde: string;
            hasta: string;
            horario: string;
            dias: string;
            diasSemana: string[];
            festivo: string;
            modalidad: string;
            modalidadPlaceholder: string;
            salario: string;
            programar: string;
            programarHint: string;
            cortesia: string;
            cortesiaHint: string;
            compuesto: string;
            horas: string;
            horasFull: string;
            horasDiurnas: string;
            horasDiurnasFull: string;
            horasNocturnas: string;
            horasNocturnasFull: string;
            impuestos: string;
            impuestosPlaceholder: string;
          };
          lockedCobertura: {
            title: string;
            hint: string;
          };
          contactoRequired: string;
          sectorRequired: string;
          estratoRequired: string;
          salarioRequired: string;
          summary: {
            title: string;
            subtotal: string;
            total: string;
          };
          calc: {
            title: string;
            dias: string;
            diurna: string;
            nocturna: string;
            horasDia: string;
            valorHora: string;
            precioMinimo: string;
            definirPrecio: string;
            calculating: string;
            empty: string;
          };
          validation: { required: string };
          toasts: {
            lineSaveSuccess: { title: string; desc: string };
            lineSaveError: { title: string; desc: string };
          };
        };
      };
      detail: {
        sections: { general: string; detalles: string };
        labels: {
          numero: string;
          contacto: string;
          fecha: string;
          sector: string;
          estrato: string;
          salario: string;
        };
        notFound: { title: string; desc: string };
      };
    };
  };
  seguridad: {
    title: string;
    menu: { usuarios: string };
    usuarios: {
      searchPlaceholder: string;
      columns: { nombre: string; correo: string; rol: string };
      roles: { propietario: string; administrador: string; usuario: string };
      actions: { invitar: string; cambiarRol: string };
      empty: { title: string; sub: string };
      invitar: {
        title: string;
        subtitle: string;
        fields: {
          usuario: string;
          usuarioPlaceholder: string;
          usuarioHint: string;
          rol: string;
          grupos: string;
          gruposPlaceholder: string;
          gruposHint: string;
          gruposEmpty: string;
        };
        submit: string;
      };
      cambiarRol: { title: string; field: string; hint: string; propietarioLock: string };
      detalle: {
        eyebrow: string;
        tabs: { grupos: string; permisos: string };
        fields: { usuarioId: string };
        rolHint: string;
        notFound: { title: string; desc: string };
        propietario: { title: string; desc: string };
        grupos: {
          count: { zero: string; one: string; other: string };
          emptyCatalog: string;
          hint: string;
        };
        permisos: {
          flags: { superuser: string; staff: string };
          empty: string;
          hint: string;
        };
      };
      confirms: { deleteHeader: string; deleteOne: string; deleteMany: string };
      toasts: {
        loadError: { title: string; desc: string };
        deleteSuccess: { title: string; desc: string };
        deleteError: { title: string; desc: string };
        inviteSuccess: { title: string; desc: string };
        inviteError: { title: string; desc: string };
        rolSuccess: { title: string; desc: string };
        rolError: { title: string; desc: string };
      };
    };
  };
  configuracion: {
    title: string;
    subtitle: string;
    tabs: { general: string; humano: string };
    unsavedChanges: string;
    actions: { save: string };
    general: {
      uvt: { title: string; hint: string; label: string };
      validation: { required: string };
    };
    humano: {
      section: { title: string; hint: string };
      fields: { salarioMinimo: string; factor: string; auxilioTransporte: string };
      validation: { required: string };
    };
    empresa: {
      sections: {
        identidad: { title: string; hint: string };
        contacto: { title: string; hint: string };
      };
      fields: {
        nombreCorto: string;
        tipoPersona: string;
        identificacion: string;
        numeroIdentificacion: string;
        digitoVerificacion: string;
        direccion: string;
        ciudad: string;
        telefono: string;
        correo: string;
      };
      validation: { required: string; emailInvalid: string };
    };
    toasts: {
      saveSuccess: { title: string; desc: string };
      saveError: { title: string; desc: string };
      loadError: { title: string; desc: string };
    };
  };
}
