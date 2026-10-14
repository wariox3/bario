import { contenedoresEn } from '@reddoc/feature-contenedores/i18n';
import { accesosContenedorEn, appSwitcherEn, authEn, phoneInputEn } from '@reddoc/ui';
import type { AppDict } from './app.dict';

export const en: AppDict = {
  auth: authEn,
  appSwitcher: appSwitcherEn,
  phoneInput: phoneInputEn,
  contenedores: contenedoresEn,
  accesosContenedor: accesosContenedorEn,
  layout: {
    menuLabel: 'Open menu',
    drawerHeader: 'Menu',
    tenantBadge: {
      ariaLabel: 'Current company',
    },
    nav: {
      caja: 'Register',
      historial: 'History',
      configuracion: 'Settings',
    },
    userMenu: {
      label: 'User menu',
      myContainers: 'My containers',
      manageAccount: 'Manage account',
      settings: 'Settings',
      logout: 'Sign out',
    },
  },
  proximamente: {
    desc: 'This section is under construction.',
  },
  caja: {
    title: 'Register',
    configuracion: {
      title: 'Setup required',
      desc: 'Before selling, choose the document type, warehouse and cash account for this register.',
      accion: 'Go to settings',
    },
    buscador: {
      modo: 'Search by',
      porNombre: 'Name',
      porCodigo: 'Code',
      placeholderNombre: 'Search by name or code',
      placeholderCodigo: 'Scan or type the code and press Enter',
      limpiar: 'Clear search',
    },
    producto: {
      agregar: 'Add to sale',
      enVenta: 'In the sale',
      disponibles: 'available',
      agotado: 'Out of stock',
      marcarFavorito: 'Mark as favorite',
      quitarFavorito: 'Remove from favorites',
    },
    estados: {
      error: 'Products could not be loaded.',
      reintentar: 'Retry',
      sinProductos: 'No products to sell',
      sinProductosDesc: 'Items marked for sale in the ERP show up here.',
      sinResultados: 'No results',
      sinResultadosDesc: 'No product matches the search.',
      cargarMas: 'Load more',
    },
    toasts: {
      favoritoError: {
        title: 'Favorite could not be updated',
        desc: 'The product was left unchanged.',
      },
      sinStock: {
        title: 'Not enough stock',
        desc: 'The sale already has every available unit of this product.',
      },
      agregarError: {
        title: 'The product could not be added',
        desc: 'Check the connection and try again.',
      },
      codigoNoEncontrado: {
        title: 'Code not found',
        desc: 'No sale product has that code.',
      },
    },
    tabs: {
      label: 'Open sales',
      nueva: 'New sale',
      opciones: 'Sale options',
      renombrar: 'Rename',
      nombre: 'Sale name',
      guardar: 'Save',
      cerrar: 'Close sale',
      confirmarCierre: {
        header: 'Close sale',
        message: 'The sale has products. Closing it discards them.',
        aceptar: 'Close sale',
      },
    },
    carrito: {
      prefijoVenta: 'Sale',
      cliente: 'Customer',
      clientePlaceholder: 'Search customer…',
      vacio: 'The sale is empty',
      vacioDesc: 'Tap a product or scan its code to add it.',
      cancelar: 'Cancel',
      cobrar: 'Charge',
      cobrarProximamente: 'Charging arrives in the next phase.',
      resumen: {
        productos: 'Products',
        cantidad: 'Quantity',
        subtotal: 'Subtotal',
        total: 'Total',
      },
      vaciar: {
        boton: 'Clear',
        header: 'Clear sale',
        message: 'Every product is removed from this sale.',
        aceptar: 'Clear',
      },
      linea: {
        editar: 'Edit line',
        retirar: 'Remove',
        cantidad: 'Quantity',
        sumar: 'Add one unit',
        restar: 'Remove one unit',
        precioEditado: 'Edited price',
      },
      editar: {
        title: 'Edit line',
        precio: 'Unit price',
        precioMin: 'The price cannot be negative.',
        cantidad: 'Quantity',
        cantidadMin: 'The minimum quantity is 1.',
        cantidadMax: 'Exceeds available stock',
        cancelar: 'Cancel',
        guardar: 'Save',
      },
    },
  },
  configuracion: {
    title: 'Register settings',
    subtitle: 'Stored on this device: each register has its own.',
    documento: {
      title: 'Document type',
      hint: 'Which document this register invoices with.',
    },
    tipos: {
      pos: 'POS invoice',
      posElectronica: 'Electronic POS invoice',
    },
    operacion: {
      title: 'Operation',
      hint: 'Where goods come from and where money goes.',
    },
    campos: {
      almacen: 'Warehouse',
      cuentaEfectivo: 'Cash account',
      cuentaEfectivoHint: 'Account where cash payments are recorded.',
      sede: 'Branch',
      asesor: 'Default advisor',
    },
    sinGuardar: 'Unsaved changes',
    guardar: 'Save',
    toasts: {
      guardada: {
        title: 'Settings saved',
        desc: 'The register now uses the new settings.',
      },
    },
  },
};
