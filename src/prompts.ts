import path from 'node:path';

import Configstore from 'configstore';
import parseGitConfig from 'parse-git-config';
import type { NodePlopAPI, PromptQuestion } from 'node-plop';

const config = new Configstore('@openapi-typescript-infra/create');

export interface OtiAnswers {
  name: string;
  desc: string;
  features: string[];
}

function saver(fieldName: string, required: boolean) {
  return (value: string) => {
    config.set(fieldName, value);
    if (required) {
      return value?.trim() ? true : 'This field is required';
    }
    return true;
  };
}

// eslint-disable-next-line import/no-named-as-default-member
const gitConfig = parseGitConfig.sync({ type: 'global' });

function removeType(name: string) {
  const parts = name.split('-');
  if (parts.length > 1) {
    parts.pop();
  }
  return parts.join('-');
}

export const getPrompts = (plop: NodePlopAPI): Record<string, PromptQuestion> => ({
  dirWarning: {
    type: 'confirm',
    name: 'dirWarning',
    message: `This will create files in the current directory (${plop.getDestBasePath()}). Continue?`,
  },
  handlerWarning: {
    type: 'confirm',
    name: 'handlerWarning',
    message: `This will create missing handlers for the project in (${plop.getDestBasePath()}). Continue?`,
  },
  email: {
    type: 'input',
    name: 'email',
    message: 'What is the developer email address for package.json?',
    validate: saver('email', false),
    default: config.get('email') || gitConfig?.user?.email,
  },
  fullname: {
    type: 'input',
    name: 'fullname',
    message: 'What is the developer name for package.json?',
    validate: saver('fullname', false),
    default: config.get('fullname') || gitConfig?.user?.name,
  },
  org: {
    type: 'input',
    name: 'org',
    message: 'What is the name of your github organization or your github username?',
    validate: saver('org', true),
    default: config.get('org'),
  },
  name: {
    type: 'input',
    name: 'name',
    message: 'What is the name of the service?',
    default: path.basename(plop.getDestBasePath()),
  },
  desc: {
    type: 'input',
    name: 'desc',
    message: 'Describe the service (for package.json)?',
    default: 'An api for doing things',
  },
  features: {
    type: 'checkbox',
    name: 'features',
    message: 'Which features will you use?',
    choices: [
      { name: 'Postgres Database', value: 'db' },
      { name: 'redis', value: 'redis' },
    ],
  },
  dbName: {
    type: 'input',
    name: 'dbName',
    when: (answers) => answers.features.includes('db'),
    message: 'What will be the name of the database?',
    validate(input) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(input)) {
        return 'That database name is not a valid postgres identifier';
      }
      return true;
    },
    default: (answers: OtiAnswers) => removeType(answers.name).replace('-', '_'),
  },
});
