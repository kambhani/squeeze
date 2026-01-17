import * as vscode from "vscode";
import { CompressionRequest, CompressionResponse } from "./interfaces";

async function compressText(
	text: string,
	model: string,
	apiEndpoint: string
): Promise<CompressionResponse> {
	try {
		const payload: CompressionRequest = { text, model };
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

		return (await response.json()) as CompressionResponse;
	} catch (error) {
		console.error("Compression API error:", error);
		return {
			compressedText: "",
			inputTokens: 0,
			outputTokens: 0,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

async function callLLM(
	compressedText: string,
	request: vscode.ChatRequest,
	stream: vscode.ChatResponseStream,
	token: vscode.CancellationToken
): Promise<void> {
	try {
		// Use VS Code's Language Model API to call the selected LLM
		if (!vscode.lm) {
			throw new Error("Language Model API not available in this VS Code version");
		}

		// Get the model from the request (user's selected model) or select one
		let model: vscode.LanguageModelChat | undefined = request.model;

		// If no model in request, try to select the target LLM
		if (!model) {
			const models = await vscode.lm.selectChatModels({
				vendor: "copilot",
			});
			// Try to find the requested model, or use the first available
			model = models.find((m) => m.id.includes("gpt-4")) || models[0];
		}

		if (!model) {
			throw new Error("No language model available");
		}

		const messages: vscode.LanguageModelChatMessage[] = [
			vscode.LanguageModelChatMessage.User(compressedText),
		];

		const response = await model.sendRequest(messages, {}, token);

		// Stream the LLM response
		for await (const part of response.stream) {
			if (part instanceof vscode.LanguageModelTextPart) {
				stream.markdown(part.value);
			}
		}
	} catch (error) {
		if (error instanceof vscode.LanguageModelError) {
			let errorMsg = `Error: ${error.code}`;
			if (error.code === "NoPermissions") {
				errorMsg = "Permission denied. Please allow the extension to access language models.";
			} else if (error.code === "NotFound") {
				errorMsg = "Language model not found. Please check your VS Code settings.";
			} else if (error.code === "Blocked") {
				errorMsg = "Request blocked. Quota may be exceeded.";
			}
			stream.markdown(`❌ **Error calling LLM**: ${errorMsg}`);
		} else {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			stream.markdown(`❌ **Error calling LLM**: ${errorMessage}`);
		}
		console.error("LLM API error:", error);
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log("squeeze activated");

	const participant = vscode.chat.createChatParticipant(
		"squeeze",
		async (request, chatContext, stream, token) => {
			const config = vscode.workspace.getConfiguration("squeeze");
			const compressionModel = config.get<string>("model", "default");
			const apiEndpoint = config.get<string>(
				"apiEndpoint",
				"http://localhost:8000/compress"
			);

			if (!apiEndpoint) {
				stream.markdown(
					"⚠️ **Error**: API endpoint not configured. Please set `squeeze.apiEndpoint` in settings."
				);
				return;
			}

			if (!request.prompt) {
				stream.markdown("⚠️ **Error**: No text provided to compress.");
				return;
			}

			stream.markdown("🔄 Compressing text...");

			try {
				const result = await compressText(
					request.prompt,
					compressionModel,
					apiEndpoint
				);

				if (result.error) {
					stream.markdown(`❌ **Compression Error**: ${result.error}`);
					return;
				}

				// Show compression stats
				const compressionRatio =
					result.inputTokens > 0
						? ((1 - result.outputTokens / result.inputTokens) * 100).toFixed(1)
						: "0.0";

				const modelName = request.model?.id || "selected model";
				stream.markdown(
					`✅ **Compression Complete**\n\n` +
						`**Input Tokens**: ${result.inputTokens}\n` +
						`**Output Tokens**: ${result.outputTokens}\n` +
						`**Compression Ratio**: ${compressionRatio}%\n\n` +
						`📤 **Calling ${modelName} with compressed context...**\n\n`
				);

				// Call the LLM with compressed text so it can act as an agent
				await callLLM(result.compressedText, request, stream, token);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				stream.markdown(`❌ **Error**: ${errorMessage}`);
				console.error("Squeeze extension error:", error);
			}
		}
	);

	context.subscriptions.push(participant);
}

export function deactivate() {}
