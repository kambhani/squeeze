import * as vscode from 'vscode';

/**
 * Captures the content of the active terminal buffer using the clipboard hack.
 * 1. Focuses the active terminal.
 * 2. Selects all text.
 * 3. Copies to clipboard.
 * 4. Reads from clipboard.
 */
export async function getTerminalBuffer(): Promise<string> {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        throw new Error('No active terminal found.');
    }

    // Focus the terminal
    terminal.show();

    // Wait a bit for focus to settle
    await new Promise(resolve => setTimeout(resolve, 200));

    // Execute "Select All"
    await vscode.commands.executeCommand('workbench.action.terminal.selectAll');
    
    // Execute "Copy"
    await vscode.commands.executeCommand('workbench.action.terminal.copySelection');

    // Execute "Clear Selection" to avoid leaving the terminal in a selected state
    await vscode.commands.executeCommand('workbench.action.terminal.clearSelection');

    // Read from clipboard
    const text = await vscode.env.clipboard.readText();
    
    return text;
}
