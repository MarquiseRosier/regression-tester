import {AzureChatOpenAI} from '@langchain/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "dotenv";
// Replace these with your actual configuration
dotenv.config();
const model = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;  // or "gpt-35-turbo" etc.
const tokenLimits = {
    output: 1000, // Adjust this based on your use case
};

const basePath = `https://${process.env.AZURE_OPENAI_API_INSTANCE_NAME}.openai.azure.com/`;

const openAichat = new AzureChatOpenAI({
    model,
    maxTokens: tokenLimits.output,
    openAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    openAIBasePath: basePath,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // or your preferred version
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    configuration: {
        basePath,
    },
});

// Google Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

export { openAichat, geminiModel };
