"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { api } from "~/trpc/react";

export function ApiKeySection() {
	const [copied, setCopied] = useState(false);
	const [open, setOpen] = useState(false);
	const { data: apiKey, refetch } = api.user.getApiKey.useQuery();
	const updateApiKeyMutation = api.user.updateApiKey.useMutation({
		onSuccess: () => {
			refetch();
			setOpen(false);
		},
	});

	const handleCopy = async () => {
		if (apiKey) {
			await navigator.clipboard.writeText(apiKey);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleReset = async () => {
		await updateApiKeyMutation.mutateAsync();
	};

	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-6">
			<div className="space-y-4">
				<div className="space-y-2">
					<p className="text-sm uppercase tracking-wide text-white/50">
						API Key
					</p>
					<p className="text-sm text-white/70">
						Use this key to authenticate API requests.
					</p>
				</div>
				{apiKey ? (
					<div className="flex items-center gap-2">
						<code className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
							{apiKey}
						</code>
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopy}
							disabled={copied}
						>
							{copied ? "Copied!" : "Copy"}
						</Button>
					</div>
				) : (
					<p className="text-sm text-white/60">No API key generated yet.</p>
				)}
				<Button
					variant="secondary"
					onClick={() => setOpen(true)}
					disabled={updateApiKeyMutation.isPending}
				>
					{updateApiKeyMutation.isPending
						? "Generating..."
						: apiKey
							? "Reset API Key"
							: "Generate API Key"}
				</Button>
			</div>
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{apiKey ? "Reset API Key?" : "Generate API Key?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{apiKey
								? "Are you sure you want to reset your API key? The old key will no longer work and you'll need to update any applications using it."
								: "This will generate a new API key that you can use to authenticate API requests."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleReset}
							disabled={updateApiKeyMutation.isPending}
						>
							{apiKey ? "Reset" : "Generate"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
