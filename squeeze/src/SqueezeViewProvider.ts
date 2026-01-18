import * as vscode from "vscode";

export class SqueezeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "squeeze.sidebarView";

  private _view?: vscode.WebviewView;
  private _transformedPrompt: string = "";

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public copyResult(): void {
    if (this._transformedPrompt) {
      vscode.env.clipboard.writeText(this._transformedPrompt);
      vscode.window.showInformationMessage("Copied to clipboard!");
    }
  }

  public sendToCopilot(): void {
    if (this._transformedPrompt) {
      vscode.env.clipboard.writeText(this._transformedPrompt);
      vscode.commands.executeCommand("workbench.action.chat.open", this._transformedPrompt);
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "transform": {
          await this._transformPrompt(
            data.prompt, 
            data.mode, 
            data.apiKey,
            data.aggressiveness,
            data.minTokens,
            data.maxTokens
          );
          break;
        }
        case "copy": {
          await vscode.env.clipboard.writeText(data.text);
          vscode.window.showInformationMessage("Copied to clipboard!");
          break;
        }
        case "sendToCopilot": {
          await vscode.env.clipboard.writeText(data.text);
          await vscode.commands.executeCommand(
            "workbench.action.chat.open",
            data.text
          );
          break;
        }
        case "saveApiKey": {
          const config = vscode.workspace.getConfiguration("squeeze");
          await config.update("apiKey", data.apiKey, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage("API key saved!");
          break;
        }
      }
    });
  }

  private async _transformPrompt(
    prompt: string, 
    mode: string, 
    apiKey: string,
    aggressiveness: number = 0.5,
    minTokens: number | null = null,
    maxTokens: number | null = null
  ) {
    if (!this._view) {
      return;
    }

    if (!apiKey || apiKey.trim() === "") {
      this._view.webview.postMessage({
        type: "error",
        message: "Please enter your API key",
      });
      return;
    }

    const config = vscode.workspace.getConfiguration("squeeze");
    const backendUrl =
      config.get<string>("backendUrl") || "http://localhost:3000";

    try {
      this._view.webview.postMessage({ type: "loading", loading: true });

      // Build the request payload matching the tRPC transform.publicCreate schema
      const requestPayload: {
        apiKey: string;
        text: string;
        scheme: string;
        aggressiveness: number;
        minTokens?: number;
        maxTokens?: number;
      } = {
        apiKey: apiKey.trim(),
        text: prompt,
        scheme: mode,
        aggressiveness: aggressiveness,
      };
      
      // Only include optional fields if they have values
      if (minTokens !== null && minTokens > 0) {
        requestPayload.minTokens = minTokens;
      }
      if (maxTokens !== null && maxTokens > 0) {
        requestPayload.maxTokens = maxTokens;
      }

      // tRPC query expects input as a JSON-encoded query parameter for GET requests
      // or as a JSON body for POST requests (mutations)
      // Using POST for the transform operation
      const response = await fetch(`${backendUrl}/api/trpc/transform.publicCreate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: requestPayload
        })
      });

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json() as { 
            error?: { 
              message?: string;
              json?: {
                message?: string;
              }
            } 
          };
          if (errorData?.error?.json?.message) {
            errorMessage = errorData.error.json.message;
          } else if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // ignore parse error
        }
        throw new Error(errorMessage);
      }

      const data = await response.json() as { 
        result?: { 
          data?: {
            json?: string;
          } | string;
        }; 
        data?: string;
      };
      
      // tRPC wraps the response - handle both possible formats
      let transformedPrompt: string;
      if (data?.result?.data) {
        if (typeof data.result.data === 'object' && 'json' in data.result.data) {
          transformedPrompt = data.result.data.json as string;
        } else {
          transformedPrompt = data.result.data as string;
        }
      } else if (data?.data) {
        transformedPrompt = data.data;
      } else {
        transformedPrompt = String(data);
      }
      
      this._transformedPrompt = transformedPrompt;

      this._view.webview.postMessage({
        type: "result",
        transformedPrompt: transformedPrompt,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      this._view.webview.postMessage({
        type: "error",
        message: `Transform failed: ${errorMessage}`,
      });
    } finally {
      this._view.webview.postMessage({ type: "loading", loading: false });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <title>Squeeze</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 16px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-sideBar-background);
          line-height: 1.5;
          overflow-x: hidden;
          overflow-y: auto;
          min-height: 100vh;
        }
        
        .container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 20px;
        }
        
        .header {
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--vscode-widget-border);
        }
        
        .header h1 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
          letter-spacing: -0.3px;
        }
        
        .header p {
          font-size: 12px;
          opacity: 0.7;
        }
        
        .section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .section-label {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.8;
        }
        
        .slider-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .slider-value {
          font-size: 12px;
          font-weight: 600;
          color: var(--vscode-textLink-foreground);
          min-width: 32px;
          text-align: right;
        }
        
        .slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--vscode-input-background);
          outline: none;
          -webkit-appearance: none;
          appearance: none;
          cursor: pointer;
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--vscode-button-background);
          cursor: pointer;
          border: 2px solid var(--vscode-button-foreground);
          transition: transform 0.1s;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--vscode-button-background);
          cursor: pointer;
          border: 2px solid var(--vscode-button-foreground);
        }
        
        .token-inputs {
          display: flex;
          gap: 10px;
        }
        
        .token-input-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .token-input-label {
          font-size: 10px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .token-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border-radius: 6px;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s;
        }
        
        .token-input:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
        }
        
        .token-input::placeholder {
          opacity: 0.5;
        }
        
        .api-key-container {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .api-key-input {
          flex: 1;
          min-width: 120px;
          padding: 10px 12px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border-radius: 6px;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .api-key-input:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
          box-shadow: 0 0 0 3px rgba(var(--vscode-focusBorder), 0.1);
        }
        
        .save-key-btn {
          padding: 10px 12px;
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .save-key-btn:hover {
          background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .prompt-input {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border-radius: 6px;
          resize: vertical;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          line-height: 1.5;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .prompt-input:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
          box-shadow: 0 0 0 3px rgba(var(--vscode-focusBorder), 0.1);
        }
        
        .prompt-input::placeholder {
          opacity: 0.5;
        }
        
        .mode-select {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border-radius: 6px;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }
        
        .mode-select:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
          box-shadow: 0 0 0 3px rgba(var(--vscode-focusBorder), 0.1);
        }
        
        .transform-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-button-hoverBackground));
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        
        .transform-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .transform-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .hint {
          font-size: 11px;
          opacity: 0.5;
          text-align: center;
          margin-top: -8px;
        }
        
        .result-container {
          display: none;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }
        
        .result-container.visible {
          display: flex !important;
        }
        
        .result-box {
          padding: 16px;
          background-color: var(--vscode-textBlockQuote-background);
          border: 1px solid var(--vscode-widget-border);
          border-radius: 8px;
          min-height: 120px;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        .result-box.empty {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.5;
          font-style: italic;
        }
        
        .result-actions {
          display: flex;
          gap: 10px;
        }
        
        .action-btn {
          flex: 1;
          padding: 10px 8px;
          border: 1px solid var(--vscode-button-border);
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .action-btn:hover {
          background-color: var(--vscode-button-secondaryHoverBackground);
          transform: translateY(-1px);
        }
        
        .action-btn.primary {
          background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-button-hoverBackground));
          color: var(--vscode-button-foreground);
          border: none;
        }
        
        .error-message {
          padding: 12px 14px;
          background-color: var(--vscode-inputValidation-errorBackground);
          border: 1px solid var(--vscode-inputValidation-errorBorder);
          border-left: 3px solid var(--vscode-inputValidation-errorBorder);
          border-radius: 6px;
          font-size: 12px;
          color: var(--vscode-errorForeground);
        }
        
        .loading {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍋 Squeeze</h1>
          <p>Transform your prompts</p>
        </div>
        
        <div class="section">
          <label class="section-label">API Key</label>
          <div class="api-key-container">
            <input 
              type="password" 
              id="apiKey" 
              class="api-key-input" 
              placeholder="Enter your API key..."
            />
            <button class="save-key-btn" id="saveKeyBtn">Save</button>
          </div>
        </div>
        
        <div class="section">
          <label class="section-label">Your Prompt</label>
          <textarea 
            id="promptInput" 
            class="prompt-input" 
            placeholder="Enter your prompt here..."
          ></textarea>
        </div>
        
        <div class="section">
          <label class="section-label">Transformation Mode</label>
          <select id="modeSelect" class="mode-select">
            <option value="enhance">✨ Enhance — Make it more detailed</option>
            <option value="xml">📋 XML — Structure with XML tags</option>
            <option value="compress">🗜️ Compress — Make it concise</option>
          </select>
        </div>
        
        <div class="section">
          <label class="section-label">Compression Settings</label>
          <div class="slider-container">
            <div class="slider-header">
              <span class="token-input-label">Aggressiveness</span>
              <span id="aggressivenessValue" class="slider-value">0.5</span>
            </div>
            <input 
              type="range" 
              id="aggressiveness" 
              class="slider" 
              min="0" 
              max="1" 
              step="0.1" 
              value="0.5"
            />
          </div>
          <div class="token-inputs">
            <div class="token-input-group">
              <label class="token-input-label">Min Tokens</label>
              <input 
                type="number" 
                id="minTokens" 
                class="token-input" 
                placeholder="e.g. 100"
                min="0"
              />
            </div>
            <div class="token-input-group">
              <label class="token-input-label">Max Tokens</label>
              <input 
                type="number" 
                id="maxTokens" 
                class="token-input" 
                placeholder="e.g. 1000"
                min="0"
              />
            </div>
          </div>
        </div>
        
        <button id="transformBtn" class="transform-btn">
          Transform Prompt
        </button>
        <p class="hint">⌘/Ctrl + Enter to transform</p>
        
        <div id="errorContainer" class="error-message" style="display: none;"></div>
        
        <div id="resultContainer" class="result-container">
          <label class="section-label">Result</label>
          <div id="resultBox" class="result-box empty">
            Your transformed prompt will appear here
          </div>
          <div class="result-actions">
            <button id="copyBtn" class="action-btn">📋 Copy</button>
            <button id="copilotBtn" class="action-btn primary">🚀 Send to Copilot</button>
          </div>
        </div>
      </div>
      
      <script>
        const vscode = acquireVsCodeApi();
        
        const apiKeyInput = document.getElementById('apiKey');
        const saveKeyBtn = document.getElementById('saveKeyBtn');
        const promptInput = document.getElementById('promptInput');
        const modeSelect = document.getElementById('modeSelect');
        const aggressivenessSlider = document.getElementById('aggressiveness');
        const aggressivenessValue = document.getElementById('aggressivenessValue');
        const minTokensInput = document.getElementById('minTokens');
        const maxTokensInput = document.getElementById('maxTokens');
        const transformBtn = document.getElementById('transformBtn');
        const resultContainer = document.getElementById('resultContainer');
        const resultBox = document.getElementById('resultBox');
        const copyBtn = document.getElementById('copyBtn');
        const copilotBtn = document.getElementById('copilotBtn');
        const errorContainer = document.getElementById('errorContainer');
        
        let currentResult = '';
        
        // Load saved state
        const state = vscode.getState();
        if (state?.apiKey) {
          apiKeyInput.value = state.apiKey;
        }
        if (state?.aggressiveness !== undefined) {
          aggressivenessSlider.value = state.aggressiveness;
          aggressivenessValue.textContent = state.aggressiveness;
        }
        if (state?.minTokens) {
          minTokensInput.value = state.minTokens;
        }
        if (state?.maxTokens) {
          maxTokensInput.value = state.maxTokens;
        }
        
        // Update slider value display
        aggressivenessSlider.addEventListener('input', (e) => {
          aggressivenessValue.textContent = e.target.value;
          vscode.setState({ ...vscode.getState(), aggressiveness: e.target.value });
        });
        
        saveKeyBtn.addEventListener('click', () => {
          const apiKey = apiKeyInput.value.trim();
          if (apiKey) {
            vscode.setState({ ...vscode.getState(), apiKey: apiKey });
            vscode.postMessage({ type: 'saveApiKey', apiKey: apiKey });
          }
        });
        
        transformBtn.addEventListener('click', transform);
        
        promptInput.addEventListener('keydown', (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            transform();
          }
        });
        
        copyBtn.addEventListener('click', () => {
          if (currentResult) {
            vscode.postMessage({ type: 'copy', text: currentResult });
          }
        });
        
        copilotBtn.addEventListener('click', () => {
          if (currentResult) {
            vscode.postMessage({ type: 'sendToCopilot', text: currentResult });
          }
        });
        
        function transform() {
          const prompt = promptInput.value.trim();
          const mode = modeSelect.value;
          const apiKey = apiKeyInput.value.trim();
          const aggressiveness = parseFloat(aggressivenessSlider.value);
          const minTokens = minTokensInput.value ? parseInt(minTokensInput.value) : null;
          const maxTokens = maxTokensInput.value ? parseInt(maxTokensInput.value) : null;
          
          if (!apiKey) {
            showError('Please enter your API key');
            return;
          }
          
          if (!prompt) {
            showError('Please enter a prompt');
            return;
          }
          
          if (minTokens && maxTokens && minTokens > maxTokens) {
            showError('Min tokens cannot be greater than max tokens');
            return;
          }
          
          hideError();
          
          // Save state
          vscode.setState({ 
            ...vscode.getState(), 
            apiKey: apiKey,
            aggressiveness: aggressivenessSlider.value,
            minTokens: minTokensInput.value,
            maxTokens: maxTokensInput.value
          });
          
          vscode.postMessage({
            type: 'transform',
            prompt: prompt,
            mode: mode,
            apiKey: apiKey,
            aggressiveness: aggressiveness,
            minTokens: minTokens,
            maxTokens: maxTokens
          });
        }
        
        function showError(message) {
          errorContainer.textContent = message;
          errorContainer.style.display = 'block';
        }
        
        function hideError() {
          errorContainer.style.display = 'none';
        }
        
        window.addEventListener('message', (event) => {
          const message = event.data;
          
          switch (message.type) {
            case 'loading':
              transformBtn.disabled = message.loading;
              transformBtn.innerHTML = message.loading 
                ? '<span class="loading"></span>Transforming...'
                : 'Transform Prompt';
              break;
              
            case 'result':
              currentResult = message.transformedPrompt;
              resultBox.textContent = currentResult;
              resultBox.classList.remove('empty');
              resultContainer.classList.add('visible');
              hideError();
              break;
              
            case 'error':
              showError(message.message);
              break;
          }
        });
      </script>
    </body>
    </html>`;
  }
}
