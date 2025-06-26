import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function explainRegressionRootCause(diffText, regressionsJson, suspectedCauseText) {
  const model = genAI.getGenerativeModel({model: process.env.GEMINI_MODEL});


  const prompt = `
You are a senior performance engineer and AI code reviewer.

You are given:
1. A Git diff representing code changes:
----
${diffText}
----

2. Detected web performance regressions (in JSON format):
----
${JSON.stringify(regressionsJson, null, 2)}
----

3. The previous AI's analysis pointing to likely culprit lines:
----
${suspectedCauseText}
----

Your task:
- For each regression (CLS, LCP, INP, TTFB), explain **exactly what change in the diff is likely causing the regression**, and **why**.
- Reference specific lines, files, and code blocks from the diff.
- Discuss the likely technical reasons (e.g., increased render blocking, layout shifts, JS timing delays, etc.)
- Be specific and actionable.

Format your response like:

### Root Cause Analysis Report

- **CLS**: [Detailed cause and reasoning]
- **LCP**: ...
- **INP**: ...
- **TTFB**: ...

If there is no clear cause for a metric, state: "No clear cause found."
`;

  try {
    const result = await model.generateContent(prompt);
    const explanationText = result.response.text();

    console.log('\n✅ Gemini Detailed Root Cause Analysis:\n');
    console.log(explanationText);

    return explanationText;
  } catch (error) {
    console.error('❌ Gemini Root Cause API Error:', error);
    return null;
  }
}