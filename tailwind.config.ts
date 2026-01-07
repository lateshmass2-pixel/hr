import type { Config } from "tailwindcss"

const config = {
    darkMode: "class",
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // HEMS Clean Enterprise Theme (White/Orange/Gray)
                hems: {
                    bg: '#F3F4F6',        // Cool Gray 100 - App Background
                    surface: '#FFFFFF',   // Pure White - Sidebar/Cards
                    primary: '#F97316',   // Orange-500 - Primary Accent
                    success: '#10B981',   // Emerald-500 - Success States
                    text: '#111827',      // Gray-900 - Main Text
                    muted: '#6B7280',     // Gray-500 - Muted Text
                    border: '#E5E7EB',    // Gray-200 - Borders
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            letterSpacing: {
                tighter: '-0.04em',
                tight: '-0.02em',
                normal: '0',
            },
            lineHeight: {
                relaxed: '1.625',
                loose: '2',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "float": {
                    "0%, 100%": {
                        transform: "translateY(0px) rotateX(20deg) rotateZ(-10deg)",
                    },
                    "50%": {
                        transform: "translateY(-20px) rotateX(20deg) rotateZ(-10deg)",
                    },
                },
                "float-simple": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                "pulse-glow": {
                    "0%, 100%": {
                        boxShadow: "0 0 20px -5px rgba(249, 115, 22, 0.3)",
                    },
                    "50%": {
                        boxShadow: "0 0 40px -5px rgba(249, 115, 22, 0.5)",
                    },
                },
                "scroll-up": {
                    "0%": { transform: "translateY(0)" },
                    "100%": { transform: "translateY(-50%)" },
                },
                "scan-line": {
                    "0%": { top: "0" },
                    "100%": { top: "100%" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "float": "float 6s ease-in-out infinite",
                "float-simple": "float-simple 4s ease-in-out infinite",
                "pulse-glow": "pulse-glow 3s ease-in-out infinite",
                "scroll-up": "scroll-up 15s linear infinite",
                "scan-line": "scan-line 2s ease-in-out infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
