import { SessionProvider } from "next-auth/react";

export default function DemoLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <SessionProvider>{children}</SessionProvider>;
}
