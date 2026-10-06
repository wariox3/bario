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
          prefix: 'lib',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'lib',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // La máscara va sobre el elemento `<p-datepicker>` de PrimeNG, sin atributo
    // propio. La excepción vive acá y no en un comentario del archivo porque el
    // eslint de lint-staged corre con la config raíz, que no carga esta regla.
    files: ['**/mascara-fecha.directive.ts'],
    rules: {
      '@angular-eslint/directive-selector': 'off',
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
