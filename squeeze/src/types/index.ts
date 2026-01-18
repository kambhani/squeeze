// src/types/index.ts

export type OptimizationMode = 'compress' | 'enhance' | 'xml';

export interface OptimizationRequest {
    prompt: string;
    mode: OptimizationMode;
}

export interface OptimizationResponse {
    optimizedPrompt: string;
    originalTokenCount?: number;
    optimizedTokenCount?: number;
    compressionRatio?: number;
}

export interface TokenCompanyConfig {
    apiKey: string;
    apiEndpoint: string;
}