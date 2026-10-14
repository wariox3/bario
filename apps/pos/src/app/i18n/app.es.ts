import { contenedoresEs } from '@reddoc/feature-contenedores/i18n';
import { accesosContenedorEs, appSwitcherEs, authEs, phoneInputEs } from '@reddoc/ui';
import type { AppDict } from './app.dict';

export const es: AppDict = {
  auth: authEs,
  appSwitcher: appSwitcherEs,
  phoneInput: phoneInputEs,
  contenedores: contenedoresEs,
  accesosContenedor: accesosContenedorEs,
  layout: {
    menuLabel: 'Abrir menú',
    drawerHeader: 'Menú',
    tenantBadge: {
      ariaLabel: 'Empresa actual',
    },
    nav: {
      caja: 'Caja',
      historial: 'Historial',
      configuracion: 'Configuración',
    },
    userMenu: {
      label: 'Menú de usuario',
      myContainers: 'Mis contenedores',
      manageAccount: 'Gestionar cuenta',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
    },
  },
  proximamente: {
    desc: 'Esta sección está en construcción.',
  },
  caja: {
    title: 'Caja',
    configuracion: {
      title: 'Configuración requerida',
      desc: 'Antes de vender, elige el tipo de documento, el almacén y la cuenta de efectivo de esta caja.',
      accion: 'Ir a configuración',
    },
    buscador: {
      modo: 'Buscar por',
      porNombre: 'Nombre',
      porCodigo: 'Código',
      placeholderNombre: 'Buscar por nombre o código',
      placeholderCodigo: 'Escanea o escribe el código y presiona Enter',
      limpiar: 'Limpiar búsqueda',
    },
    producto: {
      disponibles: 'disponibles',
      agotado: 'Agotado',
      marcarFavorito: 'Marcar como favorito',
      quitarFavorito: 'Quitar de favoritos',
    },
    estados: {
      error: 'No se pudieron cargar los productos.',
      reintentar: 'Reintentar',
      sinProductos: 'No hay productos para vender',
      sinProductosDesc: 'Los ítems marcados para venta en el ERP aparecen aquí.',
      sinResultados: 'Sin resultados',
      sinResultadosDesc: 'Ningún producto coincide con la búsqueda.',
      cargarMas: 'Cargar más',
    },
    toasts: {
      favoritoError: {
        title: 'No se pudo actualizar el favorito',
        desc: 'El producto quedó como estaba.',
      },
    },
  },
  configuracion: {
    title: 'Configuración de la caja',
    subtitle: 'Se guarda en este dispositivo: cada caja tiene la suya.',
    documento: {
      title: 'Tipo de documento',
      hint: 'Con qué documento factura esta caja.',
    },
    tipos: {
      pos: 'Factura POS',
      posElectronica: 'Factura POS electrónica',
    },
    operacion: {
      title: 'Operación',
      hint: 'De dónde sale la mercancía y a dónde entra el dinero.',
    },
    campos: {
      almacen: 'Almacén',
      cuentaEfectivo: 'Cuenta de efectivo',
      cuentaEfectivoHint: 'Cuenta donde se registran los cobros en efectivo.',
      sede: 'Sede',
      asesor: 'Asesor por defecto',
    },
    sinGuardar: 'Cambios sin guardar',
    guardar: 'Guardar',
    toasts: {
      guardada: {
        title: 'Configuración guardada',
        desc: 'La caja ya usa la nueva configuración.',
      },
    },
  },
};
