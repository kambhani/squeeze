// src/api/tokenCompanyClient.ts

import * as vscode from 'vscode';
import { OptimizationMode, OptimizationResponse } from '../types';

export class TokenCompanyClient {
    private getEndpoint(): string {
        const config = vscode.workspace.getConfiguration('squeeze');
        return config.get<string>('apiEndpoint') || 'https://api.thetokencompany.com/v1/optimize';
    }

    public async optimizePrompt(prompt: string, mode: OptimizationMode): Promise<OptimizationResponse> {
        const endpoint = this.getEndpoint();

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt, mode })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            return await response.json() as OptimizationResponse;

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to optimize: ${error.message}`);
            }
            throw error;
        }
    }
}
