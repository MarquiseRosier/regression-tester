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

    console.log(`Total bundles returned: ${bundles.length}`);

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

    bundles = bundles.slice(0, 10);

    // Batch processing: process in batches of 5
    const batchSize = 5;
    let hasAnyRegression = false;
    
    for (let i = 0; i < bundles.length; i += batchSize) {
      const batch = bundles.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1}:`, batch.map(b => b.urlL));
      try {
        const result = await collectAll(batch, deviceType);
        const { branch, main } = result;
        const batchHasRegression = await checkBranchVsMain(branch, main);
        if (batchHasRegression) {
          hasAnyRegression = true;
        }
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
      }
    }
    
    // Exit with error code only after all batches are processed
    if (hasAnyRegression) {
      console.log('\n❌ Build failed: Branch introduces performance regressions compared to main.\n');
      process.exit(1);
    } else {
      console.log('\n✅ No regressions: Branch performance is as good or better than main.\n');
    }
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});