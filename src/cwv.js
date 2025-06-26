import {checkBranchVsMain, collectAll} from "./tools/psi.js";
import {compareBundles, summarize} from "./utils.js";
import {getAllBundles} from "./tools/bundles.js";


export async function processCwv(metric, deviceType, liveUrl, previewUrl, domainkey) {

    let bundles = await getAllBundles(liveUrl, domainkey, "2024-06-25", "2025-06-30", 'pageviews');

    console.log(`Total bundles returned: ${bundles.length}`);

    bundles.sort((a, b) => {
        return b['sum'] - a['sum'];
    });

    bundles.forEach((bundle) => {
        const {urlL} = bundle;

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

            const {branch, main} = result;

            for (let j = 0; j < main.length; j++) {
                console.log(`Comparing bundle`);

                const mainUrl = main[j]?.data.id;
                const branchUrl = branch[j].data.id;
                // const mainPromptData = summarize(main[j]);
                // const branchPromptData = summarize(branch[j]);


                // const result = await compareBundles(mainUrl, branchUrl, mainSummary, branchSummary);
                const mainPromptData = extractMetrics(main[j], mainUrl);
                const branchPromptData = extractMetrics(branch[j], branchUrl);

                const result = await compareBundles(mainUrl, branchUrl, mainPromptData, branchPromptData);
                console.log(`\n--------------------Bundle ${j + 1}---------------------`);
                console.log(result);
                console.log('\n\n');
                console.log(`\n\n\n\n\n\--------------------Bundle ${j + 1} processed successfully.---------------------`);
                console.log('\n\n\n\n');
            }

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


// Helper function to format bytes into a readable string (KiB)
const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 KiB';
    return `${(bytes / 1024).toFixed(1)} KiB`;
};

// The comprehensive extraction function
const extractMetrics = (psiResult, url) => {
    const lighthouse = psiResult.data.lighthouseResult;
    const audits = lighthouse.audits;

    // --- Helper logic for complex audits ---

    // Summarize network requests
    const networkRequests = audits['network-requests']?.details?.items || [];
    const networkSummary = `${networkRequests.length} requests / ${formatBytes(networkRequests.reduce((acc, item) => acc + (item.transferSize || 0), 0))}`;

    // Summarize resources by type
    const resourceSummary = audits['resource-summary']?.details?.items
        .map(item => `${item.label}: ${formatBytes(item.transferSize)}`)
        .join(' | ') || 'N/A';

    // Find the worst layout shift element
    const layoutShiftElements = audits['layout-shift-elements']?.details?.items || [];
    const worstShiftElement = layoutShiftElements.length > 0
        ? `${layoutShiftElements.length} elements (Worst: ${layoutShiftElements[0].node.selector})`
        : 'None';

    // Summarize long tasks
    const longTasks = audits['long-tasks']?.details?.items || [];
    const longTasksSummary = longTasks.length > 0
        ? `${longTasks.length} tasks, ${longTasks.reduce((acc, task) => acc + task.duration, 0).toFixed(0)} ms total`
        : 'None';

    // Summarize JS treemap data
    const treemapNodes = audits['script-treemap-data']?.details?.nodes || [];
    const treemapSummary = treemapNodes.length > 0
        ? `Total JS: ${formatBytes(treemapNodes[0].resourceBytes)}`
        : 'N/A';

    return {
        'URL': url,

        // --- CORE VITALS & SCORES ---
        'Performance Score': Math.round(lighthouse.categories.performance.score * 100),
        'LCP': audits['largest-contentful-paint']?.displayValue,
        'TBT': audits['total-blocking-time']?.displayValue,
        'CLS': audits['cumulative-layout-shift']?.displayValue,

        // --- LCP AND CLS VISUAL CONTEXT ---
        'LCP Element': audits['largest-contentful-paint-element']?.details?.items[0]?.node?.selector || 'N/A',
        'Layout Shift Elements': worstShiftElement,

        // --- JAVASCRIPT EXECUTION METRICS ---
        'JS Bootup Time': audits['bootup-time']?.displayValue,
        'Long Tasks': longTasksSummary,
        'Total Main-Thread Tasks': audits['main-thread-tasks']?.details?.items?.length || 0,
        'Total JS Size (Treemap)': treemapSummary,

        // --- NETWORK & RESOURCE LOADING ---
        'Network Requests': networkSummary,
        'Resource Summary': resourceSummary,
        'Total Page Size': audits['total-byte-weight']?.displayValue,
        'Network RTT': `${audits['network-rtt']?.numericValue?.toFixed(0) || 'N/A'} ms`,
        'Server Latency (TTFB)': `${audits['network-server-latency']?.numericValue?.toFixed(0) || 'N/A'} ms`,
    };
};
