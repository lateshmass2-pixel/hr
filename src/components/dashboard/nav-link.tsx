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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${isActive
                    ? "bg-orange-50 text-orange-600 font-bold border-l-4 border-orange-500 -ml-1 pl-5"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}
            >
                <span className={isActive ? "text-orange-500" : "text-gray-400"}>{icon}</span>
                {label}
            </Link>
        </motion.div>
    );
}
