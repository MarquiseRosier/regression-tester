import {HumanMessage} from "@langchain/core/messages";
import {chat} from "./llmFactory.js";
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';

let encoder;

// export async  function compareBundlesT() {
//     // Calling open api
//
//     const response = await chat.call([
//         new HumanMessage("What is the capital of France?")
//     ]);
//
//     console.log("Response:", response.text);
//
// }


export async function compareBundles(psiData1, psiData2) {
    const prompt = `
You are a web performance analyst. I will give you two PageSpeed Insights (PSI) reports in JSON format:

- \`psiData1\`: Production site data (current live site)
- \`psiData2\`: Test site data (new changes or upcoming version)

Your task:
1. Compare the core web vitals and performance metrics between the production and test site.
2. Detect and highlight any **performance regressions** (drops) in the test site compared to production.
3. Focus on these metrics:
   - Performance score
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Speed Index
   - Total Blocking Time (TBT)
   - Cumulative Layout Shift (CLS)

For each metric:
- State the values from both production and test data.
- Quantify the difference.
- Explain if the test site is better or worse.
- Indicate the severity of any regression (minor, moderate, significant).

Finish with a short summary: Is the test version performing better, worse, or about the same as production?

Here is the production PSI data (psiData1):
${JSON.stringify(psiData1, null, 2)}

Here is the test PSI data (psiData2):
${JSON.stringify(psiData2, null, 2)}
    `;
    const response = await chat.call([
        new HumanMessage(prompt)
    ]);

    console.log(`Response: ${response.text}`);

    return response;
}


export const psiSummaryStep = (psiSummary) => `
${step()} here is the summarized PSI audit for the page load.

${psiSummary}
`;



export async function getPsi(pageUrl, deviceType, options) {
    const { full, summary, fromCache } = await collectPsi(pageUrl, deviceType, options);
    if (fromCache) {
        console.log('✓ Loaded PSI data from cache. Estimated token size: ~', estimateTokenSize(full));
    } else {
        console.log('✅ Processed PSI data. Estimated token size: ~', estimateTokenSize(full));
    }
    return { full, summary };
}


// A crude approximation of the number of tokens in a string
export function estimateTokenSize(obj) {
    if (!obj) {
        return 0;
    }
    if (!encoder) {
        encoder = new Tiktoken(cl100k_base);
    }
    return encoder.encode(JSON.stringify(obj)).length;
}


export function summarize(psiData) {
    if (!psiData?.data?.lighthouseResult?.audits) {
        return 'No valid PageSpeed Insights data available.';
    }

    const audits = psiData.data.lighthouseResult.audits;

    let report = `**Bottlenecks:**\n\n`;
    let length = report.length;
    let hasBottlenecks = false;

    // Helper function for Core Web Vitals and other key metrics (no URL/form factor)

    // Core Web Vitals
    report += checkMetric(audits['largest-contentful-paint'], 2500, 4000, 'Largest Contentful Paint (LCP)');
    report += checkMetric(audits['first-contentful-paint'], 1800, 3000, 'First Contentful Paint (FCP)');
    report += checkMetric(audits['total-blocking-time'], 200, 600, 'Total Blocking Time (TBT)'); // Use TBT, not INP
    report += checkMetric(audits['cumulative-layout-shift'], 0.1, 0.25, 'Cumulative Layout Shift (CLS)');
    report += checkMetric(audits['speed-index'], 3400, 5800, 'Speed Index'); // Add Speed Index
    if (report.length > length) {
        hasBottlenecks = true;
    }

    // Other audits (prioritize those with 'opportunity' details and wastedBytes/wastedMs)
    const prioritizedAudits = [
        'uses-optimized-images',
        'uses-modern-image-formats',
        'uses-text-compression',
        'render-blocking-resources',
        'unminified-css',
        'unminified-javascript',
        'unused-css-rules',
        'unused-javascript',
        'uses-responsive-images',
        'efficient-animated-content',
        'third-party-summary',
        'duplicated-javascript',
        'legacy-javascript',
        'viewport',
        'server-response-time',
        'redirects',
        'uses-rel-preconnect',
        'prioritize-lcp-image',
        'unsized-images'
    ];

    for (const auditId of prioritizedAudits) {
        const audit = audits[auditId];
        if (!audit || audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'informational'  || audit.scoreDisplayMode === 'manual') {
            continue;
        }

        if (audit.score !== null && audit.score < 1) {
            hasBottlenecks = true;
            if (audit.displayValue) {
                report += `* **${audit.title}:** ${audit.displayValue}`;
            } else if (audit.details?.items?.length > 0) {
                report += `* **${audit.title}:**`;
                for (const item of audit.details.items) {
                    report += `\n    * ${item.node.snippet}`;
                }
            }

            if (audit.details && audit.details.overallSavingsMs) {
                report += ` (Potential savings of ${audit.details.overallSavingsMs}ms)`;
            }
            if (audit.details && audit.details.overallSavingsBytes) {
                report += ` (Potential savings of ${Math.round(audit.details.overallSavingsBytes / 1024)} KiB)`;
            }
            report += '\n';
        }
    }


    // LCP Element Details (if available)
    const lcpElementAudit = audits['largest-contentful-paint-element'];
    if (lcpElementAudit && lcpElementAudit.details && lcpElementAudit.details.items && lcpElementAudit.details.items.length > 0) {
        const lcpItem = lcpElementAudit.details.items[0];
        if (lcpItem && lcpItem.items && lcpItem.items[0] && lcpItem.items[0].node) {
            const node = lcpItem.items[0].node;
            hasBottlenecks = true;
            report += `* **LCP Element:**\n`;
            report += `    * Snippet: \`${node.snippet}\`\n`;
            report += `    * Selector: \`${node.selector}\`\n`;

            // Extract image URL if present
            if (node.nodeLabel && node.nodeLabel.includes('url(')) {
                const urlRegex = /url\(['']?(.*?)['']?\)/;
                const match = node.nodeLabel.match(urlRegex);
                if (match && match[1]) {
                    report += `    * Image URL: \`${match[1]}\`\n`;
                }
            }

            if (node.boundingRect) {
                report += `    * Size: ${node.boundingRect.width}px x ${node.boundingRect.height}px\n`;
                report += `    * Position: Top: ${node.boundingRect.top}px, Left: ${node.boundingRect.left}px\n`;
            }
        }
    }

    // Critical Request Chains (simplified, focusing on the longest chain and listing resources)
    const criticalChainsAudit = audits['critical-request-chains'];
    if (criticalChainsAudit && criticalChainsAudit.details && criticalChainsAudit.details.longestChain && Object.keys(criticalChainsAudit.details.chains).length > 1) {
        const longestChain = criticalChainsAudit.details.longestChain;
        hasBottlenecks = true;
        report += `* **Longest Critical Request Chain:**\n`;
        report += `    * Duration: ${Math.round(longestChain.duration)}ms\n`;
        report += `    * Transfer Size: ${Math.round(longestChain.transferSize / 1024)} KiB\n`;
        report += `    * Length: ${longestChain.length} requests\n`;
        report += `    * Resources:\n`;

        // Start with the root
        listChainResources(report, criticalChainsAudit.details.chains[Object.keys(criticalChainsAudit.details.chains)[0]]);
    }


    // Add a 'No bottlenecks' message if everything is good
    if (!hasBottlenecks) {
        report += '* No significant bottlenecks found based on provided audits. Overall performance is good.\n';
    }

    return report;
}


function listChainResources(report, node) {
    if (node && node.request && node.request.url) {
        report += `        * ${node.request.url}\n`;
    }
    if (node && node.children) {
        for (const key in node.children) {
            listChainResources(node.children[key]);
        }
    }
}


function checkMetric(audit, goodThreshold, needsImprovementThreshold, metricName) {
    if (!audit || audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'informational' || audit.scoreDisplayMode === 'manual') {
        return ''; // Skip if not applicable or informational
    }

    needsImprovementThreshold = needsImprovementThreshold === undefined ? goodThreshold * 2 : needsImprovementThreshold;

    const value = audit.numericValue;
    if (value > needsImprovementThreshold) {
        return `* **${metricName}:** ${audit.displayValue} (Poor)\n`;
    } else if (value > goodThreshold) {
        return `* **${metricName}:** ${audit.displayValue} (Needs Improvement)\n`;
    }
    return ''; // Return empty string for 'Good'
}


