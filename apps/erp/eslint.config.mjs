import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // Las páginas de un master no arman su propia URL.
    //
    // El segmento de módulo de un master es contexto, no identidad: el mismo
    // master se abre desde varios módulos y la URL tiene que quedarse en el que
    // el usuario está recorriendo. Escribirla a mano es exactamente cómo sedes
    // y almacenes terminaron expulsando a General y a Inventario a quien entraba
    // por Venta. `masterNav('<segmento>')` la arma con el módulo activo.
    files: ['src/app/features/*/masters/*/pages/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      // Masters todavía sin migrar a `masterNav`. Los que usan `currentModuleId`
      // ya navegan bien; los demás clavan su módulo y solo se salvan porque hoy
      // se montan en uno solo. Esta lista **es** el backlog de la migración: se
      // borra una entrada cuando su master queda migrado, y cuando quede vacía
      // se borra entera.
      'src/app/features/contabilidad/masters/{activo,centro-costo,cuenta,periodo}/**',
      'src/app/features/general/masters/{asesor,contacto,cuenta-banco,forma-pago,item,precio}/**',
      'src/app/features/humano/masters/{adicional,cargo,contrato,credito,empleado,grupo,novedad,sucursal}/**',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "ArrayExpression > Literal[value='/t']",
          message:
            "No armes la URL del master a mano: usa masterNav('<segmento>') de @erp/core/erp-modules, que resuelve el módulo activo.",
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
