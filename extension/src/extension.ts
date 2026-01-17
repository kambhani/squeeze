import * as vscode from "vscode";

interface CompressionRequest {
	model: string;
	prompt?: string;
	files?: Array<{ path: string; content: string }>;
	terminal?: string;
}

interface CompressionResponse {
	compressedPrompt?: string;
	compressedFiles?: Array<{ path: string; content: string }>;
	compressedTerminal?: string;
	// The API can return the compressed content in any format
	// This is a flexible structure that can be adapted
	compressed?: any;
	error?: string;
}

async function readFileContent(uri: vscode.Uri): Promise<string | null> {
	try {
		const document = await vscode.workspace.openTextDocument(uri);
		return document.getText();
	} catch (error) {
		console.error(`Failed to read file ${uri.fsPath}:`, error);
		return null;
	}
}

async function getTerminalOutput(): Promise<string> {
	// Get output from active terminal
	// Note: VS Code doesn't provide direct access to terminal output history
	// This is a limitation of the VS Code API - terminal output is not accessible
	// You may need to use a different approach or capture terminal output separately
	const terminals = vscode.window.terminals;
	if (terminals.length === 0) {
		return "";
	}

	// VS Code API doesn't expose terminal output directly
	// Consider using terminal output capture extension or implementing custom terminal monitoring
	// For now, return empty string
	vscode.window.showWarningMessage(
		"Terminal output compression is not fully supported - VS Code API doesn't expose terminal output history"
	);
	return "";
}

async function compressContent(
	payload: CompressionRequest,
	apiEndpoint: string
): Promise<CompressionResponse> {
	try {
		const response = await fetch(apiEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API error: ${response.status} - ${errorText}`);
		}

		const result = (await response.json()) as CompressionResponse;
		return result;
	} catch (error) {
		console.error("Compression API error:", error);
		return {
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

async function gatherContextFiles(
	chatContext: vscode.ChatContext,
	compressFiles: boolean
): Promise<Array<{ path: string; content: string }>> {
	const files: Array<{ path: string; content: string }> = [];
	const processedUris = new Set<string>();

	if (!compressFiles) {
		return files;
	}

	// First, get files from chat context references
	const contextRefs = (chatContext as any).references;
	if (contextRefs && Array.isArray(contextRefs)) {
		for (const reference of contextRefs) {
			if (reference && reference.uri && reference.uri.scheme === "file") {
				const uriString = reference.uri.toString();
				if (!processedUris.has(uriString)) {
					processedUris.add(uriString);
					const content = await readFileContent(reference.uri);
					if (content !== null) {
						files.push({
							path: reference.uri.fsPath,
							content: content,
						});
					}
				}
			}
		}
	}

	// Also check visible editors for additional context
	const visibleEditors = vscode.window.visibleTextEditors;
	for (const editor of visibleEditors) {
		if (editor.document.uri.scheme === "file") {
			const uriString = editor.document.uri.toString();
			if (!processedUris.has(uriString)) {
				processedUris.add(uriString);
				const content = editor.document.getText();
				files.push({
					path: editor.document.uri.fsPath,
					content: content,
				});
			}
		}
	}

	return files;
}

async function sendToTargetLLM(
	compressedContent: CompressionResponse,
	targetLLM: string,
	customEndpoint: string,
	stream: vscode.ChatResponseStream,
	token: vscode.CancellationToken
): Promise<void> {
	// Build the message to send to the target LLM
	let messageToSend = "";

	if (compressedContent.compressedPrompt) {
		messageToSend += compressedContent.compressedPrompt;
	}

	if (compressedContent.compressedFiles && compressedContent.compressedFiles.length > 0) {
		messageToSend += "\n\n## Files:\n\n";
		for (const file of compressedContent.compressedFiles) {
			messageToSend += `### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
		}
	}

	if (compressedContent.compressedTerminal) {
		messageToSend += `\n\n## Terminal Output:\n\`\`\`\n${compressedContent.compressedTerminal}\n\`\`\`\n`;
	}

	// If API returned a custom compressed format, use it
	if (compressedContent.compressed) {
		// Handle custom format - you can adapt this based on your API response
		messageToSend = JSON.stringify(compressedContent.compressed);
	}

	if (targetLLM === "custom" && customEndpoint) {
		// Send to custom endpoint
		try {
			const response = await fetch(customEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages: [
						{
							role: "user",
							content: messageToSend,
						},
					],
				}),
			});

			if (!response.ok) {
				throw new Error(`LLM API error: ${response.status}`);
			}

			const result = (await response.json()) as any;
			// Stream the response
			if (result.content) {
				stream.markdown(result.content);
			} else if (result.text) {
				stream.markdown(result.text);
			} else {
				stream.markdown(JSON.stringify(result));
			}
		} catch (error) {
			stream.markdown(
				`❌ **Error sending to LLM**: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		}
	} else {
		// For built-in models, we'll display the compressed content
		// The user can then copy it and send to their preferred LLM
		// Or we can try to use the Language Model API if available
		try {
			// Try to use Language Model API if available (VS Code 1.90+)
			if (vscode.lm && typeof (vscode.lm as any).requestLanguageModelAccess === 'function') {
				const access = await (vscode.lm as any).requestLanguageModelAccess(
					targetLLM,
					{ identifier: "squeeze", name: "Squeeze Extension" }
				);

				const messages: any[] = [
					{ role: "user", content: messageToSend },
				];

				const response = await access.makeChatRequest(messages, {}, new vscode.CancellationTokenSource().token);

				for await (const fragment of response.text) {
					stream.markdown(fragment);
				}
			} else {
				// Fallback: Display compressed content for user to copy
				stream.markdown(
					`✅ **Compressed content ready**\n\n` +
					`**Copy the content below and send it to ${targetLLM}:**\n\n` +
					`\`\`\`\n${messageToSend}\n\`\`\`\n\n` +
					`*Note: Automatic forwarding to ${targetLLM} is not available. Please copy the content above and send it manually.*`
				);
			}
		} catch (error) {
			// If Language Model API fails, show the compressed content
			stream.markdown(
				`✅ **Compressed content ready**\n\n` +
				`**Copy and send to ${targetLLM}:**\n\n` +
				`\`\`\`\n${messageToSend}\n\`\`\`\n\n` +
				`*Error forwarding automatically: ${error instanceof Error ? error.message : "Unknown error"}*`
			);
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log("squeeze activated");

	// Note: VS Code doesn't provide a direct API to intercept messages sent to other chat participants.
	// This extension works as a proxy participant that compresses content before forwarding to the target LLM.
	// Users should use @squeeze instead of directly messaging other LLMs to benefit from compression.

	// Create a proxy chat participant that compresses and forwards to target LLM
	const participant = vscode.chat.createChatParticipant(
		"squeeze",
		async (request, chatContext, stream, token) => {
			const config = vscode.workspace.getConfiguration("squeeze");
			const compressPrompt = config.get<boolean>("compressPrompt", false);
			const compressFiles = config.get<boolean>("compressFiles", true);
			const compressTerminal = config.get<boolean>(
				"compressTerminalOutput",
				false
			);
			const compressionModel = config.get<string>(
				"compressionModel",
				"default"
			);
			const apiEndpoint = config.get<string>("apiEndpoint", "");
			const targetLLM = config.get<string>("targetLLM", "copilot-gpt-4");
			const customEndpoint = config.get<string>("customLLMEndpoint", "");

			if (!apiEndpoint) {
				stream.markdown(
					"⚠️ **Error**: API endpoint not configured. Please set `squeeze.apiEndpoint` in settings."
				);
				return;
			}

			// Show processing message
			stream.markdown("🔄 Compressing context...");

			try {
				// Gather files from context
				const files = await gatherContextFiles(chatContext, compressFiles);

				// Get terminal output if needed
				let terminalOutput = "";
				if (compressTerminal) {
					terminalOutput = await getTerminalOutput();
				}

				// Prepare compression request
				const compressionRequest: CompressionRequest = {
					model: compressionModel,
				};

				if (compressPrompt && request.prompt) {
					compressionRequest.prompt = request.prompt;
				}

				if (compressFiles && files.length > 0) {
					compressionRequest.files = files;
				}

				if (compressTerminal && terminalOutput) {
					compressionRequest.terminal = terminalOutput;
				}

				// Send to compression API
				const compressed = await compressContent(
					compressionRequest,
					apiEndpoint
				);

				if (compressed.error) {
					stream.markdown(
						`❌ **Compression Error**: ${compressed.error}`
					);
					return;
				}

				// Forward compressed content to target LLM
				stream.markdown("📤 Sending compressed content to LLM...\n\n");
				await sendToTargetLLM(compressed, targetLLM, customEndpoint, stream, token);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				stream.markdown(`❌ **Error**: ${errorMessage}`);
				console.error("Squeeze extension error:", error);
			}
		}
	);

	// Register command for manual compression and send
	const compressAndSendCommand = vscode.commands.registerCommand(
		"squeeze.compressAndSend",
		async () => {
			// This command can be used as an alternative way to trigger compression
			// It opens a quick input to get the prompt
			const prompt = await vscode.window.showInputBox({
				prompt: "Enter your message to compress and send",
				placeHolder: "Type your message here...",
			});

			if (!prompt) {
				return;
			}

			// Trigger the chat participant with this prompt
			// Note: This is a workaround - ideally we'd intercept the chat directly
			await vscode.commands.executeCommand("workbench.action.chat.open", {
				query: `@squeeze ${prompt}`,
			});
		}
	);

	context.subscriptions.push(participant);
	context.subscriptions.push(compressAndSendCommand);
}

export function deactivate() {}
