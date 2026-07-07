import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          // `@erp/*` (apps/erp) y `@turnos/*` (apps/turnos) son alias intra-app
          // para evitar imports relativos profundos (`../../../../../i18n`) ahora
          // que los masters viven en `features/<modulo>/masters/<entity>/pages/<page>/`.
          // Ambos alias están en `tsconfig.base.json`, así que resuelven desde
          // cualquier proyecto y este `allow` los exime del boundary global. La
          // barrera cross-app (que una app no importe el alias de la otra) NO la
          // da este `allow`, sino los overrides `no-restricted-imports` de abajo.
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$', '^@erp/', '^@turnos/'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    // Guard cross-app: `apps/turnos` no puede usar el alias intra-app del ERP.
    files: ['apps/turnos/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@erp/*'],
              message:
                'apps/turnos no puede importar el alias @erp/* (app ajena). Usá @reddoc/* para lo compartido o rutas propias @turnos/*.',
            },
          ],
        },
      ],
    },
  },
  {
    // Guard cross-app: `apps/erp` no puede usar el alias intra-app de turnos.
    files: ['apps/erp/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@turnos/*'],
              message:
                'apps/erp no puede importar el alias @turnos/* (app ajena). Usá @reddoc/* para lo compartido o rutas propias @erp/*.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
