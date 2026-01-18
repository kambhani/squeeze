import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";

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
			}),
		)
		.query(async ({ ctx, input }) => {
			return await transformInput(
				input.text,
				input.scheme,
				ctx.session.user.id,
			);
		}),

	publicCreate: publicProcedure
		.input(
			z.object({
				apiKey: z.string().min(1),
				text: z.string().min(1),
				scheme: z.nativeEnum(Transformation),
			}),
		)
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

			return await transformInput(input.text, input.scheme, user.id);
		}),
});

const transformInput = async (
	text: string,
	scheme: Transformation,
	userId: string,
): Promise<CompressionOutput> => {
	try {
		const response = await fetch("http://localhost:5001/transform", {
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

		// Save query to database
		await db.query.create({
			data: {
				userId,
				inputTokens: validatedData.input_tokens,
				outputTokens: validatedData.output_tokens,
			},
		});

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
