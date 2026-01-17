# Squeeze Extension

A VS Code extension that compresses text tokens before sending to LLMs, allowing agents to make edits to your codebase.

## How It Works

This extension provides a chat participant (`@squeeze`) that:
1. Compresses your text using a configurable compression model
2. Automatically calls the selected LLM (like Copilot) with the compressed context
3. The LLM acts as an agent and can make edits to your codebase based on the compressed context

## Usage

1. **Configure your compression API endpoint** in VS Code settings:
   - `squeeze.apiEndpoint`: Your compression API URL (default: `http://localhost:8000/compress`)
   - `squeeze.model`: Compression model to use (default: `default`)

2. **Use the extension**:
   - In VS Code chat, select your preferred LLM model (e.g., Copilot GPT-4)
   - Type `@squeeze` followed by your message
   - The extension will:
     - Compress your text using the configured compression model
     - Display compression statistics (input/output tokens, compression ratio)
     - Automatically call the selected LLM with the compressed context
     - The LLM will respond and can make edits to your codebase as an agent

## API Contract

### Request Format

Your compression API should accept POST requests with this format:

```json
{
  "text": "string (text to compress)",
  "model": "string (compression model name)"
}
```

### Response Format

Your API should return compressed content in this format:

```json
{
  "compressedText": "string (compressed text)",
  "inputTokens": 123,
  "outputTokens": 45,
  "error": "string (optional, error message if compression fails)"
}
```

## Settings

All settings are prefixed with `squeeze.`:

- `apiEndpoint` (required): Your compression API endpoint (default: `http://localhost:8000/compress`)
- `model`: Compression model name to send to your API (default: `default`)

## Development

```bash
npm install
npm run compile
npm run watch  # For development
```

