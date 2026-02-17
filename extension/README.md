# Squeeze VS Code Extension

A VS Code sidebar extension that compresses prompts using TokenC or LLMLingua to reduce input token costs when working with AI tools.

## Features

- Sidebar panel for entering and compressing prompts
- Two compression modes: TokenC (aggressiveness, min/max tokens) and LLMLingua (rate)
- Copy compressed result to clipboard
- Send compressed result directly to GitHub Copilot chat
- Configurable backend URL and API key via VS Code settings
- Keyboard shortcut: `Ctrl/Cmd + Enter` to trigger compression

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `squeeze.backendUrl` | URL of the Squeeze backend server | `http://localhost:3000` |
| `squeeze.apiKey` | API key for authentication (generated from the website account page) | — |

## Source Files

- **`src/extension.ts`** — Entry point. Registers the `SqueezeViewProvider` as a sidebar webview and three commands: `squeeze.transformPrompt`, `squeeze.copyToClipboard`, and `squeeze.sendToCopilot`.
- **`src/SqueezeViewProvider.ts`** — Implements the sidebar UI and compression logic. Renders an HTML/CSS/JS webview with a prompt input, mode selector, parameter controls, and result display. On submit, sends a `POST` request to the backend's `/api/transform` endpoint with the API key, text, scheme, and optional parameters. Handles clipboard copy and Copilot integration.

## Development

```bash
npm install
npm run compile   # Compile TypeScript
npm run lint      # Run ESLint
```

Press `F5` in VS Code to launch the extension in a development host window.

## API

The extension calls `POST {backendUrl}/api/transform` with the following JSON body:

```json
{
  "apiKey": "string",
  "text": "string",
  "scheme": "tokenc" | "lingua",
  "data": {
    "aggressiveness": 0.5,
    "minTokens": null,
    "maxTokens": null,
    "rate": 0.5
  }
}
```

Response:

```json
{
  "compressed": "string",
  "input_tokens": 100,
  "output_tokens": 50
}
```
