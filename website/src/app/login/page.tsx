import { LoginOptions } from "~/components/login-options";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function LoginPage() {
	const session = await auth();

	if (session?.user) {
		redirect("/");
	}
	else {
		return (
			<main className="flex min-h-[70vh] items-center justify-center px-6 py-16 text-white">
				<div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-8 text-center shadow-lg">
					<h1 className="text-2xl font-semibold">Sign In</h1>
					<p className="mt-2 text-sm text-white/70">
						Choose a provider to continue.
					</p>
					<div className="mt-6">
						<LoginOptions />
					</div>
				</div>
			</main>
		)
	}
}
