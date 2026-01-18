import Image from "next/image";
import Link from "next/link";

import { UserMenu } from "~/components/user-menu";
import { auth } from "~/server/auth";

export async function Navbar() {
	const session = await auth();
	return (
		<header className="w-full border-b border-white/10 bg-black/30 backdrop-blur">
			<nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-white">
				<Link className="text-lg font-semibold tracking-tight" href="/">
					<Image src="/logos/SQUEEZE.png" className="dark:invert" alt="Squeeze" width={100} height={50} />
				</Link>

			<div className="flex items-center gap-3">
				{session?.user ? (
					<>
						<Link
							className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
							href="/demo"
						>
							Demo
						</Link>
						<UserMenu />
					</>
				) : (
					<Link
						className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
						href="/login"
					>
						Login
					</Link>
				)}
			</div>
			</nav>
		</header>
	);
}
