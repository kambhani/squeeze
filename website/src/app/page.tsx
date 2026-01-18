import Link from "next/link";
import { Button } from "~/components/ui/button";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
	const session = await auth();
	return (
		<HydrateClient>
			<div className="mx-auto flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
				<p className="text-4xl font-bold text-white mb-4">Squeeze</p>
				<p className="text-white/70 mb-4">Compress your CoPilot Prompts</p>
				<Button asChild>
					<Link href={session?.user ? "/account" : "/login"}>
						{session?.user ? "Go to Account" : "Get Started"}
					</Link>
				</Button>
			</div>
		</HydrateClient>
	);
}
