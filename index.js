import dotenv from 'dotenv';
import { getAllBundles } from './src/tools/bundles.js';
import { parseArguments } from './src/cli/cliIndex.js';
import { collectAll } from './src/tools/psi.js';


// Load environment variables
dotenv.config();

async function main() {
  // Parse command line arguments
  const argv = parseArguments();
  
  // Extract parameters
  const metric = argv.metric;
  const deviceType = argv.device;
  const url = argv.url;
  const domainkey = argv.domainkey

  if (metric === 'cwv') {
    const bundles = await getAllBundles(url, domainkey, "2025-06-01", "2025-06-30", 'pageviews');

    bundles.sort((a, b) => {
      return b['sum'] - a['sum'];
    }); 

    console.log(bundles)

    // Import and run the PSI tool
    const result = await collectAll(bundles, deviceType);
    console.log(result);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});