import fs from 'node:fs';
import path from 'node:path';

import pascalcase from 'pascalcase';
import Helpers from 'handlebars-helpers';
import { mkdirpSync } from 'mkdirp';
import OpenAPIParser from '@readme/openapi-parser';
import type { HelperDelegate } from 'handlebars';
import type { NodePlopAPI } from 'plop';

import { getPrompts } from './prompts.js';
import { useCliAction } from './actions.js';

async function writeMissing(
  api: string,
  methods: Record<string, Record<string, { operationId: string }>>,
  apiName: string,
) {
  const handlerPath = path.join('src', 'handlers', `${api}.ts`);
  const exists = fs.existsSync(handlerPath);
  if (!exists) {
    console.log('Creating', handlerPath);
    mkdirpSync(path.dirname(handlerPath));
    fs.writeFileSync(
      handlerPath,
      `import type { ${apiName} } from '#src/types/index.js';

${Object.keys(methods)
  .filter((f) => !['parameters'].includes(f))
  .map(
    (method) =>
      `export const ${method}: ${apiName}['${methods[method].operationId}'] = async (req, res) => {
  // TODO - implement ${method} handler
  res.sendStatus(501);
};
`,
  )
  .join('\n')}`,
    );
  }
}

// eslint-disable-next-line import/no-default-export
export default function (plop: NodePlopAPI) {
  const helpers = Helpers();
  Object.entries(helpers).forEach(([name, helper]) => {
    if (!['raw'].includes(name)) {
      plop.setHelper(name, helper);
    }
  });
  plop.setHelper('ternary', ((test, yes, no) => (test ? yes : no)) as HelperDelegate);
  useCliAction(plop);

  const Prompts = getPrompts(plop);
  // controller generator
  plop.setGenerator('handlers', {
    description: 'Generate missing API handlers',
    prompts: [Prompts.handlerWarning],
    actions() {
      return [
        async () => {
          const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
          if (!pkg.name) {
            throw new Error('Your package.json is missing a name field, please ensure it is set');
          }
          const svcName = pkg.name.split('/').pop();
          const apiSpec = `api/${svcName}.yaml`;
          const { paths } = await OpenAPIParser.validate(apiSpec);
          const apiName = `${pascalcase(svcName)}Api`;
          if (paths) {
            Object.entries(paths).forEach(([api, methods]) => writeMissing(api, methods, apiName));
          }
          return '';
        },
        `
We have added any missing handler FILES to your project. If new methods
needed to be added to existing handler files, we did not add those.

Happy hacking!`,
      ].filter((a) => typeof a === 'object' || typeof a === 'string' || typeof a === 'function');
    },
  });
}
