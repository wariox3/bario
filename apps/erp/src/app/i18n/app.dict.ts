import type { ContenedoresTranslationsHost } from '@reddoc/feature-contenedores/i18n';
import type { AppSwitcherTranslationsHost, AuthTranslationsHost } from '@reddoc/ui';

export interface AppDict
  extends AuthTranslationsHost, AppSwitcherTranslationsHost, ContenedoresTranslationsHost {
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
      confirmAprobar: { message: string; header: string };
      confirmDesaprobar: { message: string; header: string };
      toasts: {
        aprobarSuccess: { title: string; desc: string };
        aprobarError: { title: string; desc: string };
        desaprobarSuccess: { title: string; desc: string };
        desaprobarError: { title: string; desc: string };
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
      detail: {
        eyebrow: string;
        sections: { datos: string; remuneracion: string; seguridadSocial: string };
        estado: { activo: string; terminado: string };
        boolean: { si: string; no: string };
        notFound: { title: string; desc: string };
        toasts: { loadError: { title: string; desc: string } };
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
      confirmDeleteLine: string;
      naturaleza: { debito: string; credito: string };
      columns: {
        linea: string;
        documento: string;
        cuenta: string;
        contacto: string;
        naturaleza: string;
        centroCosto: string;
        valor: string;
        base: string;
        acciones: string;
      };
      resumen: { debitos: string; creditos: string; total: string };
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
