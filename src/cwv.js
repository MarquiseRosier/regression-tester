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
                const mainSummary = summarize(main[j]);
                const branchSummary = summarize(branch[j]);
                const mainUrl = main[j].data.id;
                const branchUrl = branch[j].data.id;
                await compareBundles(mainUrl, branchUrl, mainSummary, branchSummary);
                console.log(`--------------------Bundle ${j + 1} processed successfully.---------------------`);
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
