"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "~/components/ui/button";

interface HeroProps {
  isLoggedIn: boolean;
}

export default function Hero({ isLoggedIn }: HeroProps) {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
        Compress your CoPilot Prompts
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
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
