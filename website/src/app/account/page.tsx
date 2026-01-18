import { redirect } from "next/navigation";

import { ApiKeySection } from "./api-key-section";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function AccountPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/");
	}

	const queries = await api.query.getQueries();
	const totals = await api.query.getUserTotals();

	// Calculate cost savings: (inputTokens - outputTokens) * ($3 / 1,000,000)
	const tokensSaved = totals.totalInputTokens - totals.totalOutputTokens;
	const costSavings = Math.round((tokensSaved * 3) / 1_000_000 * 100) / 100;

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 text-white">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold">Account</h1>
				<p className="text-white/70">Manage your profile details.</p>
			</div>
			<div className="rounded-2xl border border-violet-500/50 shadow-lg shadow-violet-500/20 bg-white/5 p-6">
				<p className="text-sm uppercase tracking-wide text-white/50">Signed in as</p>
				<p className="text-xl font-semibold">{session.user.name ?? "User"}</p>
				{session.user.email ? (
					<p className="text-white/70">{session.user.email}</p>
				) : null}
			</div>

			<ApiKeySection />

			<h1 className="text-2xl font-semibold">Queries</h1>

			<div className="rounded-2xl border border-violet-500/50 shadow-lg shadow-violet-500/20 bg-white/5 p-6">
				<div className="grid grid-cols-3 gap-4">
					<div>
						<p className="text-sm uppercase tracking-wide text-white/50">Total Input Tokens</p>
						<p className="text-2xl font-semibold">{totals.totalInputTokens.toLocaleString()}</p>
					</div>
					<div>
						<p className="text-sm uppercase tracking-wide text-white/50">Total Output Tokens</p>
						<p className="text-2xl font-semibold">{totals.totalOutputTokens.toLocaleString()}</p>
					</div>
					<div>
						<p className="text-sm uppercase tracking-wide text-white/50">Total Cost Savings</p>
						<p className="text-2xl font-semibold">${costSavings.toFixed(2)}</p>
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-violet-500/50 shadow-lg shadow-violet-500/20 bg-white/5">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Input Tokens</TableHead>
							<TableHead>Output Tokens</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{queries?.length ? (
							queries.map((query) => (
								<TableRow key={query.id}>
									<TableCell>{query.time.toLocaleString()}</TableCell>
									<TableCell>{query.inputTokens}</TableCell>
									<TableCell>{query.outputTokens}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={3}
									className="text-center text-white/60"
								>
									No queries yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</main>
	);
}