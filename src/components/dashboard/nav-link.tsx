"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface NavLinkClientProps {
    href: string;
    icon: React.ReactNode;
    label: string;
}

// Spring animation config
const springConfig = {
    type: "spring" as const,
    stiffness: 400,
    damping: 25,
};

export function NavLinkClient({ href, icon, label }: NavLinkClientProps) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

    return (
        <motion.div
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            transition={springConfig}
            className="relative"
        >
            <Link
                href={href}
                className={cn(
                    "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                        ? "text-white bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                        : "text-gray-400 hover:text-gray-100 hover:bg-[#2C2C2C]"
                )}
            >
                {/* Active Glow Accent - Left Border */}
                {isActive && (
                    <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#F97316] rounded-r-sm shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                        transition={springConfig}
                    />
                )}

                <span className={cn(
                    "transition-colors duration-200",
                    isActive ? "text-[#F97316]" : "text-gray-500 group-hover:text-gray-300"
                )}>
                    {icon}
                </span>
                <span className="tracking-tight">{label}</span>
            </Link>
        </motion.div>
    );
}
