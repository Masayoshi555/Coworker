/*
 * Copyright 2023 Masayoshi555
 *
 * Licensed under the MIT License.
 * See LICENSE.md file in the project root for license information.
 */

const vscode = require('vscode');
const { createWebviewPanel, openSettings } = require('./webview');
let panel;

// Function to interact with the ChatGPT API
async function interactWithChatGPT() {
    // Generate the second column if it doesn't exist
    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn !== vscode.ViewColumn.Two) {
        vscode.commands.executeCommand('workbench.action.splitEditor', { "newInCurrentGroup": false });
    }
    // Get the API key from the extension settings
    const apiKey = vscode.workspace.getConfiguration('chatgpt').get('apiKey');
    panel = createWebviewPanel(apiKey);
    // If the API key is not set, open the settings and show the extension panel
    if (!apiKey) {
        openSettings();
    }
}

async function activate(context) {
    // Register the "coworker.sayHello" command
    const launchCommand = vscode.commands.registerCommand('coworker.sayHello', interactWithChatGPT);
    context.subscriptions.push(launchCommand);

    // Register the "chatgpt.openSettings" command
    const openSettingsCommand = vscode.commands.registerCommand('chatgpt.openSettings', openSettings);
    context.subscriptions.push(openSettingsCommand);

    // Listen to changes in the active text editor
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        // If an editor is active, get its file name, content, and error messages
        if (editor) {
            const fileName = editor.document.fileName.split(/[/\\]/).pop();
            const documentContent = editor.document.getText();
            const activeDocumentUri = editor.document.uri;
            const diagnostics = vscode.languages.getDiagnostics(activeDocumentUri);
            const errorMessages = diagnostics.map((diagnostic) => diagnostic.message).join('\n');
            
            if (panel) {
                panel.webview.postMessage({
                    type: 'updateInfo',
                    fileName,
                    documentContent,
                    errorMessages,
                });
            }
        }
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};