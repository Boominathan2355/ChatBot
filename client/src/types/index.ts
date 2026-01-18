// Shared types for the application

export type ThemeMode = 'light' | 'dark' | 'system' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light';
export type ResolvedMode = 'light' | 'dark' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light';

// Helper to check if mode is dark-like for styling purposes
export const isDarkMode = (mode: ResolvedMode): boolean => {
    return ['dark', 'soft-dark', 'night', 'high-contrast'].includes(mode);
};
