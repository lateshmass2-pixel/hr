import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-white/20">
      <header className="flex h-16 items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="h-6 w-6 rounded-full bg-white" />
          HEMS
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost" }), "text-gray-400 hover:text-white hover:bg-white/5")}
          >
            Log in
          </Link>
          <Link
            href="/login?tab=signup"
            className={cn(buttonVariants(), "bg-white text-black hover:bg-gray-200")}
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="pt-32 pb-24 text-center px-6">
          <h1 className="text-5xl font-medium tracking-tight sm:text-7xl mb-6 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
            The future of <br /> HR management.
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            Automate your hiring, streamline task management, and empower your workforce with an AI-driven platform designed for modern teams.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/login?tab=signup"
              className={cn(buttonVariants({ size: "lg" }), "bg-white text-black hover:bg-gray-200 h-12 px-8 text-base")}
            >
              Start for free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Features preview (Mockup) */}
        <section className="px-6 pb-24">
          <div className="max-w-5xl mx-auto rounded-xl border border-white/10 bg-white/5 p-2 ring-1 ring-white/10 shadow-2xl shadow-blue-500/10">
            <div className="rounded-lg bg-black/50 aspect-video flex items-center justify-center border border-white/5">
              <span className="text-gray-500">Dashboard Preview Mockup</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
