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
  modules: {
    turno: { name: string };
  };
  entities: {
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
    prototipo: {
      name: string;
      columns: {
        id: string;
        documento: string;
        puesto: string;
        contrato: string;
        secuencia: string;
        fechaInicio: string;
        posicion: string;
      };
      detail: {
        eyebrow: string;
        sections: { general: string; asignacion: string };
        fields: {
          documento: string;
          tipo: string;
          documentoFecha: string;
          puesto: string;
          fecha: string;
          contrato: string;
          secuencia: string;
          fechaInicio: string;
          posicion: string;
        };
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
          /** Abreviatura del `documento_detalle_id` en la banda de grupo (`DET: 382`). */
          documentoDetalleAbrev: string;
          stats: {
            diurnas: string;
            nocturnas: string;
            total: string;
          };
          empty: string;
          verEmpleados: string;
          /** Botón que abre el modal de prototipo (generar turnos automáticamente). */
          prototipo: string;
          editar: string;
          editarContrato: string;
          editarPuesto: string;
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
        /** Modal para editar la programación de todos los contratos de un puesto. */
        programacionPuestoModal: {
          editTitle: string;
          diasSection: string;
          diaAria: string;
          aplicar: string;
          close: string;
          toasts: {
            success: { title: string; desc: string };
            error: { title: string; desc: string };
          };
        };
        /** Modal de prototipo (base para simular/generar turnos del puesto). */
        prototipoModal: {
          title: string;
          /** Etiquetas del encabezado con el contexto del puesto. */
          codigoLabel: string;
          clienteLabel: string;
          puestoLabel: string;
          detalleAfectadoLabel: string;
          sinAfectadoCorto: string;
          /** Selector de período (mes/año) de la barra de acciones, para simular. */
          periodoLabel: string;
          /** Columnas de la tabla editable. */
          columns: {
            contrato: string;
            secuencia: string;
            fechaInicio: string;
            posicion: string;
          };
          contratoPlaceholder: string;
          secuenciaPlaceholder: string;
          seleccionarTodo: string;
          seleccionarFila: string;
          /** Estado vacío (sin filas) y mientras carga la lista. */
          empty: string;
          cargando: string;
          /** Acciones. */
          nuevo: string;
          guardar: string;
          eliminar: string;
          /** Simular (preview) y generar (materializar) los turnos del prototipo. */
          simular: string;
          /** Limpiar la simulación (borra la vista previa en el backend). */
          limpiar: string;
          generar: string;
          /** Avisos de validación / sin cambios. */
          validacion: string;
          sinCambios: string;
          /** El puesto no tiene documento afectado: no se puede guardar/simular el prototipo. */
          sinAfectado: string;
          /** Indicador de cambios sin guardar + confirmación al cerrar con cambios. */
          sinGuardar: string;
          descartar: { header: string; message: string; aceptar: string };
          /** Tabla de vista previa (simulación): año/mes/código/empleado + días. */
          preview: {
            title: string;
            anio: string;
            mes: string;
            codigo: string;
            empleado: string;
            empty: string;
          };
          toasts: {
            saveSuccess: { title: string; desc: string };
            saveError: { title: string; desc: string };
            deleteSuccess: { title: string; desc: string };
            deleteError: { title: string; desc: string };
            generarSuccess: { title: string; desc: string };
            generarError: { title: string; desc: string };
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
