export const theme = {
    colors: {
        brand: {
            primary: '#14532d', // green-900: Dark Forest Green
            secondary: '#166534', // green-800: Emerald Deep
            accent: '#dcfce7', // green-100: Soft Sage
            highlight: '#15803d', // green-700
        },
        background: {
            milk: '#f8faf6', // Milk White
            white: '#ffffff',
            surface: '#f0fdf4', // green-50
        },
        text: {
            primary: '#14532d', // Dark Green for headings
            secondary: '#3f6212', // Olive/Green mix for body
            muted: '#86efac', // Light Green for subtle text on dark bg
        },
        chart: {
            primary: '#14532d',
            secondary: '#16a34a',
            accent: '#4ade80',
            muted: '#bbf7d0',
        }
    },
    // Tokens for direct usage
    background: "bg-[#f8faf6]",
    heroGradient: "bg-gradient-to-r from-[#0f3d2e] via-[#134e4a] to-[#14532d]",
    card: "bg-white rounded-3xl shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300",
    primaryButton: "bg-[#14532d] text-white hover:bg-[#166534] transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-lg active:scale-95",
    secondaryButton: "border border-[#14532d] text-[#14532d] bg-transparent hover:bg-green-50 transition-all duration-300",

    shadows: {
        hero: '0 20px 25px -5px rgb(20 83 45 / 0.1), 0 8px 10px -6px rgb(20 83 45 / 0.1)', // Green tinted shadow
        card: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    },
    borderRadius: {
        card: '1.5rem', // rounded-3xl
        button: '0.75rem', // rounded-xl
    }
}

// Deprecated export (for backward compatibility during migration)
export const cardStyles = theme.card;
export const primaryButtonStyles = theme.primaryButton;
export const secondaryButtonStyles = theme.secondaryButton;
