import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
// Import the action from uiSlice (make sure to export it)
import { setThemeMode } from '../store/slices/uiSlice';

type ThemeMode = 'light' | 'dark' | 'system' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    setMode: (mode: ThemeMode) => void;
    resolvedMode: 'light' | 'dark' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light';
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    toggleTheme: () => { },
    setMode: () => { },
    resolvedMode: 'dark',
});

export const useThemeMode = () => useContext(ThemeContext);

interface ThemeProviderProps {
    children: React.ReactNode;
}

// Monochrome color palettes for eye-friendly modes
const COLORS = {
    dark: {
        bg: '#212121',
        surface: 'rgba(20, 30, 50, 0.4)',
        surfaceLight: 'rgba(40, 50, 70, 0.3)',
        text: '#ffffff',
        textSecondary: 'rgba(255, 255, 255, 0.7)',
        border: 'rgba(255, 255, 255, 0.1)',
        borderHover: 'rgba(255, 255, 255, 0.2)',
        accent: '#ffffff', // Monochrome white
    },
    light: {
        bg: '#ffffff',
        surface: 'rgba(255, 255, 255, 0.4)',
        surfaceLight: 'rgba(255, 255, 255, 0.3)',
        text: '#212121',
        textSecondary: 'rgba(33, 33, 33, 0.7)',
        border: 'rgba(0, 0, 0, 0.08)',
        borderHover: 'rgba(0, 0, 0, 0.15)',
        accent: '#000000', // Monochrome black
    },
    'soft-dark': {
        bg: '#1E1E1E',
        surface: 'rgba(30, 30, 30, 0.4)',
        surfaceLight: 'rgba(40, 40, 40, 0.3)',
        text: '#E0E0E0',
        textSecondary: 'rgba(224, 224, 224, 0.7)',
        border: 'rgba(255, 255, 255, 0.08)',
        borderHover: 'rgba(255, 255, 255, 0.15)',
        accent: '#E0E0E0', // Soft gray
    },
    night: {
        bg: '#0D0D0D',
        surface: 'rgba(13, 13, 13, 0.4)',
        surfaceLight: 'rgba(20, 20, 20, 0.3)',
        text: '#BDBDBD',
        textSecondary: 'rgba(189, 189, 189, 0.7)',
        border: 'rgba(255, 255, 255, 0.05)',
        borderHover: 'rgba(255, 255, 255, 0.1)',
        accent: '#BDBDBD', // Muted gray
    },
    'high-contrast': {
        bg: '#000000',
        surface: 'rgba(0, 0, 0, 0.9)',
        surfaceLight: 'rgba(10, 10, 10, 0.8)',
        text: '#FFFFFF',
        textSecondary: 'rgba(255, 255, 255, 0.9)',
        border: 'rgba(255, 255, 255, 0.3)',
        borderHover: 'rgba(255, 255, 255, 0.5)',
        accent: '#FFFFFF',  // Pure white
    },
    'soft-light': {
        bg: '#F5F5F5',
        surface: 'rgba(245, 245, 245, 0.4)',
        surfaceLight: 'rgba(250, 250, 250, 0.3)',
        text: '#424242',
        textSecondary: 'rgba(66, 66, 66, 0.7)',
        border: 'rgba(0, 0, 0, 0.06)',
        borderHover: 'rgba(0, 0, 0, 0.12)',
        accent: '#424242', // Dark gray
    }
};

export const CustomThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const dispatch = useAppDispatch();
    const mode = useAppSelector((state) => state.ui.themeMode);

    // No local state for mode anymore

    // Sync to local storage is handled in the slice, or here if we want double safety, 
    // but slice already does it. 
    // Actually, slice reducer does it.

    const toggleTheme = () => {
        if (mode === 'system') {
            dispatch(setThemeMode('dark'));
        } else {
            dispatch(setThemeMode(mode === 'dark' ? 'light' : 'dark'));
        }
    };

    // We can expose setMode to be used via context, which dispatches action
    const setModeWrapper = (newMode: ThemeMode) => {
        dispatch(setThemeMode(newMode));
    };

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    // Resolve mode for eye-friendly variants
    const getResolvedMode = (): 'light' | 'dark' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light' => {
        if (mode === 'system') return prefersDarkMode ? 'dark' : 'light';
        return mode as any;
    };

    const resolvedMode = getResolvedMode();

    // Calculate baseMode (always 'light' or 'dark' for MUI)
    const baseMode: 'light' | 'dark' = ['soft-dark', 'night', 'high-contrast'].includes(resolvedMode)
        ? 'dark'
        : (resolvedMode === 'soft-light' ? 'light' : resolvedMode as 'light' | 'dark');

    const colors = COLORS[resolvedMode] || COLORS[baseMode];

    useEffect(() => {
        document.body.className = '';
        document.body.classList.add(`theme-${resolvedMode}`);
    }, [resolvedMode]);

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: baseMode, // Use baseMode for MUI's palette (only 'light' or 'dark')
                    primary: {
                        main: colors.accent,
                        light: baseMode === 'dark' ? '#ffffff' : '#444444',
                        dark: baseMode === 'dark' ? '#cccccc' : '#000000',
                    },
                    secondary: {
                        main: baseMode === 'dark' ? '#888888' : '#666666',
                        light: baseMode === 'dark' ? '#aaaaaa' : '#888888',
                        dark: baseMode === 'dark' ? '#666666' : '#444444',
                    },
                    background: {
                        default: colors.bg,
                        paper: colors.surface,
                    },
                    text: {
                        primary: colors.text,
                        secondary: colors.textSecondary,
                    },
                },
                typography: {
                    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
                    h1: { fontWeight: 300, fontSize: '3rem', letterSpacing: '-0.02em' },
                    h2: { fontWeight: 300, fontSize: '2.5rem', letterSpacing: '-0.01em' },
                    h3: { fontWeight: 400, fontSize: '2rem' },
                    h4: { fontWeight: 400, fontSize: '1.75rem' },
                    h5: { fontWeight: 500, fontSize: '1.5rem' },
                    h6: { fontWeight: 500, fontSize: '1.25rem' },
                    button: { fontWeight: 500, textTransform: 'none' },
                },
                shape: {
                    borderRadius: 16,
                },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            body: {
                                backgroundColor: colors.bg,
                                backgroundImage: resolvedMode === 'dark'
                                    ? 'radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.15) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(20, 184, 166, 0.15) 0px, transparent 50%)'
                                    // Increased opacity for Light Mode to make glass effect visible
                                    : 'radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.4) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.4) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.4) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(20, 184, 166, 0.4) 0px, transparent 50%)',
                                backgroundAttachment: 'fixed',
                                minHeight: '100vh',
                                color: colors.text,
                            },
                            '::-webkit-scrollbar': { display: 'none' } // Hide default body scrollbar if we use a custom container, but we usually want it. Wait.
                        },
                    },
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                borderRadius: 12,
                                padding: '10px 24px',
                                fontWeight: 500,
                                fontSize: '1rem',
                                transition: 'all 0.2s ease',
                                backdropFilter: 'blur(12px)',
                            },
                            contained: {
                                backgroundColor: colors.accent,
                                color: resolvedMode === 'dark' ? '#222222' : '#ffffff',
                                boxShadow: 'none',
                                '&:hover': {
                                    backgroundColor: resolvedMode === 'dark' ? '#eeeeee' : '#333333',
                                    boxShadow: resolvedMode === 'dark'
                                        ? '0 8px 24px rgba(255, 255, 255, 0.15)'
                                        : '0 8px 24px rgba(0, 0, 0, 0.15)',
                                    transform: 'translateY(-1px)',
                                },
                            },
                            outlined: {
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: 'transparent',
                                backdropFilter: 'blur(12px)',
                                '&:hover': {
                                    borderWidth: 1,
                                    borderColor: colors.borderHover,
                                    backgroundColor: resolvedMode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.05)'
                                        : 'rgba(0, 0, 0, 0.03)',
                                },
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                                backgroundColor: colors.surface,
                                backdropFilter: 'blur(20px) saturate(150%)',
                                border: `1px solid ${colors.border}`,
                                borderRadius: 16,
                                boxShadow: resolvedMode === 'dark'
                                    ? '0 4px 24px rgba(0, 0, 0, 0.4)'
                                    : '0 4px 24px rgba(0, 0, 0, 0.08)',
                                transition: 'all 0.2s ease',
                            },
                        },
                    },
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                backgroundColor: colors.surfaceLight,
                                backdropFilter: 'blur(20px) saturate(150%)',
                                border: `1px solid ${colors.border}`,
                                borderRadius: 16,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    border: `1px solid ${colors.borderHover}`,
                                    boxShadow: resolvedMode === 'dark'
                                        ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                                        : '0 8px 32px rgba(0, 0, 0, 0.1)',
                                },
                            },
                        },
                    },
                    MuiTextField: {
                        styleOverrides: {
                            root: {
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: resolvedMode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.04)'
                                        : 'rgba(0, 0, 0, 0.02)',
                                    backdropFilter: 'blur(12px)',
                                    borderRadius: 12,
                                    transition: 'all 0.2s ease',
                                    '& fieldset': {
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                    },
                                    '&:hover fieldset': {
                                        borderColor: colors.borderHover,
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: colors.accent,
                                        borderWidth: 1,
                                    },
                                },
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                backgroundColor: colors.surface,
                                backdropFilter: 'blur(20px) saturate(150%)',
                                borderRight: `1px solid ${colors.border}`,
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundColor: colors.surface,
                                backdropFilter: 'blur(20px) saturate(150%)',
                                borderBottom: `1px solid ${colors.border}`,
                                boxShadow: 'none',
                            },
                        },
                    },
                    MuiDialog: {
                        styleOverrides: {
                            paper: {
                                backgroundColor: colors.surface,
                                backdropFilter: 'blur(24px) saturate(150%)',
                                border: `1px solid ${colors.border}`,
                                boxShadow: resolvedMode === 'dark'
                                    ? '0 24px 64px rgba(0, 0, 0, 0.6)'
                                    : '0 24px 64px rgba(0, 0, 0, 0.15)',
                            },
                        },
                    },
                    MuiTooltip: {
                        styleOverrides: {
                            tooltip: {
                                backgroundColor: resolvedMode === 'dark'
                                    ? 'rgba(50, 50, 50, 0.95)'
                                    : 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(12px)',
                                border: `1px solid ${colors.border}`,
                                fontSize: '0.875rem',
                                padding: '8px 12px',
                                color: colors.text,
                            },
                        },
                    },
                    MuiIconButton: {
                        styleOverrides: {
                            root: {
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: resolvedMode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.08)'
                                        : 'rgba(0, 0, 0, 0.04)',
                                },
                            },
                        },
                    },
                    MuiListItemButton: {
                        styleOverrides: {
                            root: {
                                borderRadius: 8,
                                margin: '2px 8px',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: resolvedMode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.06)'
                                        : 'rgba(0, 0, 0, 0.03)',
                                },
                                '&.Mui-selected': {
                                    backgroundColor: resolvedMode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.1)'
                                        : 'rgba(0, 0, 0, 0.06)',
                                    '&:hover': {
                                        backgroundColor: resolvedMode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.12)'
                                            : 'rgba(0, 0, 0, 0.08)',
                                    },
                                },
                            },
                        },
                    },
                    MuiAvatar: {
                        styleOverrides: {
                            root: {
                                backgroundColor: resolvedMode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'rgba(0, 0, 0, 0.06)',
                                border: `1px solid ${colors.border}`,
                            },
                        },
                    },
                },
            }),
        [mode, colors]
    );

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, setMode: setModeWrapper, resolvedMode }}>
            <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
