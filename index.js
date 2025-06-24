import dotenv from 'dotenv';
import { parseArguments } from './src/cli/cliIndex.js';

// Load environment variables
dotenv.config();

async function main() {
  // Parse command line arguments
  const argv = parseArguments();
  
  // Extract parameters
  const action = argv.action;
  const deviceType = argv.device;
  const skipCache = argv.skipCache;
  const outputSuffix = argv.outputSuffix;
  const blockRequests = argv.blockRequests;
  const model = argv.model;

}