import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load your API key from .env (or you can hardcode for now)
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function analyzeDiffForRegressions(diffText, regressionsJson) {
  const model = genAI.getGenerativeModel({model: process.env.GEMINI_MODEL});

  const prompt = `
You are a performance-focused code analysis AI. Analyze the following:

1. Git Diff:
----
${diffText}
----

2. Regressions JSON:
----
${JSON.stringify(regressionsJson, null, 2)}
----

Task:
For each metric (CLS, LCP, INP, TTFB), suggest the most likely code change causing the regression and explain why.
If unsure, say "No clear cause found."
Format your answer as markdown.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log('\n✅ Gemini AI Analysis:\n');
    console.log(text);

    return text;
  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    return null;
  }
}