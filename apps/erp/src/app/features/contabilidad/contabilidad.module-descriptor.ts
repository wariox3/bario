import type { ErpModuleDescriptor } from '@erp/core/erp-modules';
import { MODELO } from '@erp/core/permissions/modelo.catalog';

/**
 * Descriptor del módulo Contabilidad para la capa de navegación.
 *
 * Los `path` del menú son **relativos al módulo** — el `WorkspaceLayout` les
 * prepende `/t/<slug>/contabilidad/`. Sumar entradas cuando se implementen más
 * masters/documentos.
 */
export const CONTABILIDAD_MODULE: ErpModuleDescriptor = {
  id: 'contabilidad',
  accessFlag: 'acceso_contabilidad',
  displayNameKey: 'modules.contabilidad.name',
  iconClass: 'pi pi-calculator',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'contabilidad-movimientos',
      labelKey: 'layout.nav.sections.movement',
      iconClass: 'pi pi-arrow-right-arrow-left',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.movimientoContable.name',
              path: 'movimientos',
              activeMatch: 'movimientos',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'contabilidad-documentos',
      labelKey: 'layout.nav.sections.document',
      iconClass: 'pi pi-file',
      defaultExpanded: true,
      groups: [
        {
          items: [
            { labelKey: 'entities.asiento.name', path: 'asiento/list', activeMatch: 'asiento' },
            {
              labelKey: 'entities.depreciacion.name',
              path: 'depreciacion/list',
              activeMatch: 'depreciacion',
            },
            { labelKey: 'entities.cierre.name', path: 'cierre/list', activeMatch: 'cierre' },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'contabilidad-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.contacto.name',
              path: 'contactos',
              modelo: MODELO.general.contacto,
            },
            {
              labelKey: 'entities.cuenta.name',
              path: 'cuentas',
              modelo: MODELO.contabilidad.cuenta,
            },
            {
              labelKey: 'entities.centroCosto.name',
              path: 'centros-costo',
              modelo: MODELO.contabilidad.centroCosto,
            },
            {
              labelKey: 'entities.activo.name',
              path: 'activos',
              modelo: MODELO.contabilidad.activo,
            },
            {
              labelKey: 'entities.periodo.name',
              path: 'periodo/anio',
              // La ruta es `periodo`; el menú entra por su subruta de años.
              activeMatch: 'periodo',
              modelo: MODELO.contabilidad.periodo,
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'contabilidad-utilidades',
      labelKey: 'layout.nav.sections.utility',
      iconClass: 'pi pi-bolt',
      defaultExpanded: false,
      groups: [
        {
          items: [
            { labelKey: 'entities.contabilizar.name', path: 'utilidades/contabilizar' },
            {
              labelKey: 'entities.conciliacion.name',
              path: 'utilidades/conciliacion',
              activeMatch: 'utilidades/conciliacion',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'contabilidad-informes',
      labelKey: 'layout.nav.sections.report',
      iconClass: 'pi pi-chart-bar',
      defaultExpanded: false,
      groups: [
        {
          items: [
            { labelKey: 'entities.balancePrueba.name', path: 'informes/balance-prueba' },
            {
              labelKey: 'entities.balancePruebaContacto.name',
              path: 'informes/balance-prueba-contacto',
            },
            { labelKey: 'entities.auxiliarCuenta.name', path: 'informes/auxiliar-cuenta' },
            { labelKey: 'entities.auxiliarContacto.name', path: 'informes/auxiliar-contacto' },
            { labelKey: 'entities.auxiliarGeneral.name', path: 'informes/auxiliar-general' },
            { labelKey: 'entities.informeBase.name', path: 'informes/base' },
            {
              labelKey: 'entities.certificadoRetencion.name',
              path: 'informes/certificado-retencion',
            },
            { labelKey: 'entities.estadoResultados.name', path: 'informes/estado-resultados' },
            {
              labelKey: 'entities.estadoSituacionFinanciera.name',
              path: 'informes/estado-situacion-financiera',
            },
          ],
        },
      ],
    },
  ],
};
