"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export interface NavLinkClientProps {
    href: string;
    icon: React.ReactNode;
    label: string;
}

// Spring animation config
const springConfig = {
    type: "spring",
    stiffness: 400,
    damping: 25,
};

export function NavLinkClient({ href, icon, label }: NavLinkClientProps) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

    return (
        <motion.div
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            transition={springConfig}
        >
            <Link
                href={href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                    ? "text-[#e07850] font-semibold bg-[#e07850]/10 border-r-[3px] border-[#e07850]"
                    : "text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f5f3f0]"
                    }`}
            >
                <span className={isActive ? "text-[#e07850]" : "text-[#a0a0a0]"}>{icon}</span>
                {label}
            </Link>
        </motion.div>
    );
}
