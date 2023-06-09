/*
 * Copyright 2023 Masayoshi555
 *
 * Licensed under the MIT License.
 * See LICENSE.md file in the project root for license information.
 */

const codeRegex =  /```([\s\S]*?)```/g;
const fetch = require('node-fetch').default;

async function fetchWrapper(openAIUrl, requestOptions) {
    return fetch(openAIUrl, requestOptions);
}  

async function sendOpenAIRequest(prompt, apiKey, currentCode, conversationHistory) {
    const openAIUrl = 'https://api.openai.com/v1/chat/completions';
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are multilingual programer of google. You should answer using same language which user used. You should briefly explain using Markdown." },
                { role: "user", content: prompt},
                { role: "assistant", content: `currentCode: ${currentCode}` },
                { role: "assistant", content: `conversationHistory: ${conversationHistory}` }
            ],
        })
    };

    return await fetchWrapper(openAIUrl, requestOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (typeof data === 'object' && data !== null && 'choices' in data && Array.isArray(data.choices) && data.choices.length > 0 && 'message' in data.choices[0] && 'content' in data.choices[0].message) {
                const content = data.choices[0].message.content;
                const codeMatches = [...content.matchAll(codeRegex)]; 
                const extractedCodes = codeMatches.map(match => match[1].trim()); 
                const contentWithoutCodes = content.replace(codeRegex, '').trim(); 
                return { contentWithoutCodes, extractedCodes }; 
            } else {
                throw new Error('Invalid response from ChatGPT');
            }
        });
}

module.exports = {
    sendOpenAIRequest
};