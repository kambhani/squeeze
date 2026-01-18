import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

enum Transformation {
	TOKENC = "tokenc",
	LINGUA = "lingua",
}

const CompressionOutputSchema = z.object({
	compressed: z.string(),
	input_tokens: z.number(),
	output_tokens: z.number(),
});

type CompressionOutput = z.infer<typeof CompressionOutputSchema>;

export const transformRouter = createTRPCRouter({
	protectedCreate: protectedProcedure
		.input(
			z.object({
				text: z.string().min(1),
				scheme: z.nativeEnum(Transformation),
				data: z.record(z.unknown()).optional(),
			}),
		)
		.query(async ({ input }) => {
			return await transformInput(input.text, input.scheme, input.data);
		}),

	publicCreate: publicProcedure
		.input(
			z.object({
				apiKey: z.string().min(1),
				text: z.string().min(1),
				scheme: z.nativeEnum(Transformation),
				data: z.record(z.unknown()).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const user = await ctx.db.user.findFirst({
				where: {
					apiKey: input.apiKey,
				},
			});

			if (!user) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Invalid API key",
				});
			}

			return await transformInput(input.text, input.scheme, input.data);
		}),
});

const transformInput = async (
	text: string,
	scheme: Transformation,
	data?: Record<string, unknown>,
): Promise<CompressionOutput> => {
	try {
		const requestBody: Record<string, unknown> = {
			text,
			scheme,
		};

		if (data) {
			requestBody.data = data;
		}

		const response = await fetch("http://localhost:5001/transform", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Transform endpoint returned ${response.status}: ${response.statusText}`,
			});
		}

		const responseData = await response.json();

		// Validate the response conforms to CompressionOutput type
		const validatedData = CompressionOutputSchema.parse(responseData);

		return validatedData;
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Invalid response format from transform endpoint: ${error.message}`,
			});
		}

		if (error instanceof TRPCError) {
			throw error;
		}

		// Handle network errors or other fetch errors
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message:
				error instanceof Error
					? `Failed to call transform endpoint: ${error.message}`
					: "Failed to call transform endpoint",
		});
	}
};
