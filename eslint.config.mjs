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
          //
          // `@reddoc/feature-contenedores/i18n` es el entry point del diccionario.
          // El lib se carga lazy (`loadComponent`), pero `provideI18n` recibe un
          // objeto estático y cada `app.es.ts` tiene que importarlo eager. La regla
          // "static imports of lazy-loaded libraries" es de granularidad proyecto y
          // no ve que `src/i18n.ts` no importa `src/index.ts`: son grafos disjuntos,
          // así que el chunk lazy del componente sobrevive. Eximimos ese specifier
          // exacto, no el barrel: importar `@reddoc/feature-contenedores` estático
          // sigue siendo un error, que es lo que de verdad rompería la laziness.
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            '^@erp/',
            '^@turnos/',
            '^@reddoc/feature-contenedores/i18n$',
          ],
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
