import type { AuthTranslationsHost } from '@reddoc/ui';

export interface AppDict extends AuthTranslationsHost {
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
    afectacion: {
      title: string;
      subtitle: string;
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
      empty: string;
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
  modules: {
    general: { name: string };
    compra: { name: string };
    venta: { name: string };
    inventario: { name: string };
    turno: { name: string };
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
    puesto: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        contacto: string;
        contactoNombre: string;
        nombre: string;
        direccion: string;
        celular: string;
        centroCosto: string;
        centroCostoNombre: string;
        ciudadNombre: string;
        latitud: string;
        longitud: string;
        comentario: string;
        estado: string;
      };
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
        fields: {
          nombre: string;
          direccion: string;
          celular: string;
          latitud: string;
          longitud: string;
          comentario: string;
          ciudad: string;
          ciudadPlaceholder: string;
          contacto: string;
          contactoPlaceholder: string;
          centroCosto: string;
          centroCostoPlaceholder: string;
          programador: string;
          programadorPlaceholder: string;
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
        sections: { ubicacion: string; relaciones: string; comentario: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    programador: {
      name: string;
      searchPlaceholder: string;
      columns: { id: string; nombre: string; estado: string };
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
        fields: { nombre: string };
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
    secuencia: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        codigo: string;
        nombre: string;
        horas: string;
        dias: string;
        homologar: string;
        estado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        cancel: string;
        submitCreate: string;
        submitEdit: string;
        sections: { principal: string; diasMes: string; diasSemana: string };
        sectionsHint: { principal: string; diasMes: string; diasSemana: string };
        fields: {
          codigo: string;
          nombre: string;
          horas: string;
          dias: string;
          homologar: string;
          lunes: string;
          martes: string;
          miercoles: string;
          jueves: string;
          viernes: string;
          sabado: string;
          domingo: string;
          festivo: string;
          domingoFestivo: string;
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
        sections: { principal: string; diasMes: string; diasSemana: string };
        toasts: { loadError: { title: string; desc: string } };
      };
    };
    soporte: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        fechaDesde: string;
        fechaHasta: string;
        fechaHastaPeriodo: string;
        grupo: string;
      };
    };
    programacion: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        numero: string;
        fecha: string;
        identificacion: string;
        contacto: string;
        horas: string;
        horasDiurnas: string;
        horasNocturnas: string;
      };
      detail: {
        notFound: {
          title: string;
          desc: string;
        };
        sections: {
          general: string;
          detalle: string;
        };
        labels: {
          numero: string;
          fecha: string;
          identificacion: string;
          contacto: string;
          horas: string;
          horasDiurnas: string;
          horasNocturnas: string;
        };
        /** Resumen de horas del documento (contratadas / programadas) en la cabecera. */
        resumen: {
          horas: string;
          diurnas: string;
          nocturnas: string;
          leyenda: string;
        };
        grid: {
          headers: {
            empleado: string;
            hd: string;
            hn: string;
            c: string;
            a: string;
          };
          /** Abreviatura del contrato en la meta-línea bajo el nombre (`Cont. 2`). */
          contratoAbrev: string;
          stats: {
            diurnas: string;
            nocturnas: string;
            total: string;
          };
          empty: string;
          verEmpleados: string;
          editar: string;
          editarContrato: string;
          eliminar: string;
          /** Barra contextual de selección de filas (borrado masivo). */
          seleccion: {
            contador: string;
            eliminar: string;
            limpiar: string;
            todo: string;
            fila: string;
          };
        };
        eliminar: {
          confirmHeader: string;
          confirmMessage: string;
          confirmMasivoHeader: string;
          /** Mensaje con `{n}` = cantidad de líneas seleccionadas. */
          confirmMasivoMessage: string;
          toasts: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
        programacionModal: {
          title: string;
          editTitle: string;
          subtitle: string;
          placeholder: string;
          contratoLabel: string;
          contratoPlaceholder: string;
          secuenciaLabel: string;
          secuenciaPlaceholder: string;
          secuenciaCalcular: string;
          posicionLabel: string;
          diasSection: string;
          cargandoDias: string;
          diaAria: string;
          conflictoDia: string;
          conflictoAviso: string;
          aplicar: string;
          close: string;
          toasts: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
      };
    };
    turno: {
      name: string;
      searchPlaceholder: string;
      columns: {
        id: string;
        codigo: string;
        nombre: string;
        horaInicio: string;
        horaFin: string;
        horas: string;
        horasDiurnas: string;
        horasNocturnas: string;
        color: string;
        descanso: string;
        estado: string;
      };
      form: {
        createTitle: string;
        editTitle: string;
        createSubtitle: string;
        editSubtitle: string;
        fields: {
          codigo: string;
          nombre: string;
          horaInicio: string;
          horaFin: string;
          horas: string;
          horasDiurnas: string;
          horasNocturnas: string;
          color: string;
          novedadTipo: string;
          novedadTipoPlaceholder: string;
          descanso: string;
          estadoInactivo: string;
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
        sections: { principal: string };
        activo: string;
        toasts: { loadError: { title: string; desc: string } };
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
    regenerarHoras: {
      name: string;
      description: string;
      periodoLabel: string;
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
  contenedores: {
    list: {
      title: string;
      subtitle: string;
      newButton: string;
      searchPlaceholder: string;
      enter: string;
      status: { active: string; inactive: string };
      summary: {
        containers: { one: string; other: string };
        active: { one: string; other: string };
      };
      actions: {
        menuLabel: string;
        invite: string;
        edit: string;
        updateSubscription: string;
        delete: string;
      };
      view: {
        list: string;
        grid: string;
      };
      empty: {
        noResults: { title: string; sub: string };
        noContenedores: { title: string; sub: string; cta: string };
      };
      expired: {
        badge: string;
        ownerCta: string;
        memberLocked: string;
      };
    };
    create: {
      title: string;
      subtitle: string;
      fields: {
        name: string;
        namePlaceholder: string;
        phone: string;
        phonePlaceholder: string;
        email: string;
        emailPlaceholder: string;
      };
      validation: {
        nameRequired: string;
        nameMin2: string;
        phoneRequired: string;
        phoneMax20: string;
        emailRequired: string;
        emailInvalid: string;
      };
      submit: string;
      cancel: string;
      toasts: {
        success: { title: string; desc: string };
        error: { title: string; desc: string };
      };
    };
    edit: {
      title: string;
      subtitle: string;
      submit: string;
      cancel: string;
      toasts: {
        success: { title: string; desc: string };
        error: { title: string; desc: string };
      };
    };
    delete: {
      title: string;
      subtitle: string;
      warning: string;
      containerLabel: string;
      confirmLabel: string;
      confirmError: string;
      submit: string;
      cancel: string;
      toasts: {
        success: { title: string; desc: string };
        error: { title: string; desc: string };
      };
    };
    invite: {
      title: string;
      subtitle: string;
      tabs: { members: string; pending: string };
      form: {
        label: string;
        placeholder: string;
        invalid: string;
        submit: string;
        sending: string;
      };
      pending: {
        estados: { P: string; A: string; R: string };
        count: { one: string; other: string };
        empty: { title: string; sub: string };
        toasts: { loadError: { title: string; desc: string } };
      };
      members: {
        title: string;
        count: { one: string; other: string };
        empty: { title: string; sub: string };
        you: string;
        roles: {
          propietario: string;
          administrador: string;
          usuario: string;
        };
        removeAria: string;
      };
      remove: {
        title: string;
        desc: string;
        confirm: string;
        cancel: string;
      };
      close: string;
      toasts: {
        sent: { title: string; desc: string };
        sendError: { title: string; desc: string };
        removed: { title: string; desc: string };
        removeError: { title: string; desc: string };
        loadError: { title: string; desc: string };
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
  turnoInicio: {
    title: string;
    subtitle: string;
    loading: string;
    error: string;
    empty: string;
    kpis: {
      horasPlaneadas: string;
      horasEjecutadas: string;
      cumplimiento: string;
      desviacion: string;
    };
    charts: {
      jornada: string;
      tendencia: string;
    };
    series: {
      planeadas: string;
      ejecutadas: string;
      diurnas: string;
      nocturnas: string;
    };
    ranges: {
      esteMes: string;
      mesPasado: string;
      ultimosTresMeses: string;
      esteAnio: string;
    };
  };
}
