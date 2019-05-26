#!/usr/bin/env node
'use strict';

// code organization patterns inspired on https://github.com/avajs/ava/blob/master/cli.js
import { scriptName } from 'yargs';

import { ReactTreefy } from './reactTreefy';

const args = scriptName('react-treefy')
  .usage(
    '$0 <rootComponentPath>',
    'Generates user-friendly component dependency trees for ReactJS.',
    yargs => {
      yargs.positional('rootComponentPath', {
        alias: 'path',
        describe:
          'Specify the path to the root component of the hierarchy. E.g.: App.js',
        type: 'string'
      });
    }
  )
  .version('1.0.0')
  .help().argv;

new ReactTreefy(args).run();
