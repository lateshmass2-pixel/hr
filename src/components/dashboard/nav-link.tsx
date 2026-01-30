"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export interface NavLinkClientProps {
    href: string;
    icon: React.ReactNode;
    label: string;
}

const springConfig = {
    type: "spring" as const,
    stiffness: 400,
    damping: 25,
};

export function NavLinkClient({ href, icon, label }: NavLinkClientProps) {
    const pathname = usePathname();
    const [isActive, setIsActive] = useState(false);

    // Compute isActive only on client to avoid hydration mismatch
    useEffect(() => {
        setIsActive(pathname === href || (href !== "/dashboard" && pathname.startsWith(href)));
    }, [pathname, href]);

    return (
        <motion.div
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            transition={springConfig}
        >
            <Link
                href={href}
                className={cn(
                    "sidebar-link",
                    isActive && "sidebar-link-active"
                )}
            >
                <span className={cn(
                    "transition-colors duration-200",
                    isActive ? "text-blue-600" : "text-gray-400"
                )}>
                    {icon}
                </span>
                <span>{label}</span>
            </Link>
        </motion.div>
    );
}
