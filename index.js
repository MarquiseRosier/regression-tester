import dotenv from 'dotenv';
import {getAllBundles} from './src/tools/bundles.js';
import {parseArguments} from './src/cli/cliIndex.js';
import {collectAll, checkBranchVsMain} from './src/tools/psi.js';
import {processCwv} from "./src/cwv.js";

// Load environment variables
dotenv.config();

async function main() {
    // Parse command line arguments
    const argv = parseArguments();

    // Extract parameters
    const metric = argv.metric;
    const deviceType = argv.device;
    const liveUrl = argv.liveUrl;
    const previewUrl = argv.previewUrl;
    const domainkey = argv.domainkey;

    if (metric === 'cwv') {
        await processCwv(metric, deviceType, liveUrl, previewUrl, domainkey);
    }
}

// Run the main function
main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
