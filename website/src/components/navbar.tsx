import Link from "next/link";
import { User } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { auth } from "~/server/auth";

export async function Navbar() {
	const session = await auth();

	return (
		<header className="w-full border-b border-white/10 bg-black/30 backdrop-blur">
			<nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-white">
				<Link className="text-lg font-semibold tracking-tight" href="/">
					Squeeze
				</Link>

				<div className="flex items-center gap-3">
					{session?.user ? (
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
								<DropdownMenuItem asChild>
									<Link href="/api/auth/signout">Log out</Link>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button
							asChild
							variant="outline"
							className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
						>
							<Link href="/api/auth/signin">Login</Link>
						</Button>
					)}
				</div>
			</nav>
		</header>
	);
}
