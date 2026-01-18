"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

import { Button } from "~/components/ui/button";

const providers = [
	{
		id: "discord",
		title: "Discord",
		logo: "/logos/discord-logo.png",
	},
];

export function LoginOptions() {
	return (
		<div className="flex flex-col gap-2">
			{providers.map((provider) => (
				<Button
					key={provider.id}
					type="button"
					variant="ghost"
					className="h-auto w-full justify-between rounded-lg px-4 py-3 text-white hover:bg-white/10"
					onClick={() => void signIn(provider.id)}
				>
					<span className="flex items-center gap-2">
						<Image
							alt={provider.title}
							src={provider.logo}
							width={20}
							height={15}
						/>
						<span>Sign in with {provider.title}</span>
					</span>
				</Button>
			))}
		</div>
	);
}
