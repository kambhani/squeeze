"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

interface HeroProps {
  isLoggedIn: boolean;
}

export default function Hero({ isLoggedIn }: HeroProps) {
  const { data: totals, isLoading } = api.query.getTotals.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const totalInputTokens = totals?.totalInputTokens ?? 0;
  const totalOutputTokens = totals?.totalOutputTokens ?? 0;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20, skewX: 0 }}
        animate={{ opacity: 1, y: 0, skewX: -16 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src="/logos/SQUEEZE.png"
          className="dark:invert"
          alt="Squeeze"
          width={200}
          height={100}
        />
      </motion.div>

      <motion.p
        className="mb-4 text-white/70"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
      >
        Compress your LLM Prompts and save on costs
      </motion.p>

      <motion.div
        className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.45 }}
      >
        {[
          { label: "Total Input Tokens", value: totalInputTokens },
          { label: "Total Output Tokens", value: totalOutputTokens },
        ].map((metric) => (
          <motion.div
            key={metric.label}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left shadow-lg shadow-cyan-500/10"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_60%)]" />
            <p className="relative text-xs uppercase tracking-[0.3em] text-white/50">
              {metric.label}
            </p>
            <motion.p
              className="relative mt-2 bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {isLoading ? "—" : metric.value.toLocaleString()}
            </motion.p>
            <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400"
                animate={{ x: ["-40%", "40%", "-40%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.75 }}
      >
        <Button asChild>
          <Link href={isLoggedIn ? "/account" : "/login"}>
            {isLoggedIn ? "Go to Account" : "Get Started"}
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
