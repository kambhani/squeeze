import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

enum Transformation {
	XML = "xml",
	ENHANCE = "enhance",
	COMPRESS = "compress",
}

export const transformRouter = createTRPCRouter({
	protectedCreate: protectedProcedure
		.input(
			z.object({
				text: z.string().min(1),
				scheme: z.nativeEnum(Transformation),
			})
		)
		.query(async ({ input }) => {
			return await transformInput(input.text, input.scheme);
		}),

	publicCreate: publicProcedure
		.input(
			z.object({
				apiKey: z.string().min(1),
				text: z.string().min(1),
				scheme: z.nativeEnum(Transformation),
			})
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

			return await transformInput(input.text, input.scheme);
		}),
});

const transformInput = async (text: string, scheme: Transformation) => {
	switch (scheme) {
		case Transformation.XML: {
			return;
		}
		case Transformation.ENHANCE: {
			return;
		}
		case Transformation.COMPRESS: {
			return;
		}
	}
};
