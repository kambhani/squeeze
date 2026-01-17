import * as vscode from 'vscode';
import { getTerminalBuffer } from './terminalUtils';
import { compressText } from './compression';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "squeeze" is now active!');

    const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {
        try {
            // 1. Capture Terminal Buffer
            stream.progress('Capturing terminal buffer...');
            const rawBuffer = await getTerminalBuffer();

            if (!rawBuffer || rawBuffer.trim().length === 0) {
                stream.markdown('No active terminal or empty buffer found.');
                return;
            }

            // 2. Compress
            stream.progress('Squeezing logs...');
            const { compressed, originalSize, compressedSize } = compressText(rawBuffer);
            const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

            stream.markdown(`**Compression Stats:** Reduced ${originalSize} chars to ${compressedSize} chars (Saved ${ratio}%)\n\n`);

            // 3. Select LM
            const [model] = await vscode.lm.selectChatModels({ family: 'gpt-4' });
            if (!model) {
                stream.markdown('No GPT-4 model found. Please ensure you have GitHub Copilot Chat installed and active.');
                return;
            }

            // 4. Construct Prompt
            const messages = [
                vscode.LanguageModelChatMessage.User(`You are an expert developer assistant. 
Here are the compressed terminal logs from the user's session. They have been filtered to focus on errors and important context.

[BEGIN LOGS]
${compressed}
[END LOGS]

User Query: ${request.prompt || 'Analyze these logs for errors and suggest a fix.'}
`)
            ];

            // 5. Send to LM
            stream.progress('Thinking...');
            const chatResponse = await model.sendRequest(messages, {}, token);

            // 6. Stream Response
            for await (const fragment of chatResponse.text) {
                stream.markdown(fragment);
            }

        } catch (err) {
            if (err instanceof Error) {
                stream.markdown(`\n\nError: ${err.message}`);
            } else {
                stream.markdown('\n\nAn unknown error occurred.');
            }
        }
    };

    const participant = vscode.chat.createChatParticipant('logsqueeze.squeeze', handler);
    participant.iconPath = new vscode.ThemeIcon('hubot'); // Use a generic icon for now
    context.subscriptions.push(participant);
}

export function deactivate() {}
