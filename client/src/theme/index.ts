import { createTheme } from '@mui/material/styles';

// Tri-color palette: Cyan, Purple, and Coral/Pink
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00e5ff', // Electric Cyan
            light: '#6effff',
            dark: '#00b4cc',
        },
        secondary: {
            main: '#bb86fc', // Soft Purple
            light: '#e7b9ff',
            dark: '#8858c8',
        },
        error: {
            main: '#ff6b9d', // Coral Pink
            light: '#ffb3c8',
            dark: '#c9517a',
        },
        background: {
            default: '#0a0e27', // Deep space blue
            paper: 'rgba(16, 24, 48, 0.7)', // Semi-transparent for glassmorphism
        },
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)',
        },
    },
    typography: {
        fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
            fontSize: '3rem',
            letterSpacing: '-0.02em',
        },
        h2: {
            fontWeight: 700,
            fontSize: '2.5rem',
            letterSpacing: '-0.01em',
        },
        h3: {
            fontWeight: 600,
            fontSize: '2rem',
        },
        h4: {
            fontWeight: 600,
            fontSize: '1.75rem',
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.5rem',
        },
        h6: {
            fontWeight: 600,
            fontSize: '1.25rem',
        },
        button: {
            fontWeight: 600,
            textTransform: 'none',
        },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1345 50%, #0f1b3d 100%)',
                    backgroundAttachment: 'fixed',
                    backgroundSize: '400% 400%',
                    animation: 'gradientShift 15s ease infinite',
                    '@keyframes gradientShift': {
                        '0%': { backgroundPosition: '0% 50%' },
                        '50%': { backgroundPosition: '100% 50%' },
                        '100%': { backgroundPosition: '0% 50%' },
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 12,
                    padding: '10px 24px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0, 229, 255, 0.3)',
                    },
                },
                contained: {
                    background: 'linear-gradient(135deg, #00e5ff 0%, #bb86fc 100%)',
                    boxShadow: '0 4px 16px rgba(0, 229, 255, 0.2)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #6effff 0%, #e7b9ff 100%)',
                        boxShadow: '0 8px 24px rgba(0, 229, 255, 0.4)',
                    },
                },
                outlined: {
                    borderWidth: 2,
                    borderColor: 'rgba(0, 229, 255, 0.5)',
                    backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                        borderWidth: 2,
                        borderColor: '#00e5ff',
                        backgroundColor: 'rgba(0, 229, 255, 0.15)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(16, 24, 48, 0.6)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 20,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        border: '1px solid rgba(0, 229, 255, 0.3)',
                        boxShadow: '0 12px 40px rgba(0, 229, 255, 0.15)',
                    },
                },
                elevation1: {
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                },
                elevation2: {
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                },
                elevation3: {
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(16, 24, 48, 0.5)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 20,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        border: '1px solid rgba(187, 134, 252, 0.4)',
                        boxShadow: '0 16px 48px rgba(187, 134, 252, 0.2)',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 12,
                        transition: 'all 0.3s ease',
                        '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderWidth: 2,
                        },
                        '&:hover fieldset': {
                            borderColor: 'rgba(0, 229, 255, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#00e5ff',
                            borderWidth: 2,
                            boxShadow: '0 0 16px rgba(0, 229, 255, 0.3)',
                        },
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(16, 24, 48, 0.8)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: 'rgba(10, 14, 39, 0.95)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(0, 229, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 229, 255, 0.25)',
                        transform: 'scale(1.05)',
                    },
                },
                colorPrimary: {
                    backgroundColor: 'rgba(0, 229, 255, 0.2)',
                    border: '1px solid rgba(0, 229, 255, 0.5)',
                },
                colorSecondary: {
                    backgroundColor: 'rgba(187, 134, 252, 0.2)',
                    border: '1px solid rgba(187, 134, 252, 0.5)',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: 'rgba(16, 24, 48, 0.95)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: 'rgba(16, 24, 48, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.875rem',
                    padding: '8px 12px',
                },
            },
        },
    },
});

export default theme;
