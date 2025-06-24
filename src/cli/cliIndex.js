import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { DEFAULT_MODEL } from '../models/config.js';

export function parseArguments() {
  return yargs(hideBin(process.argv))
    .option('metric', {
      alias: 'm',
      describe: 'metric to regression test against',
      type: 'string',
      default: 'cwv',
      choices: ['cwv', 'ui', 'ux', 'errors']
    })
    .option('url', {
      alias: 'u',
      describe: 'URL to analyze',
      type: 'string'
    })
    .option('device', {
      alias: 'd',
      describe: 'Device type',
      type: 'string',
      default: 'mobile',
      choices: ['mobile', 'desktop']
    })
    .check((argv) => {
      if (!argv.url) {
        throw new Error('--url must be provided');
      }
      return true;
    })
    .help()
    .argv;
} 