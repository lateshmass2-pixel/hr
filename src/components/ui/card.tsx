"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// Spring animation config for tactile feel
const springConfig = {
    type: "spring",
    stiffness: 400,
    damping: 25,
};

// Motion Card with hover scale effect
const MotionCard = React.forwardRef<
    HTMLDivElement,
    HTMLMotionProps<"div"> & { className?: string }
>(({ className, children, ...props }, ref) => (
    <motion.div
        ref={ref}
        whileHover={{ scale: 1.01 }}
        transition={springConfig}
        className={cn(
            "rounded-2xl border border-neutral-200 bg-card text-card-foreground shadow-sm p-8",
            className
        )}
        {...props}
    >
        {children}
    </motion.div>
));
MotionCard.displayName = "MotionCard";

// Standard Card (non-animated)
const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-2xl border border-neutral-200 bg-card text-card-foreground shadow-sm",
            className
        )}
        {...props}
    />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-2 p-8 pb-4", className)}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn("text-lg font-semibold leading-tight tracking-tight", className)}
        {...props}
    />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground leading-relaxed", className)}
        {...props}
    />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-8 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-8 pt-0", className)}
        {...props}
    />
));
CardFooter.displayName = "CardFooter";

export { Card, MotionCard, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
