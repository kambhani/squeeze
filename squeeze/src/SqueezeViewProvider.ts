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
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 12px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .section {
            margin-bottom: 16px;
        }
        
        .section-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--vscode-sideBarSectionHeader-foreground);
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        
        textarea {
            width: 100%;
            min-height: 120px;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            resize: vertical;
            font-family: inherit;
            font-size: inherit;
            line-height: 1.4;
        }
        
        textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        textarea::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        
        .mode-selector {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }
        
        .mode-btn {
            flex: 1;
            min-width: 70px;
            padding: 6px 12px;
            border: 1px solid var(--vscode-button-border, transparent);
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.15s ease;
        }
        
        .mode-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .mode-btn.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .transform-btn {
            width: 100%;
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .transform-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .transform-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .result-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
        
        .result-box {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border-radius: 4px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            line-height: 1.5;
            min-height: 100px;
        }
        
        .result-box.empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        .action-buttons {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        
        .action-btn {
            flex: 1;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .copy-btn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .copy-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .copilot-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .copilot-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .spinner {
            width: 14px;
            height: 14px;
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
            margin-top: 4px;
            padding: 4px 8px;
            background-color: var(--vscode-inputValidation-warningBackground);
            border-radius: 4px;
        }
        
        .icon {
            width: 14px;
            height: 14px;
        }
    </style>
</head>
<body>
    <div class="section">
        <div class="section-title">Input Prompt</div>
        <textarea id="promptInput" placeholder="Enter your prompt here..."></textarea>
    </div>
    
    <div class="section">
        <div class="section-title">Transformation Mode</div>
        <div class="mode-selector">
            <button class="mode-btn active" data-mode="enhance">✨ Enhance</button>
            <button class="mode-btn" data-mode="xml">📋 XML</button>
            <button class="mode-btn" data-mode="compress">🗜️ Compress</button>
        </div>
    </div>
    
    <div class="section">
        <button class="transform-btn" id="transformBtn">
            <span id="btnText">Transform</span>
            <div class="spinner" id="spinner" style="display: none;"></div>
        </button>
    </div>
    
    <div class="result-container section">
        <div class="section-title">Result</div>
        <div class="result-box empty" id="resultBox">Transformed prompt will appear here...</div>
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
        
        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedMode = btn.dataset.mode;
            });
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
                        btnText.textContent = 'Transform';
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
