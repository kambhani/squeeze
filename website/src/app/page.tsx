import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";

import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import {motion} from "motion/react";
import Hero from "~/components/hero";

export default async function Home() {
  const session = await auth();
  return (
    <HydrateClient>
      <div className="relative min-h-screen overflow-hidden bg-black">
        {/* Aura background effects */}
        <div className="pointer-events-none absolute inset-0">
          {/* Primary aura - top center */}
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/30 blur-[120px]" />
          
          {/* Secondary aura - bottom left */}
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-blue-600/25 blur-[100px]" />
          
          {/* Tertiary aura - bottom right */}
          <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-indigo-500/20 blur-[80px]" />
          
          {/* Accent aura - center */}
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/15 blur-[60px]" />
        </div>

        {/* Content */}
        <Hero isLoggedIn={!!session?.user} />
		</div>
    </HydrateClient>
  );
}
