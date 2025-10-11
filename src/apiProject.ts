import path from 'node:path';
import * as url from 'url';

import Helpers from 'handlebars-helpers';
import type { HelperDelegate } from 'handlebars';
import type { NodePlopAPI } from 'plop';
import type { PromptQuestion } from 'node-plop';

import { Prompts } from './prompts.js';
import type { OtiAnswers } from './prompts.js';
import { dependencies, devDependencies } from './dependencies.js';
import { useCliAction } from './actions.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

function cli(cmd: string) {
  const [command, ...args] = cmd.split(' ');
  return {
    type: 'cli',
    command,
    args,
  };
}

// eslint-disable-next-line import/no-default-export
export default function (plop: NodePlopAPI) {
  plop.load('plop-pack-git-init');

  const helpers = Helpers();
  Object.entries(helpers).forEach(([name, helper]) => {
    if (!['raw'].includes(name)) {
      plop.setHelper(name, helper);
    }
  });
  plop.setHelper('ternary', ((test, yes, no) => (test ? yes : no)) as HelperDelegate);
  useCliAction(plop);

  // controller generator
  plop.setGenerator('api', {
    description: 'Generate an API service',
    prompts: [
      process.env.NO_DIR_WARNING ? undefined : Prompts.dirWarning,
      Prompts.email,
      Prompts.fullname,
      Prompts.org,
      Prompts.name,
      Prompts.desc,
      Prompts.features,
      Prompts.dbName,
    ].filter((p) => !!p) as PromptQuestion[],
    actions(data) {
      return [
        {
          type: 'addMany',
          base: path.join(__dirname, '..', 'templates', 'all'),
          destination: '.',
          stripExtensions: ['hbs'],
          globOptions: { dot: true },
          force: true,
          templateFiles: [path.resolve(__dirname, '../templates/all/**')],
          data: {
            dependencies: dependencies(data as OtiAnswers),
            devDependencies: devDependencies(data as OtiAnswers),
          },
        },
        {
          type: 'add',
          templateFile: path.join(__dirname, '..', 'templates', 'api.yaml.hbs'),
          path: 'api/{{name}}.yaml',
          force: true,
        },
        data?.features.includes('db') && {
          type: 'addMany',
          base: path.join(__dirname, '..', 'templates', 'db'),
          destination: '.',
          stripExtensions: ['hbs'],
          globOptions: { dot: true },
          force: true,
          templateFiles: [path.resolve(__dirname, '../templates/db/**')],
        },
        cli('yarn set version berry'),
        cli('yarn config set nodeLinker node-modules'),
        cli('yarn plugin import interactive-tools'),
        cli('yarn'),
        cli('yarn lint --fix --max-warnings 10'),
        data?.features.includes('db') && cli('yarn migration:create initial-schema'),
        {
          type: 'gitInit',
          path: process.cwd(),
          // By default is false, but if "true" will log the output of commands
          verbose: true,
        },
        `
Your project is ready to roll! We ran yarn for you, so your next steps are:
* Go into the api directory and edit your API specification.
  You could use https://editor.swagger.io/ and then paste the yaml back in.
${
  data?.features.includes('db')
    ? `* Go into migrations/sql and add your initial database up/down migration to the existing files
* Run "make db-ci" to create the database and run the migrations.`
    : ''
}
* Run "yarn test" to just make sure the environment is all sorted out.
* Run "yarn build" to build the database interface, service types and TS code.
* Start implementing your API by adding appropriate handler methods.

Happy hacking!`,
      ].filter((a) => typeof a === 'object' || typeof a === 'string');
    },
  });
}
