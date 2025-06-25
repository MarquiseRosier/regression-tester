import dotenv from 'dotenv';
import { getAllBundles } from './src/tools/bundles.js';
import { parseArguments } from './src/cli/cliIndex.js';
import { collectAll, checkBranchVsMain } from './src/tools/psi.js';


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
    let bundles = await getAllBundles(liveUrl, domainkey, "2024-06-25", "2025-06-30", 'pageviews');

    bundles.sort((a, b) => {
      return b['sum'] - a['sum'];
    }); 

    bundles.forEach((bundle) => {
      const { urlL } = bundle;

      // Extract path from urlL
      const urlPath = new URL(urlL).pathname;

      // Extract domain from previewUrl (without path/query)
      const previewDomain = new URL(previewUrl).origin;

      // Rebuild urlL using preview domain + original path
      bundle.urlL = `${previewDomain}${urlPath}`;
    });

    bundles = bundles.slice(0, 5); // Limit to top 10 bundles

    const result = await collectAll(bundles, deviceType);
    const { branch, main } = result;
    checkBranchVsMain(branch, main)
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});