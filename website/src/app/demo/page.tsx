"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { skipToken } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

export default function DemoPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [prompt, setPrompt] = useState("");
	const [transformation, setTransformation] = useState<"tokenc" | "lingua">("tokenc");
	const [shouldFetch, setShouldFetch] = useState(false);

	const { data, isLoading, error, refetch } = api.transform.protectedCreate.useQuery(
		(shouldFetch && prompt.length > 0
			? {
					text: prompt,
					scheme: transformation,
				}
			: skipToken) as any,
		{
			retry: false,
		}
	);

	// Redirect if not authenticated
	if (status === "loading") {
		return (
			<main className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-16">
				<Loader2 className="h-8 w-8 animate-spin text-white" />
			</main>
		);
	}

	if (status === "unauthenticated") {
		router.push("/");
		return null;
	}

	const handleExecute = () => {
		if (prompt.trim().length === 0) return;
		setShouldFetch(true);
		void refetch();
	};

	const resultText = isLoading
		? "Loading..."
		: error
			? `Error: ${error.message}`
			: data?.compressed ?? "";

	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16 text-white">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold">Demo</h1>
				<p className="text-white/70">Test out sample query transformations.</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Left side - Input */}
				<div className="flex flex-col gap-4">
					<div className="space-y-2">
						<label htmlFor="prompt" className="text-sm font-medium text-white/90">
							Prompt
						</label>
						<Textarea
							id="prompt"
							value={prompt}
							onChange={(e) => {
								setPrompt(e.target.value);
								setShouldFetch(false);
							}}
							placeholder="Enter your prompt here..."
							className="min-h-[400px] resize-none font-mono text-sm"
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="transformation" className="text-sm font-medium text-white/90">
							Transformation
						</label>
						<Select
							value={transformation}
							onValueChange={(value) => {
								setTransformation(value as "tokenc" | "lingua");
								setShouldFetch(false);
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select transformation" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="tokenc">TOKENC</SelectItem>
								<SelectItem value="lingua">LINGUA</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Button
						onClick={handleExecute}
						disabled={isLoading || prompt.trim().length === 0}
						className="w-full"
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Executing...
							</>
						) : (
							"Execute"
						)}
					</Button>
				</div>

				{/* Right side - Output */}
				<div className="flex flex-col gap-4">
					<div className="space-y-2">
						<label htmlFor="result" className="text-sm font-medium text-white/90">
							Result
						</label>
						<Textarea
							id="result"
							value={resultText}
							disabled
							className="min-h-[400px] resize-none font-mono text-sm"
							placeholder={isLoading ? "Loading..." : "Results will appear here..."}
						/>
					</div>
				</div>
			</div>
		</main>
	);
}
