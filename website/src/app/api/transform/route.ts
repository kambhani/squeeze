import { NextRequest, NextResponse } from "next/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { apiKey, text, scheme, data } = body;

		// Create tRPC context and caller
		const ctx = await createTRPCContext({
			headers: req.headers,
		});
		const caller = createCaller(ctx);

		// Call the publicCreate procedure
		const result = await caller.transform.publicCreate({
			apiKey,
			text,
			scheme,
			data,
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in /api/transform:", error);
		
		// Handle tRPC errors
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			"message" in error
		) {
			const statusCode = error.code === "UNAUTHORIZED" ? 401 : 400;
			return NextResponse.json(
				{ error: String(error.message) || "An error occurred" },
				{ status: statusCode }
			);
		}

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
