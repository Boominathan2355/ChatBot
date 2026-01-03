import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    setMode: (mode: ThemeMode) => void;
    resolvedMode: 'light' | 'dark';
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

// Monochrome color palette
const COLORS = {
    dark: {
        bg: '#0a0a0a',
        surface: 'rgba(18, 18, 18, 0.85)',
        surfaceLight: 'rgba(28, 28, 28, 0.7)',
        text: '#ffffff',
        textSecondary: 'rgba(255, 255, 255, 0.6)',
        border: 'rgba(255, 255, 255, 0.08)',
        borderHover: 'rgba(255, 255, 255, 0.18)',
        accent: '#ffffff',
    },
    light: {
        bg: '#ffffff',
        surface: 'rgba(255, 255, 255, 0.8)',
        surfaceLight: 'rgba(245, 245, 245, 0.9)',
        text: '#0a0a0a',
        textSecondary: 'rgba(10, 10, 10, 0.6)',
        border: 'rgba(0, 0, 0, 0.1)',
        borderHover: 'rgba(0, 0, 0, 0.2)',
        accent: '#0a0a0a',
    }
};

export const CustomThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('theme-mode');
        return (saved as ThemeMode) || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('theme-mode', mode);
    }, [mode]);

    const toggleTheme = () => {
        setMode((prev) => {
            if (prev === 'system') return 'dark';
            return prev === 'dark' ? 'light' : 'dark';
        });
    };

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const resolvedMode = mode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : mode;
    const colors = COLORS[resolvedMode];

    useEffect(() => {
        document.body.className = '';
        document.body.classList.add(`theme-${resolvedMode}`);
    }, [resolvedMode]);

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: resolvedMode,
                    primary: {
                        main: colors.accent,
                        light: resolvedMode === 'dark' ? '#ffffff' : '#444444',
                        dark: resolvedMode === 'dark' ? '#cccccc' : '#000000',
                    },
                    secondary: {
                        main: resolvedMode === 'dark' ? '#888888' : '#666666',
                        light: resolvedMode === 'dark' ? '#aaaaaa' : '#888888',
                        dark: resolvedMode === 'dark' ? '#666666' : '#444444',
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
                                    ? 'radial-gradient(circle at 20% 80%, rgba(60, 60, 60, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(80, 80, 80, 0.2) 0%, transparent 50%)'
                                    : 'radial-gradient(circle at 20% 80%, rgba(200, 200, 200, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(230, 230, 230, 0.3) 0%, transparent 50%)',
                                backgroundAttachment: 'fixed',
                                minHeight: '100vh',
                                color: '#ffffff',
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
                                backgroundColor: resolvedMode === 'dark'
                                    ? 'rgba(30, 30, 30, 0.95)'
                                    : 'rgba(250, 250, 250, 0.95)',
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
                                backgroundColor: resolvedMode === 'dark'
                                    ? 'rgba(40, 40, 40, 0.95)'
                                    : 'rgba(255, 255, 255, 0.95)',
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
        <ThemeContext.Provider value={{ mode, toggleTheme, setMode, resolvedMode }}>
            <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
