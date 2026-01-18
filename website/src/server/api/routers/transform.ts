import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

enum Transformation {
	ENHANCE = "enhance",
	XML = "xml",
	TOKENC = "tokenc",
	LINGUA = "lingua",
}

const CompressionOutputSchema = z.object({
	compressed: z.string(),
	input_tokens: z.number(),
	output_tokens: z.number(),
});

type CompressionOutput = z.infer<typeof CompressionOutputSchema>;

// Input schema with optional parameters
const TransformInputSchema = z.object({
	apiKey: z.string().min(1),
	text: z.string().min(1),
	scheme: z.nativeEnum(Transformation),
	aggressiveness: z.number().min(0).max(1).optional().default(0.5),
	minTokens: z.number().positive().optional().nullable(),
	maxTokens: z.number().positive().optional().nullable(),
});

export const transformRouter = createTRPCRouter({
	protectedCreate: protectedProcedure
		.input(
			z.object({
				text: z.string().min(1),
				scheme: z.nativeEnum(Transformation),
				aggressiveness: z.number().min(0).max(1).optional().default(0.5),
				minTokens: z.number().positive().optional().nullable(),
				maxTokens: z.number().positive().optional().nullable(),
			})
		)
		.query(async ({ input }) => {
			console.log("=== PROTECTED TRANSFORM REQUEST ===");
			console.log("Text:", input.text.substring(0, 100) + (input.text.length > 100 ? "..." : ""));
			console.log("Scheme:", input.scheme);
			console.log("Aggressiveness:", input.aggressiveness);
			console.log("Min Tokens:", input.minTokens);
			console.log("Max Tokens:", input.maxTokens);
			console.log("===================================");

			return await transformInput(
				input.text,
				input.scheme,
				input.aggressiveness,
				input.minTokens ?? undefined,
				input.maxTokens ?? undefined
			);
		}),

	publicCreate: publicProcedure
		.input(TransformInputSchema)
		.query(async ({ ctx, input }) => {
			// Log incoming request for debugging
			console.log("=== PUBLIC TRANSFORM REQUEST ===");
			console.log("API Key:", input.apiKey.substring(0, 8) + "...");
			console.log("Text:", input.text.substring(0, 100) + (input.text.length > 100 ? "..." : ""));
			console.log("Scheme:", input.scheme);
			console.log("Aggressiveness:", input.aggressiveness);
			console.log("Min Tokens:", input.minTokens);
			console.log("Max Tokens:", input.maxTokens);
			console.log("================================");

			// TODO: Re-enable authentication when database is available
			// For now, skip API key validation and use mock data
			/*
			const user = await ctx.db.user.findFirst({
				where: {
					apiKey: input.apiKey,
				},
			});

			if (!user) {
				console.log("❌ Invalid API key");
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Invalid API key",
				});
			}

			console.log("✅ API key valid for user:", user.email ?? user.id);
			*/

			console.log("⚠️ AUTH BYPASSED - Using mock data for testing");

			// Return mock data for testing
			const mockResponses: Record<string, string> = {
				enhance: `[Enhanced Version]\n\n${input.text}\n\nPlease provide a comprehensive, detailed response with:\n- Step-by-step explanations\n- Relevant examples\n- Best practices and recommendations\n- Potential edge cases to consider`,
				xml: `<prompt>\n  <context>User request for assistance</context>\n  <instruction>${input.text}</instruction>\n  <constraints>\n    <constraint>Be concise and accurate</constraint>\n    <constraint>Provide actionable guidance</constraint>\n  </constraints>\n  <output_format>Structured response</output_format>\n</prompt>`,
				tokenc: input.text.split(' ').filter((word, i) => i % 2 === 0 || word.length > 3).join(' '),
				lingua: input.text.replace(/\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can|need|dare|ought|used|to)\b/gi, '').replace(/\s+/g, ' ').trim(),
			};

			const compressed = mockResponses[input.scheme] || input.text;
			const inputTokens = Math.ceil(input.text.length / 4);
			const outputTokens = Math.ceil(compressed.length / 4);

			console.log("✅ Mock response generated");
			console.log(`   Input tokens: ${inputTokens}, Output tokens: ${outputTokens}`);

			return {
				compressed,
				input_tokens: inputTokens,
				output_tokens: outputTokens,
			};
		}),
});

const transformInput = async (
	text: string,
	scheme: Transformation,
	aggressiveness: number = 0.5,
	minTokens?: number,
	maxTokens?: number,
): Promise<CompressionOutput> => {
	try {
		const requestBody = {
			text,
			scheme,
			aggressiveness,
			min_tokens: minTokens,
			max_tokens: maxTokens,
		};

		console.log("=== CALLING BACKEND ===");
		console.log("URL: http://localhost:5000/transform");
		console.log("Body:", JSON.stringify(requestBody, null, 2));
		console.log("=======================");

		const response = await fetch("http://localhost:5000/transform", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			console.log("❌ Backend returned error:", response.status, response.statusText);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Transform endpoint returned ${response.status}: ${response.statusText}`,
			});
		}

		const data = await response.json();
		console.log("✅ Backend response:", JSON.stringify(data, null, 2));

		// Validate the response conforms to CompressionOutput type
		const validatedData = CompressionOutputSchema.parse(data);

		return validatedData;
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.log("❌ Zod validation error:", error.message);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Invalid response format from transform endpoint: ${error.message}`,
			});
		}

		if (error instanceof TRPCError) {
			throw error;
		}

		// Handle network errors or other fetch errors
		console.log("❌ Network/other error:", error);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message:
				error instanceof Error
					? `Failed to call transform endpoint: ${error.message}`
					: "Failed to call transform endpoint",
		});
	}
};
