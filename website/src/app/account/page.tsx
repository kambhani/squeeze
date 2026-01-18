import Link from "next/link";

import { auth } from "~/server/auth";

export default async function AccountPage() {
	const session = await auth();

	if (!session?.user) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-16 text-center">
				<h1 className="text-3xl font-semibold">Account</h1>
				<p className="text-white/70">You need to be logged in to view this page.</p>
				<Link
					className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
					href="/api/auth/signin"
				>
					Go to login
				</Link>
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 text-white">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold">Account</h1>
				<p className="text-white/70">Manage your profile details.</p>
			</div>
			<div className="rounded-2xl border border-white/10 bg-white/5 p-6">
				<p className="text-sm uppercase tracking-wide text-white/50">Signed in as</p>
				<p className="text-xl font-semibold">{session.user.name ?? "User"}</p>
				{session.user.email ? (
					<p className="text-white/70">{session.user.email}</p>
				) : null}
			</div>
		</main>
	);
}
