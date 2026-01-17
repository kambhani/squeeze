export interface CompressionRequest {
	text: string;
	model: string;
}

export interface CompressionResponse {
	compressedText: string;
	inputTokens: number;
	outputTokens: number;
	error?: string;
}
