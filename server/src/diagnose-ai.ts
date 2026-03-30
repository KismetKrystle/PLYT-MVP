import { GoogleGenerativeAI } from '@google/generative-ai';
import './env';

async function diagnose() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in .env');
        return;
    }

    console.log('Using API Key ending in:', apiKey.substring(apiKey.length - 4));

    // There isn't a direct listModels in the simple GoogleGenerativeAI class usually
    // but we can try to find where it is or just test common ones.

    const genAI = new GoogleGenerativeAI(apiKey);

    const testModels = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-1.0-pro'
    ];

    for (const modelName of testModels) {
        console.log(`\n--- Testing ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hi');
            console.log(`[DEFAULT] Success with ${modelName}:`, result.response.text());
        } catch (e: any) {
            console.error(`[DEFAULT] Failed with ${modelName}:`, e.message);
        }

        try {
            const modelV1 = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
            const resultV1 = await modelV1.generateContent('Hi');
            console.log(`[V1] Success with ${modelName}:`, resultV1.response.text());
        } catch (e: any) {
            console.error(`[V1] Failed with ${modelName}:`, e.message);
        }
    }
}

diagnose();
