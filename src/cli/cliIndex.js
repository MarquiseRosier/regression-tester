import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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
      default: 'www.shredit.com',
      type: 'string'
    })
    .option('device', {
      alias: 'd',
      describe: 'Device type',
      type: 'string',
      default: 'mobile',
      choices: ['mobile', 'desktop']
    })
    .option('domainkey', {
      alias: 'dk',
      describe: 'Domain key for the analysis',
      type: 'string',
      default: "990874FF-082E-4910-97CE-87692D9E8C99-8E11F549"
    })
    .check((argv) => {
      if (!argv.url) {
        throw new Error('--url must be provided');
      }
      if (!argv.domainkey) {
        throw new Error('--domainkey must be provided');
      }
      return true;
    })
    .help()
    .argv;
} 