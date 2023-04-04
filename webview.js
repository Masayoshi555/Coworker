/*
 * Copyright 2023 Masayoshi555
 *
 * Licensed under the MIT License.
 * See LICENSE.md file in the project root for license information.
 */

const { sendOpenAIRequest } = require('./api');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let panel;

async function handleWebviewMessage(message, apiKey, panel) {
    if (message.type === 'submit') {
        const { input, code, error, conversationHistory } = message;
        const updatedConversationHistory = conversationHistory ? conversationHistory : "This is the first conversation.";
        const prompt = `${input}${error}`;
        try {
            const chatGPTResponse = await sendOpenAIRequest(prompt, apiKey, code, updatedConversationHistory);
            const allExtractedCodes = chatGPTResponse.extractedCodes.join('\n\n****\n'); // すべてのコード部分を改行で連結
            panel.webview.postMessage({ type: 'response', content: chatGPTResponse.contentWithoutCodes, code: allExtractedCodes }); // 連結されたすべてのコード部分を送信
        } catch (error) {
            panel.webview.postMessage({ type: 'error', content: `responseError：${error.message}` });
        }
    }
}

async function openSettings(apiKey) {
    // Open the settings page
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:masayoshi555.coworker');
    vscode.window.showErrorMessage('Please set your OpenAI API key in the extension settings.');
}

function createWebviewPanel(apiKey) {
    // Create the webview panel with the specified title, column, and options
    panel = vscode.window.createWebviewPanel(
        'chatgptInteraction',
        'ChatGPT Interaction',
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
        }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(async message => {
        if (message.type === 'openSettings') {
            await openSettings();
        } else {
            handleWebviewMessage(message, apiKey, panel);
        }
    });

    // アクティブなタブのファイル名を取得し、表示
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const fileName = activeEditor.document.fileName.split(/[/\\]/).pop();
        panel.webview.postMessage({ type: 'fileName', content: fileName });
    }
    panel.title = "Coworker";

    return panel;
}

function getWebviewContent() {
    const webviewHtml = fs.readFileSync(path.join(__dirname, 'webview.html'), 'utf8');
    const webviewCss = fs.readFileSync(path.join(__dirname, 'webview.css'), 'utf8');
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <style>${webviewCss}</style>
        </head>
        <body>
            ${webviewHtml}
            <script>
                const vscode = acquireVsCodeApi();
                const fileNameTextArea = document.getElementById('fileName');
                const submitButton = document.getElementById('submit');
                const resetButton = document.getElementById('reset');
                const inputTextArea = document.getElementById('input');
                const codeTextArea = document.getElementById('code');
                const errorTextArea = document.getElementById('error');
                const explanationTextArea = document.getElementById('explanation');
                const proposalCodeTextArea = document.getElementById('proposal-code');
                const loading = document.getElementById('loading');
                const settingsLink = document.getElementById('settings-link');

                submitButton.addEventListener('click', () => {
                    vscode.postMessage({
                        type: 'submit',
                        input: inputTextArea.value,
                        code: codeTextArea.value,
                        error: errorTextArea.value,
                        conversationHistory: explanationTextArea.value
                    });
                    submitButton.setAttribute('disabled', 'disabled');
                    submitButton.style.border = '2px solid rgba(0, 255, 255, 0.5)';
                    submitButton.style.backgroundColor = '#1e1e1e';
                    submitButton.style.color = 'rgba(255, 255, 255, 0.5)';
                    submitButton.style.opacity = '0.8';
                    submitButton.style.cursor = 'not-allowed';
                    submitButton.before.style.opacity = '1';
                    submitButton.textContent = '';
                    submitButton.classList.add('generating');
                });
                
                resetButton.addEventListener('click', () => {
                    inputTextArea.value = '';
                    codeTextArea.value = '';
                    errorTextArea.value = '';
                    proposalCodeTextArea.value = '';
                    explanationTextArea.value = '';
                });

                settingsLink.addEventListener('click', () => {
                    vscode.postMessage({ type: 'openSettings' });
                });

                window.addEventListener('message', (event) => {
                    const message = event.data;
                    if (message.type === 'updateInfo') {
                        const fileNameTextArea = document.getElementById('fileName');
                        fileNameTextArea.textContent = message.fileName;
                        codeTextArea.value = message.documentContent;
                        errorTextArea.value = message.errorMessages;
                    } else if (message.type === 'fileName') {
                        document.getElementById('file-name').textContent = message.content;
                    } else if (message.type === 'response') {
                        const content = message.content;
                        const date = new Date();
                        const dateString = date.toISOString().replace(/T/, ' ').replace(/\\..+/, '');
                        explanationTextArea.value = \`\${dateString}\n\${content}\n\n\${explanationTextArea.value}\`;
                        const allExtractedCodes = message.code; // 抽出されたすべてのコード部分を取得
                        proposalCodeTextArea.value = allExtractedCodes; // すべてのコード部分を表示
                        submitButton.removeAttribute('disabled');
                        submitButton.style.border = '2px solid transparent';
                        submitButton.style.backgroundColor = '#252526';
                        submitButton.style.color = '#ffffff';
                        submitButton.style.opacity = '1';
                        submitButton.style.cursor = 'pointer';
                        submitButton.before.style.opacity = '0';
                    } else if (message.type === 'error') {
                        const content = message.content;
                        explanationTextArea.value = \`\${content}\n\n\${explanationTextArea.value}\`;   
                        loading.style.display = 'none';
                        submitButton.style.display = 'block';
                        submitButton.textContent = 'Request';
                        submitButton.classList.remove('generating');
                    }
                });
            </script>
        </body>
        </html>
    `;
}

module.exports = {
    openSettings,
    createWebviewPanel
};