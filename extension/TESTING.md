# Testing the Squeeze Extension

## Prerequisites

1. **Node.js and npm** installed
2. **Python 3** installed (for the server)
3. **VS Code** installed

## Step 1: Install Extension Dependencies

```bash
cd extension
npm install
```

## Step 2: Compile the Extension

```bash
npm run compile
```

Or for watch mode (auto-recompiles on changes):
```bash
npm run watch
```

## Step 3: Start the Compression Server

In a separate terminal:

```bash
cd server
pip install -r requirements.txt
python main.py
```

The server should start on `http://localhost:8000`. You can verify it's running by visiting `http://localhost:8000/health` in your browser.

## Step 4: Launch Extension in Development Mode

### Option A: Using VS Code's Extension Development Host

1. Open the `extension` folder in VS Code
2. Press `F5` or go to **Run > Start Debugging**
3. A new "Extension Development Host" window will open with your extension loaded

### Option B: Using Command Line

If you have a launch configuration, you can also use:
```bash
code --extensionDevelopmentPath=./extension
```

## Step 5: Test the Extension

1. **In the Extension Development Host window:**

   - Open the Chat panel (View > Chat or `Ctrl+L` / `Cmd+L`)
   - Type `@squeeze` followed by a message, for example:
     ```
     @squeeze Hello, can you help me understand this code?
     ```

2. **Have some files open** in the editor (the extension will collect files from visible editors)

3. **Watch the chat response:**
   - You should see "🔄 Compressing context..." 
   - Then "📤 Sending compressed content to LLM..."
   - The response should show compressed content (first 10 characters of each file/prompt for testing)

## Step 6: Verify Server Communication

Check the server terminal - you should see POST requests to `/compress` with your data.

You can also test the server directly with curl:

```bash
curl -X POST http://localhost:8000/compress \
  -H "Content-Type: application/json" \
  -d '{
    "model": "test",
    "prompt": "Hello world this is a test",
    "files": [{"path": "/test/file.py", "content": "def hello(): pass"}]
  }'
```

Expected response:
```json
{
  "compressedPrompt": "Hello worl",
  "compressedFiles": [{"path": "/test/file.py", "content": "def hello()"}],
  "compressedTerminal": null,
  "compressed": null,
  "error": null
}
```

## Step 7: Test Settings

1. Open Settings (File > Preferences > Settings or `Ctrl+,` / `Cmd+,`)
2. Search for "squeeze"
3. Verify settings are available:
   - `squeeze.apiEndpoint` (should default to `http://localhost:8000/compress`)
   - `squeeze.compressPrompt`
   - `squeeze.compressFiles`
   - `squeeze.compressTerminalOutput`
   - `squeeze.compressionModel`
   - `squeeze.targetLLM`

## Troubleshooting

### Extension doesn't appear in chat

- Make sure the extension compiled successfully (`npm run compile`)
- Check the Extension Development Host's Developer Console (Help > Toggle Developer Tools)
- Look for errors in the console

### Server connection errors

- Verify the server is running: `curl http://localhost:8000/health`
- Check the API endpoint setting matches your server URL
- Check CORS settings in the server (should allow all origins for testing)

### No files being collected

- Make sure you have files open in visible editors
- Files must have `file://` scheme (not untitled or other schemes)
- Check the extension logs in the Developer Console

### Compressed content not showing

- Check server logs for incoming requests
- Verify the server response format matches expected structure
- Check the Developer Console for errors

## Debugging Tips

1. **Open Developer Console** in Extension Development Host:
   - Help > Toggle Developer Tools
   - Check Console tab for errors and logs

2. **Check Extension Output**:
   - View > Output
   - Select "Log (Extension Host)" from dropdown
   - Look for "squeeze activated" message

3. **Server Logs**:
   - The FastAPI server will show request logs in the terminal
   - Add print statements in `server/main.py` for debugging

4. **Network Inspection**:
   - Use Developer Tools > Network tab to see API requests
   - Verify request/response payloads

## Quick Test Checklist

- [ ] Extension compiles without errors
- [ ] Server starts and responds to `/health`
- [ ] Extension appears in chat as `@squeeze`
- [ ] Sending a message to `@squeeze` triggers compression
- [ ] Server receives POST requests to `/compress`
- [ ] Compressed content appears in chat response
- [ ] Settings are accessible and configurable
