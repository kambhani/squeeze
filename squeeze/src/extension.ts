// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SqueezeViewProvider } from './SqueezeViewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Squeeze extension is now active!');

	// Create the webview provider for the sidebar
	const squeezeViewProvider = new SqueezeViewProvider(context.extensionUri);

	// Register the webview view provider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SqueezeViewProvider.viewType,
			squeezeViewProvider
		)
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('squeeze.transformPrompt', () => {
			// Focus on the Squeeze sidebar
			vscode.commands.executeCommand('workbench.view.extension.squeeze-sidebar');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('squeeze.copyToClipboard', () => {
			squeezeViewProvider.copyResult();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('squeeze.sendToCopilot', () => {
			squeezeViewProvider.sendToCopilot();
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
