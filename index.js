import dotenv from 'dotenv';
import { getAllBundles } from './src/tools/bundles.js';
import { parseArguments } from './src/cli/cliIndex.js';
import { collectAll, checkBranchVsMain } from './src/tools/psi.js';
import { analyzeDiffForRegressions } from './src/agents/candidates.js';
import { explainRegressionRootCause } from './src/agents/problem.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// For __dirname support in ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to the diff file (since you run from regression-tester/ directory)
const diffFilePath = path.resolve(__dirname, '..', 'full_diff.txt');

let fullDiff = '';

try {
  fullDiff = fs.readFileSync(diffFilePath, 'utf-8');
  console.log('\n✅ Loaded git diff for ML analysis.\n');
} catch (error) {
  console.warn('⚠️ No git diff found at expected path. Skipping diff-based ML analysis.');
}

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

    bundles = [
    {
        urlL: "https://bad-code--bbird--aemsites.aem.live/drafts/vmitra/bad-code",
        count: 5,
        sum: 500,
        mean: 100,
        p50: 100,
        p75: 100,
        errorRate: 0,
        }
    ]
    const result = await collectAll(bundles, deviceType);
    const { branch, main } = result;
    const regressions = await checkBranchVsMain(branch, main)

    const candidates = await analyzeDiffForRegressions(fullDiff, regressions)
    const problem = await explainRegressionRootCause(fullDiff, regressions, candidates)
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});