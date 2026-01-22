export const colors = {
    primary: '#E94057',     // Main brand color
    secondary: '#8A2BE2',   // Secondary accent
    background: '#0F0F13',  // Dark mode background (Rich Black)
    surface: '#1E1E24',     // Card surface
    text: '#FFFFFF',        // Primary text
    textSecondary: '#A0A0A5', // Secondary text
    border: '#2E2E36',      // Borders
    success: '#4CAF50',
    error: '#FF5252',
    warning: '#FFC107',

    // Gradients (Optional for SVG, just reference values here)
    gradientStart: '#E94057',
    gradientEnd: '#8A2BE2',
};

export const spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const typography = {
    h1: { fontSize: 32, fontWeight: '700' as const, color: colors.text },
    h2: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
    h3: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
    body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
    caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textSecondary },
    button: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
};

export const theme = {
    colors,
    spacing,
    typography,
    borderRadius: {
        s: 8,
        m: 16,
        l: 24,
    }
};
