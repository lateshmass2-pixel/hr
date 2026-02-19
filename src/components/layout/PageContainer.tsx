'use client';

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn("container mx-auto max-w-7xl space-y-8 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-500", className)}
        >
            {children}
        </motion.div>
    );
}
