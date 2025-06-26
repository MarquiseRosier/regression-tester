import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

export function parseArguments() {
    return yargs(hideBin(process.argv))
        .option('metric', {
            alias: 'm',
            describe: 'metric to regression test against',
            type: 'string',
            default: 'cwv',
            choices: ['cwv', 'ui', 'ux', 'errors']
        })
        .option('previewUrl', {
            alias: 'pu',
            describe: 'Preview Url to analyze',
            default: 'www.shredit.com',
            type: 'string'
        })
        .option('liveUrl', {
            alias: 'lu',
            describe: 'Live Url to analyze',
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
        })
        .check((argv) => {
            if (!argv.previewUrl || !argv.liveUrl) {
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
