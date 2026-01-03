import React from 'react';
import { Button, styled } from '@mui/material';
import type { ButtonProps } from '@mui/material';

const StyledGlassButton = styled(Button)(({ theme, variant }) => ({
    textTransform: 'none',
    borderRadius: 12,
    padding: '10px 24px',
    fontWeight: 500,
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(12px)',
    position: 'relative',
    overflow: 'hidden',

    ...(variant === 'contained' && {
        background: theme.palette.mode === 'dark' ? '#ffffff' : '#222222',
        color: theme.palette.mode === 'dark' ? '#222222' : '#ffffff',
        boxShadow: 'none',

        '&:hover': {
            background: theme.palette.mode === 'dark' ? '#eeeeee' : '#333333',
            transform: 'translateY(-1px)',
            boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 24px rgba(255, 255, 255, 0.15)'
                : '0 8px 24px rgba(0, 0, 0, 0.15)',
        },
    }),

    ...(variant === 'outlined' && {
        borderWidth: 1,
        borderColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.2)',
        backgroundColor: 'transparent',
        color: theme.palette.text.primary,

        '&:hover': {
            borderWidth: 1,
            borderColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.4)'
                : 'rgba(0, 0, 0, 0.4)',
            backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.03)',
            transform: 'translateY(-1px)',
        },
    }),

    ...(variant === 'text' && {
        color: theme.palette.text.primary,
        '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.04)',
        },
    }),

    '& .MuiButton-label': {
        position: 'relative',
        zIndex: 1,
    },
}));

interface GlassButtonProps extends ButtonProps {
    children: React.ReactNode;
}

const GlassButton: React.FC<GlassButtonProps> = ({ children, ...props }) => {
    return <StyledGlassButton {...props}>{children}</StyledGlassButton>;
};

export default GlassButton;
