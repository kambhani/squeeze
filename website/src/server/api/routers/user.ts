import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { v4 as uuidv4 } from "uuid";

export const userRouter = createTRPCRouter({
	getApiKey: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
			select: { apiKey: true },
		});
		return user?.apiKey ?? null;
	}),

	updateApiKey: protectedProcedure.mutation(async ({ ctx }) => {
		return ctx.db.user.update({
			where: { id: ctx.session.user.id },
			data: { apiKey: uuidv4() },
		});
	}),
});
