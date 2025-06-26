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
import psi from 'psi';

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
    const chrome = await chromeLauncher.launch({chromeFlags: ['--headless', '--disable-gpu']});
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

async function runLighthouse(url, deviceType) {
    return await psi(url, {
        key: process.env.GOOGLE_PAGESPEED_INSIGHTS_API_KEY,
        strategy: deviceType
    })
}

export async function checkBranchVsMain(branchPages, mainPages) {
    const metrics = ['lhs'];
    let hasRegression = false;

    branchPages.forEach((branchResult, idx) => {
        const mainResult = mainPages[idx];
        const url = branchResult.url || `Page ${idx}`; // Optional, if your collect() includes URL

        metrics.forEach((metric) => {
            const branchValue = branchResult[metric] ?? null;
            const mainValue = mainResult[metric] ?? null;

            // Skip if either is missing (optional, remove this block if you want to fail on missing data)
            if (branchValue === null || mainValue === null) return;

            if (branchValue > mainValue) {
                console.log(
                    `❌ Regression in [${metric.toUpperCase()}] on ${url}: branch=${branchValue} → main=${mainValue}`
                );
                hasRegression = true;
            }
        });
    });

    return hasRegression;
}

export async function collect(pageUrl, deviceType) {
    console.log(`Running Lighthouse for ${pageUrl} on ${deviceType}`);
    const resultObj = {}
    const lhr = await runLighthouse(pageUrl, deviceType);
    const lhs = lhr.data.lighthouseResult.categories.performance.score * 100;

    return {lhs, ...lhr};
}

export async function collectAll(pages, deviceType) {
    const realPages = [];
    const experimentalPages = [];

    pages.forEach((page) => {
        const {urlL} = page;
        const updatedUrl = urlL.replace(/^(https:\/\/)[^/]*?(?=--)/, '$1main');

        experimentalPages.push(collect(updatedUrl, 'desktop'));
        experimentalPages.push(collect(updatedUrl, 'mobile'));
    });

    pages.forEach((page) => {
        const {urlL} = page;

        realPages.push(collect(urlL, 'desktop'));
        realPages.push(collect(urlL, 'mobile'));
    })


    const branch = await Promise.all(realPages);
    const main = await Promise.all(experimentalPages)


    return {branch, main}
}
