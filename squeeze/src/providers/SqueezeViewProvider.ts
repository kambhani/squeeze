import * as vscode from 'vscode';

export class SqueezeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'squeeze.squeezeView';
    
    private _view?: vscode.WebviewView;
    private _lastTransformedPrompt: string = '';

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
                    await this._copyToClipboard(data.text);
                    break;
                case 'sendToCopilot':
                    await this._sendToCopilot(data.text);
                    break;
            }
        });
    }

    private async _transformPrompt(prompt: string, mode: string) {
        try {
            // Show loading state
            this._view?.webview.postMessage({ 
                type: 'loading', 
                isLoading: true 
            });

            // TODO: Replace with your actual backend endpoint
            const backendUrl = 'http://localhost:3000/transform';
            
            try {
                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt, mode }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json() as { transformedPrompt?: string; result?: string };
                this._lastTransformedPrompt = result.transformedPrompt || result.result || '';
                
                this._view?.webview.postMessage({ 
                    type: 'result', 
                    transformedPrompt: this._lastTransformedPrompt 
                });
            } catch (fetchError) {
                // If backend is not available, show a mock response for testing
                console.log('Backend not available, using mock response');
                
                // Mock transformation for testing purposes
                let mockResult = '';
                switch (mode) {
                    case 'enhance':
                        mockResult = `[ENHANCED] ${prompt}\n\nPlease provide a detailed, comprehensive response with examples and explanations.`;
                        break;
                    case 'xml':
                        mockResult = `<prompt>\n  <instruction>${prompt}</instruction>\n  <format>structured</format>\n  <detail_level>high</detail_level>\n</prompt>`;
                        break;
                    case 'compress':
                        mockResult = prompt.split(' ').filter((_, i) => i % 2 === 0).join(' ') + ' [compressed]';
                        break;
                    default:
                        mockResult = prompt;
                }
                
                this._lastTransformedPrompt = mockResult;
                
                this._view?.webview.postMessage({ 
                    type: 'result', 
                    transformedPrompt: this._lastTransformedPrompt,
                    isMock: true
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error transforming prompt: ${error}`);
            this._view?.webview.postMessage({ 
                type: 'error', 
                message: `Error: ${error}` 
            });
        } finally {
            this._view?.webview.postMessage({ 
                type: 'loading', 
                isLoading: false 
            });
        }
    }

    private async _copyToClipboard(text: string) {
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage('Copied to clipboard!');
    }

    private async _sendToCopilot(text: string) {
        try {
            // Copy to clipboard first
            await vscode.env.clipboard.writeText(text);
            
            // Open Copilot Chat and paste the prompt
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            
            // Small delay to ensure the chat panel is focused
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Try to insert the text into the chat input
            await vscode.commands.executeCommand('workbench.action.chat.insertIntoInput', text);
            
            vscode.window.showInformationMessage('Prompt sent to Copilot Chat!');
        } catch (error) {
            // Fallback: just copy and notify user
            vscode.window.showInformationMessage('Prompt copied! Please paste it into Copilot Chat.');
        }
    }

    public getLastTransformedPrompt(): string {
        return this._lastTransformedPrompt;
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
            letter-spacing: 0.5px;
            color: var(--vscode-sideBarSectionHeader-foreground);
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        }
        
        label {
            display: block;
            margin-bottom: 4px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        textarea {
            width: 100%;
            min-height: 120px;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            resize: vertical;
            outline: none;
        }
        
        textarea:focus {
            border-color: var(--vscode-focusBorder);
        }
        
        textarea::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        
        select {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border-radius: 4px;
            font-size: 12px;
            outline: none;
            cursor: pointer;
        }
        
        select:focus {
            border-color: var(--vscode-focusBorder);
        }
        
        .btn {
            width: 100%;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        
        .btn:hover {
            opacity: 0.9;
        }
        
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover:not(:disabled) {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-group {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        
        .btn-group .btn {
            flex: 1;
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
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            min-height: 100px;
        }
        
        .result-box.empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .loading {
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .loading.active {
            display: flex;
        }
        
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-descriptionForeground);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .mock-notice {
            font-size: 10px;
            color: var(--vscode-editorWarning-foreground);
            margin-top: 4px;
            padding: 4px 8px;
            background-color: var(--vscode-inputValidation-warningBackground);
            border-radius: 4px;
            display: none;
        }
        
        .mock-notice.visible {
            display: block;
        }
        
        .icon-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            color: var(--vscode-foreground);
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .icon-btn:hover {
            opacity: 1;
        }
        
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .result-actions {
            display: flex;
            gap: 4px;
        }
    </style>
</head>
<body>
    <div class="section">
        <div class="section-title">Input</div>
        <label for="prompt">Your Prompt</label>
        <textarea 
            id="prompt" 
            placeholder="Enter your prompt here..."
            rows="5"
        ></textarea>
    </div>
    
    <div class="section">
        <label for="mode">Transformation Mode</label>
        <select id="mode">
            <option value="enhance">✨ Enhance - Make more detailed</option>
            <option value="xml">📋 XML - Structure as XML</option>
            <option value="compress">🗜️ Compress - Make concise</option>
        </select>
    </div>
    
    <div class="section">
        <button class="btn btn-primary" id="transformBtn">
            Transform Prompt
        </button>
    </div>
    
    <div class="loading" id="loading">
        <div class="spinner"></div>
        <span>Transforming...</span>
    </div>
    
    <div class="section result-container">
        <div class="result-header">
            <div class="section-title" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">Result</div>
            <div class="result-actions">
                <button class="icon-btn" id="copyBtn" title="Copy to clipboard" disabled>
                    📋
                </button>
            </div>
        </div>
        <div class="result-box empty" id="result">
            Transformed prompt will appear here
        </div>
        <div class="mock-notice" id="mockNotice">
            ⚠️ Using mock response (backend not connected)
        </div>
        <div class="btn-group">
            <button class="btn btn-secondary" id="copyFullBtn" disabled>
                📋 Copy
            </button>
            <button class="btn btn-primary" id="sendToCopilotBtn" disabled>
                🚀 Send to Copilot
            </button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const promptInput = document.getElementById('prompt');
        const modeSelect = document.getElementById('mode');
        const transformBtn = document.getElementById('transformBtn');
        const resultBox = document.getElementById('result');
        const loadingEl = document.getElementById('loading');
        const copyBtn = document.getElementById('copyBtn');
        const copyFullBtn = document.getElementById('copyFullBtn');
        const sendToCopilotBtn = document.getElementById('sendToCopilotBtn');
        const mockNotice = document.getElementById('mockNotice');
        
        let currentResult = '';
        
        transformBtn.addEventListener('click', () => {
            const prompt = promptInput.value.trim();
            const mode = modeSelect.value;
            
            if (!prompt) {
                return;
            }
            
            vscode.postMessage({
                type: 'transform',
                prompt: prompt,
                mode: mode
            });
        });
        
        copyBtn.addEventListener('click', () => {
            if (currentResult) {
                vscode.postMessage({
                    type: 'copy',
                    text: currentResult
                });
            }
        });
        
        copyFullBtn.addEventListener('click', () => {
            if (currentResult) {
                vscode.postMessage({
                    type: 'copy',
                    text: currentResult
                });
            }
        });
        
        sendToCopilotBtn.addEventListener('click', () => {
            if (currentResult) {
                vscode.postMessage({
                    type: 'sendToCopilot',
                    text: currentResult
                });
            }
        });
        
        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'loading':
                    if (message.isLoading) {
                        loadingEl.classList.add('active');
                        transformBtn.disabled = true;
                    } else {
                        loadingEl.classList.remove('active');
                        transformBtn.disabled = false;
                    }
                    break;
                    
                case 'result':
                    currentResult = message.transformedPrompt;
                    resultBox.textContent = currentResult;
                    resultBox.classList.remove('empty');
                    copyBtn.disabled = false;
                    copyFullBtn.disabled = false;
                    sendToCopilotBtn.disabled = false;
                    
                    if (message.isMock) {
                        mockNotice.classList.add('visible');
                    } else {
                        mockNotice.classList.remove('visible');
                    }
                    break;
                    
                case 'error':
                    resultBox.textContent = message.message;
                    resultBox.classList.add('empty');
                    copyBtn.disabled = true;
                    copyFullBtn.disabled = true;
                    sendToCopilotBtn.disabled = true;
                    mockNotice.classList.remove('visible');
                    break;
            }
        });
        
        // Allow Ctrl+Enter to transform
        promptInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                transformBtn.click();
            }
        });
    </script>
</body>
</html>`;
    }
}
