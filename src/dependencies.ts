function sortByKey(deps: Record<string, string>) {
  return Object.keys(deps)
    .sort()
    .reduce(
      (obj, key) => {
        obj.push({ name: key, spec: deps[key] });
        return obj;
      },
      [] as { name: string; spec: string }[],
    );
}

export function dependencies({ features }: { features: string[] }) {
  const deps = {
    '@openapi-typescript-infra/coconfig': '^4.6.0',
    '@openapi-typescript-infra/service': '^4.5.1',
  } as Record<string, string>;
  if (features.includes('db')) {
    Object.assign(deps, {
      'db-migrate': '^0.11.14',
      'db-migrate-pg': '^1.5.2',
      kysely: '^0.27.4',
      pg: '^8.13.1',
    });
  }
  if (features.includes('redis')) {
    Object.assign(deps, {
      ioredis: '^5.4.1',
    });
  }
  return sortByKey(deps);
}

export function devDependencies({ features }: { features: string[] }) {
  const deps = {
    coconfig: '^1.6.1',
    '@openapi-typescript-infra/service-tester': '^6.1.1',
    '@typescript-eslint/eslint-plugin': '^7.0.0',
    '@typescript-eslint/parser': '^7.0.0',
    eslint: '^8.51.0',
    'eslint-config-prettier': '^9.0.0',
    'eslint-plugin-import': '^2.28.1',
    prettier: '^3.3.3',
    typescript: '^5.6.3',
    vitest: '^2.1.4',
  };
  if (features.includes('db')) {
    Object.assign(deps, {
      'run-pg-sql': '^1.2.0',
      'kysely-codegen': '^0.17.0',
    });
  }
  return sortByKey(deps);
}
