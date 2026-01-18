// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { TokenCompanyClient } from './api/tokenCompanyClient';
import { OptimizationMode } from './types';

export function activate(context: vscode.ExtensionContext) {
	console.log('Squeeze extension is now active!');

	const client = new TokenCompanyClient();

	// Register the sidebar webview provider
	const provider = new SqueezeSidebarProvider(context.extensionUri, client);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SqueezeSidebarProvider.viewType, provider)
	);

	// Command to copy text to clipboard
	const copyCommand = vscode.commands.registerCommand('squeeze.copyToClipboard', async (text: string) => {
		await vscode.env.clipboard.writeText(text);
		vscode.window.showInformationMessage('Optimized prompt copied to clipboard!');
	});

	// Command to insert into Copilot chat (opens chat with text)
	const insertToChatCommand = vscode.commands.registerCommand('squeeze.insertToChat', async (text: string) => {
		await vscode.env.clipboard.writeText(text);
		await vscode.commands.executeCommand('workbench.action.chat.open');
		vscode.window.showInformationMessage('Prompt copied! Paste it into Copilot (Cmd+V)');
	});

	context.subscriptions.push(copyCommand, insertToChatCommand);
}

export function deactivate() {
	console.log('Squeeze extension deactivated');
}

class SqueezeSidebarProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'squeeze.sidebarView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _client: TokenCompanyClient
	) {}

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

		webviewView.webview.html = this._getHtmlForWebview();

		// Handle messages from webview
		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case 'optimize':
					await this._handleOptimize(message.prompt, message.mode);
					break;
				case 'copy':
					await vscode.commands.executeCommand('squeeze.copyToClipboard', message.text);
					break;
				case 'insertToChat':
					await vscode.commands.executeCommand('squeeze.insertToChat', message.text);
					break;
			}
		});
	}

	private async _handleOptimize(prompt: string, mode: OptimizationMode) {
		if (!this._view) {
			return;
		}

		try {
			this._view.webview.postMessage({ command: 'loading', loading: true });

			const result = await this._client.optimizePrompt(prompt, mode);

			this._view.webview.postMessage({
				command: 'result',
				optimizedPrompt: result.optimizedPrompt,
				originalTokenCount: result.originalTokenCount,
				optimizedTokenCount: result.optimizedTokenCount,
				compressionRatio: result.compressionRatio
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this._view.webview.postMessage({
				command: 'error',
				message: errorMessage
			});
		} finally {
			this._view.webview.postMessage({ command: 'loading', loading: false });
		}
	}

	private _getHtmlForWebview(): string {
		const config = vscode.workspace.getConfiguration('squeeze');
		const defaultMode = config.get<string>('defaultMode') || 'compress';

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
        }
        .section {
            margin-bottom: 16px;
        }
        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 600;
            color: var(--vscode-foreground);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        select, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-family: inherit;
            font-size: 13px;
        }
        textarea {
            min-height: 120px;
            resize: vertical;
        }
        select:focus, textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        button {
            width: 100%;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 8px;
            transition: opacity 0.2s;
        }
        button:hover {
            opacity: 0.9;
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-success {
            background-color: #28a745;
            color: white;
        }
        .result-section {
            display: none;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-input-border);
        }
        .result-section.visible {
            display: block;
        }
        .stats {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
        }
        .stat {
            padding: 4px 8px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 4px;
            font-size: 11px;
        }
        .optimized-prompt {
            background-color: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
            padding: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 12px;
        }
        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            display: none;
        }
        .error.visible {
            display: block;
        }
        .loading {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .loading.visible {
            display: flex;
        }
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-foreground);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .mode-hint {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="section">
        <label for="mode">Mode</label>
        <select id="mode">
            <option value="compress" ${defaultMode === 'compress' ? 'selected' : ''}>Compress</option>
            <option value="enhance" ${defaultMode === 'enhance' ? 'selected' : ''}>Enhance</option>
            <option value="xml" ${defaultMode === 'xml' ? 'selected' : ''}>XML Conversion</option>
        </select>
        <p class="mode-hint" id="modeHint">Reduce tokens while preserving meaning</p>
    </div>

    <div class="section">
        <label for="prompt">Your Prompt</label>
        <textarea id="prompt" placeholder="Enter your prompt here..."></textarea>
    </div>

    <button class="btn-primary" id="optimizeBtn">🚀 Optimize</button>
    <button class="btn-secondary" id="clearBtn">Clear</button>

    <div class="loading" id="loading">
        <div class="spinner"></div>
        <span>Optimizing...</span>
    </div>

    <div class="error" id="error"></div>

    <div class="result-section" id="resultSection">
        <label>Optimized Prompt</label>
        <div class="stats" id="stats"></div>
        <div class="optimized-prompt" id="optimizedPrompt"></div>
        <button class="btn-primary" id="copyBtn">📋 Copy</button>
        <button class="btn-success" id="insertBtn">💬 Open Copilot & Copy</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const modeSelect = document.getElementById('mode');
        const promptInput = document.getElementById('prompt');
        const optimizeBtn = document.getElementById('optimizeBtn');
        const clearBtn = document.getElementById('clearBtn');
        const copyBtn = document.getElementById('copyBtn');
        const insertBtn = document.getElementById('insertBtn');
        const resultSection = document.getElementById('resultSection');
        const optimizedPromptDiv = document.getElementById('optimizedPrompt');
        const statsDiv = document.getElementById('stats');
        const loadingDiv = document.getElementById('loading');
        const errorDiv = document.getElementById('error');
        const modeHint = document.getElementById('modeHint');

        const modeHints = {
            'compress': 'Reduce tokens while preserving meaning',
            'enhance': 'Improve clarity and effectiveness',
            'xml': 'Convert to structured XML format'
        };

        let currentOptimizedPrompt = '';

        modeSelect.addEventListener('change', () => {
            modeHint.textContent = modeHints[modeSelect.value];
        });

        optimizeBtn.addEventListener('click', () => {
            const prompt = promptInput.value.trim();
            if (!prompt) {
                showError('Please enter a prompt.');
                return;
            }
            hideError();
            vscode.postMessage({
                command: 'optimize',
                prompt: prompt,
                mode: modeSelect.value
            });
        });

        clearBtn.addEventListener('click', () => {
            promptInput.value = '';
            resultSection.classList.remove('visible');
            hideError();
            currentOptimizedPrompt = '';
        });

        copyBtn.addEventListener('click', () => {
            if (currentOptimizedPrompt) {
                vscode.postMessage({ command: 'copy', text: currentOptimizedPrompt });
            }
        });

        insertBtn.addEventListener('click', () => {
            if (currentOptimizedPrompt) {
                vscode.postMessage({ command: 'insertToChat', text: currentOptimizedPrompt });
            }
        });

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'loading':
                    if (message.loading) {
                        loadingDiv.classList.add('visible');
                        optimizeBtn.disabled = true;
                    } else {
                        loadingDiv.classList.remove('visible');
                        optimizeBtn.disabled = false;
                    }
                    break;
                case 'result':
                    currentOptimizedPrompt = message.optimizedPrompt;
                    optimizedPromptDiv.textContent = message.optimizedPrompt;
                    
                    let statsHtml = '';
                    if (message.originalTokenCount) {
                        statsHtml += '<div class="stat">' + message.originalTokenCount + ' → ';
                        if (message.optimizedTokenCount) {
                            statsHtml += message.optimizedTokenCount + ' tokens</div>';
                        }
                    }
                    if (message.compressionRatio) {
                        const reduction = ((1 - message.compressionRatio) * 100).toFixed(0);
                        statsHtml += '<div class="stat">-' + reduction + '%</div>';
                    }
                    statsDiv.innerHTML = statsHtml;
                    
                    resultSection.classList.add('visible');
                    break;
                case 'error':
                    showError(message.message);
                    break;
            }
        });

        function showError(msg) {
            errorDiv.textContent = '❌ ' + msg;
            errorDiv.classList.add('visible');
        }

        function hideError() {
            errorDiv.classList.remove('visible');
        }

        // Ctrl+Enter to submit
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                optimizeBtn.click();
            }
        });
    </script>
</body>
</html>`;
	}
}
