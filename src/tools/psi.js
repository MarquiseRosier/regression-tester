/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import lighthouse from 'lighthouse';
import fs from 'fs';

// Cleans up large images from the Lighthouse JSON report
function cleanup(lhr) {
  delete lhr.audits['screenshot-thumbnails'];
  delete lhr.audits['final-screenshot'];
  delete lhr.fullPageScreenshot;
  return lhr;
}

// Launch headless Chrome and run Lighthouse
async function runLocalLighthouse(url, deviceType) {
  const chromeLauncher = await import('chrome-launcher');
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--disable-gpu'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
    onlyCategories: ['performance'],
    emulatedFormFactor: deviceType.toLowerCase() // 'mobile' or 'desktop'
  };

  const result = await lighthouse(url, options);
  await chrome.kill();

  return result.lhr; // Return the LighthouseResult object
}

export async function collect(pageUrl, deviceType) {
  console.log(`Running Lighthouse for ${pageUrl} on ${deviceType}`);
  
  const lhr = await runLocalLighthouse(pageUrl, deviceType);
  const cleaned = cleanup({ data: { lighthouseResult: lhr } });  // Wrap to match your existing summarize input

  cacheResults(pageUrl, deviceType, 'lighthouse', cleaned);
  const summary = summarize(cleaned);
  cacheResults(pageUrl, deviceType, 'lighthouse', summary);

  // Optional: Save raw JSON report for debugging
  fs.writeFileSync(`.cache/${encodeURIComponent(pageUrl)}-${deviceType}.report.json`, JSON.stringify(lhr, null, 2));

  return { full: cleaned, summary };
}

export async function collectAll(pages, deviceType) {
  const tasks = [];

  pages.forEach((page) => {
    tasks.push(collect(page, 'desktop'));
    tasks.push(collect(page, 'mobile'));
  });

  return Promise.all(tasks);
}