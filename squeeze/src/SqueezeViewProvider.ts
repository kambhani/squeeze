import * as vscode from 'vscode';

export class SqueezeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'squeeze.promptView';
    
    private _view?: vscode.WebviewView;
    private _transformedPrompt: string = '';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'transform':
                    await this._transformPrompt(data.prompt, data.mode);
                    break;
                case 'copy':
                    await this._copyToClipboard();
                    break;
                case 'sendToCopilot':
                    await this._sendToCopilot();
                    break;
            }
        });
    }

    private async _transformPrompt(prompt: string, mode: string) {
        if (!prompt.trim()) {
            vscode.window.showWarningMessage('Please enter a prompt to transform.');
            return;
        }

        // Show loading state
        this._postMessage({ type: 'loading', loading: true });

        try {
            // TODO: Replace with your actual backend endpoint
            const backendUrl = vscode.workspace.getConfiguration('squeeze').get<string>('backendUrl') 
                || 'http://localhost:8000/transform';
            
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    mode: mode
                })
            });

            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }

            const result = await response.json() as { transformedPrompt?: string; result?: string };
            this._transformedPrompt = result.transformedPrompt || result.result || '';
            
            this._postMessage({ 
                type: 'result', 
                result: this._transformedPrompt 
            });
        } catch (error) {
            // For development/testing, return a mock response
            const mockResponses: Record<string, string> = {
                'enhance': `[Enhanced] ${prompt}\n\nPlease provide detailed, step-by-step guidance with examples and best practices.`,
                'xml': `<prompt>\n  <instruction>${prompt}</instruction>\n  <context>User request</context>\n  <format>Structured response</format>\n</prompt>`,
                'compress': prompt.split(' ').filter((_, i) => i % 2 === 0 || prompt.split(' ')[i]?.length > 4).join(' ')
            };
            
            this._transformedPrompt = mockResponses[mode] || prompt;
            
            this._postMessage({ 
                type: 'result', 
                result: this._transformedPrompt,
                warning: 'Using mock response (backend not available)'
            });
            
            console.error('Transform error:', error);
        } finally {
            this._postMessage({ type: 'loading', loading: false });
        }
    }

    private async _copyToClipboard() {
        if (this._transformedPrompt) {
            await vscode.env.clipboard.writeText(this._transformedPrompt);
            vscode.window.showInformationMessage('Copied to clipboard!');
        } else {
            vscode.window.showWarningMessage('No transformed prompt to copy.');
        }
    }

    private async _sendToCopilot() {
        if (!this._transformedPrompt) {
            vscode.window.showWarningMessage('No transformed prompt to send.');
            return;
        }

        try {
            // Copy to clipboard first
            await vscode.env.clipboard.writeText(this._transformedPrompt);
            
            // Try to open Copilot Chat and paste the prompt
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            
            // Small delay to ensure the chat panel is focused
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Execute paste command
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            
            vscode.window.showInformationMessage('Prompt sent to Copilot Chat!');
        } catch (error) {
            // Fallback: just copy to clipboard
            vscode.window.showInformationMessage(
                'Copied to clipboard! Please paste into Copilot Chat manually.',
            );
        }
    }

    private _postMessage(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    public copyResult() {
        this._copyToClipboard();
    }

    public sendToCopilot() {
        this._sendToCopilot();
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Squeeze</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 20px 16px;
            height: 100vh;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }
        
        .header {
            text-align: center;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
        }
        
        .header h1 {
            font-size: 16px;
            font-weight: 600;
            letter-spacing: -0.3px;
            margin-bottom: 4px;
        }
        
        .header p {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-weight: 400;
        }
        
        .section {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .section-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--vscode-foreground);
            opacity: 0.9;
            letter-spacing: 0.01em;
        }
        
        textarea {
            width: 100%;
            min-height: 140px;
            padding: 14px;
            border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 8px;
            resize: vertical;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            line-height: 1.6;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        
        textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 3px rgba(var(--vscode-focusBorder), 0.1);
        }
        
        textarea::placeholder {
            color: var(--vscode-input-placeholderForeground);
            opacity: 0.6;
        }
        
        .select-wrapper {
            position: relative;
        }
        
        .select-wrapper::after {
            content: '';
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid var(--vscode-foreground);
            opacity: 0.6;
            pointer-events: none;
        }
        
        select {
            width: 100%;
            padding: 12px 40px 12px 14px;
            border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 8px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            appearance: none;
            transition: border-color 0.2s ease;
        }
        
        select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        select:hover {
            border-color: var(--vscode-focusBorder);
        }
        
        .transform-btn {
            width: 100%;
            padding: 14px 20px;
            background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground, var(--vscode-button-background)) 100%);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.02em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: transform 0.15s ease, opacity 0.15s ease;
        }
        
        .transform-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .transform-btn:active {
            transform: translateY(0);
        }
        
        .transform-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .result-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-height: 0;
        }
        
        .result-box {
            flex: 1;
            padding: 14px;
            border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border-radius: 8px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            line-height: 1.6;
            min-height: 120px;
        }
        
        .result-box.empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            opacity: 0.6;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
        }
        
        .action-btn {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.15s ease;
        }
        
        .copy-btn {
            background-color: transparent;
            color: var(--vscode-foreground);
        }
        
        .copy-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        
        .copilot-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: transparent;
        }
        
        .copilot-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .action-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
        }
        
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .warning {
            font-size: 11px;
            color: var(--vscode-editorWarning-foreground);
            padding: 10px 12px;
            background-color: var(--vscode-inputValidation-warningBackground);
            border-radius: 6px;
            border-left: 3px solid var(--vscode-editorWarning-foreground);
        }
        
        .icon {
            width: 14px;
            height: 14px;
            opacity: 0.9;
        }
        
        .shortcut-hint {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            opacity: 0.7;
            margin-top: -8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>✨ Squeeze</h1>
        <p>Transform your prompts intelligently</p>
    </div>
    
    <div class="section">
        <label class="section-label">Your Prompt</label>
        <textarea id="promptInput" placeholder="Enter your prompt here..."></textarea>
    </div>
    
    <div class="section">
        <label class="section-label">Transformation Mode</label>
        <div class="select-wrapper">
            <select id="modeSelect">
                <option value="enhance">✨ Enhance — Make it more detailed</option>
                <option value="xml">📋 XML — Structure with tags</option>
                <option value="compress">🗜️ Compress — Make it concise</option>
            </select>
        </div>
    </div>
    
    <div class="section">
        <button class="transform-btn" id="transformBtn">
            <span id="btnText">Transform Prompt</span>
            <div class="spinner" id="spinner" style="display: none;"></div>
        </button>
        <div class="shortcut-hint">⌘/Ctrl + Enter</div>
    </div>
    
    <div class="result-container">
        <label class="section-label">Result</label>
        <div class="result-box empty" id="resultBox">Your transformed prompt will appear here...</div>
        <div class="warning" id="warning" style="display: none;"></div>
        <div class="action-buttons">
            <button class="action-btn copy-btn" id="copyBtn" disabled>
                <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 4h8v8H4V4zm1 1v6h6V5H5zM2 2v8h1V3h7V2H2z"/>
                </svg>
                Copy
            </button>
            <button class="action-btn copilot-btn" id="copilotBtn" disabled>
                <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM8 11c-1.5 0-2.5-1-2.5-1h5s-1 1-2.5 1z"/>
                </svg>
                Send to Copilot
            </button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        let selectedMode = 'enhance';
        let hasResult = false;
        
        // Mode selection via dropdown
        document.getElementById('modeSelect').addEventListener('change', (e) => {
            selectedMode = e.target.value;
        });
        
        // Transform button
        document.getElementById('transformBtn').addEventListener('click', () => {
            const prompt = document.getElementById('promptInput').value;
            vscode.postMessage({
                type: 'transform',
                prompt: prompt,
                mode: selectedMode
            });
        });
        
        // Copy button
        document.getElementById('copyBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'copy' });
        });
        
        // Send to Copilot button
        document.getElementById('copilotBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'sendToCopilot' });
        });
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'loading':
                    const transformBtn = document.getElementById('transformBtn');
                    const btnText = document.getElementById('btnText');
                    const spinner = document.getElementById('spinner');
                    
                    if (message.loading) {
                        transformBtn.disabled = true;
                        btnText.textContent = 'Transforming...';
                        spinner.style.display = 'block';
                    } else {
                        transformBtn.disabled = false;
                        btnText.textContent = 'Transform Prompt';
                        spinner.style.display = 'none';
                    }
                    break;
                    
                case 'result':
                    const resultBox = document.getElementById('resultBox');
                    const warning = document.getElementById('warning');
                    const copyBtn = document.getElementById('copyBtn');
                    const copilotBtn = document.getElementById('copilotBtn');
                    
                    resultBox.textContent = message.result;
                    resultBox.classList.remove('empty');
                    
                    if (message.warning) {
                        warning.textContent = message.warning;
                        warning.style.display = 'block';
                    } else {
                        warning.style.display = 'none';
                    }
                    
                    hasResult = true;
                    copyBtn.disabled = false;
                    copilotBtn.disabled = false;
                    break;
            }
        });
        
        // Allow Ctrl/Cmd+Enter to transform
        document.getElementById('promptInput').addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                document.getElementById('transformBtn').click();
            }
        });
    </script>
</body>
</html>`;
    }
}
