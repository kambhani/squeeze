import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { v4 as uuidv4 } from "uuid";

export const userRouter = createTRPCRouter({
	updateApiKey: protectedProcedure.mutation(async ({ ctx }) => {
		return ctx.db.user.update({
			where: { id: ctx.session.user.id },
			data: { apiKey: uuidv4() },
		});
	}),
});
