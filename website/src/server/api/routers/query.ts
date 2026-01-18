import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

export const queryRouter = createTRPCRouter({
	getQueries: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.query.findMany({
			where: { userId: ctx.session.user.id },
		});
	}),

	getUserTotals: protectedProcedure.query(async ({ ctx }) => {
		const totalInputTokens = await ctx.db.query.aggregate({
			_sum: {
				inputTokens: true,
			},
			where: { userId: ctx.session.user.id },
		});
		const totalOutputTokens = await ctx.db.query.aggregate({
			_sum: {
				outputTokens: true,
			},
			where: { userId: ctx.session.user.id },
		});

		return {
			totalInputTokens: totalInputTokens._sum.inputTokens || 0,
			totalOutputTokens: totalOutputTokens._sum.outputTokens || 0,
		};
	}),

	getTotals: publicProcedure.query(async ({ ctx }) => {
		const totalQueries = await ctx.db.query.count();
		const totalInputTokens = await ctx.db.query.aggregate({
			_sum: {
				inputTokens: true,
			},
		});
		const totalOutputTokens = await ctx.db.query.aggregate({
			_sum: {
				outputTokens: true,
			},
		});

		return {
			totalQueries,
			totalInputTokens: totalInputTokens._sum.inputTokens || 0,
			totalOutputTokens: totalOutputTokens._sum.outputTokens || 0,
		};
	}),
});
