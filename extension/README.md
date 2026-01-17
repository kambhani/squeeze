# Squeeze Extension

A VS Code extension that compresses chat context (files, prompts, terminal output) before sending to LLMs to reduce costs.

## How It Works

**Important Limitation**: VS Code's extension API doesn't provide a way to directly intercept messages sent to other chat participants (like GitHub Copilot). This extension works as a **proxy participant** that compresses content before forwarding to your target LLM.

## Usage

1. **Configure your compression API endpoint** in VS Code settings:
   - `squeeze.apiEndpoint`: Your compression API URL

2. **Configure compression settings**:
   - `squeeze.compressPrompt`: Toggle prompt compression (default: false)
   - `squeeze.compressFiles`: Toggle file compression (default: true)
   - `squeeze.compressTerminalOutput`: Toggle terminal output compression (default: false)
   - `squeeze.compressionModel`: Compression model to use (sent to your API)
   - `squeeze.targetLLM`: Target LLM to forward to (default: copilot-gpt-4)
   - `squeeze.customLLMEndpoint`: Custom LLM endpoint (if targetLLM is "custom")

3. **Use the extension**:
   - In VS Code chat, type `@squeeze` followed by your message
   - The extension will:
     - Collect files from the context window
     - Compress them using your API
     - Forward the compressed content to your target LLM
     - Display the response

## API Contract

### Request Format

Your compression API should accept POST requests with this format:

```json
{
  "model": "string (compression model name)",
  "prompt": "string (optional, user's chat prompt)",
  "files": [
    {
      "path": "string (file path)",
      "content": "string (file content)"
    }
  ],
  "terminal": "string (optional, terminal output)"
}
```

### Response Format

Your API should return compressed content in this format:

```json
{
  "compressedPrompt": "string (optional, compressed prompt)",
  "compressedFiles": [
    {
      "path": "string (file path)",
      "content": "string (compressed file content)"
    }
  ],
  "compressedTerminal": "string (optional, compressed terminal output)",
  "compressed": "any (optional, custom format - will be used if provided)",
  "error": "string (optional, error message if compression fails)"
}
```

**Note**: If your API returns a `compressed` field, it will be used as-is (stringified if needed). Otherwise, the extension will use `compressedPrompt`, `compressedFiles`, and `compressedTerminal` to build the message.

## Workaround for Intercepting Other LLMs

Since VS Code doesn't allow intercepting messages to other chat participants directly, you have these options:

1. **Use @squeeze as a proxy**: Instead of messaging @copilot directly, message @squeeze which will compress and forward to Copilot.

2. **Manual workflow**: Use @squeeze to get compressed content, then copy and paste it to your preferred LLM.

3. **Custom keybinding**: Bind a command to intercept Enter key presses (limited by VS Code's chat UI constraints).

## Settings

All settings are prefixed with `squeeze.`:

- `apiEndpoint` (required): Your compression API endpoint
- `compressPrompt`: Enable/disable prompt compression
- `compressFiles`: Enable/disable file compression  
- `compressTerminalOutput`: Enable/disable terminal output compression
- `compressionModel`: Model name to send to your API
- `targetLLM`: Target LLM model (copilot-gpt-3.5-turbo, copilot-gpt-4, copilot-gpt-4-turbo, custom)
- `customLLMEndpoint`: Custom LLM API endpoint (if targetLLM is "custom")

## Development

```bash
npm install
npm run compile
npm run watch  # For development
```

## Limitations

- **Terminal Output**: VS Code API doesn't expose terminal output history. Terminal compression will show a warning.
- **Interception**: Cannot directly intercept messages to other chat participants due to VS Code API limitations.
- **Language Model API**: Automatic forwarding to built-in models may not work in all VS Code versions. The extension will fall back to displaying compressed content for manual copying.
