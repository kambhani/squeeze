"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function UserMenu() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="icon"
					variant="ghost"
					className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
				>
					<User className="h-5 w-5" />
					<span className="sr-only">Open user menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuItem asChild>
					<Link href="/account">Account</Link>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="cursor-pointer"
					onClick={() => void signOut()}
				>
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
