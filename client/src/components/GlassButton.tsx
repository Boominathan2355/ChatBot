import React from 'react';
import { Button, styled } from '@mui/material';
import type { ButtonProps } from '@mui/material';

const StyledGlassButton = styled(Button)(({ variant }) => ({
    textTransform: 'none',
    borderRadius: 12,
    padding: '10px 24px',
    fontWeight: 600,
    fontSize: '1rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',

    ...(variant === 'contained' && {
        background: 'linear-gradient(135deg, #00e5ff 0%, #bb86fc 100%)',
        boxShadow: '0 4px 16px rgba(0, 229, 255, 0.2)',

        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, #6effff 0%, #e7b9ff 100%)',
            opacity: 0,
            transition: 'opacity 0.3s',
        },

        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 229, 255, 0.4)',

            '&::before': {
                opacity: 1,
            },
        },
    }),

    ...(variant === 'outlined' && {
        borderWidth: 2,
        borderColor: 'rgba(0, 229, 255, 0.5)',
        backgroundColor: 'rgba(0, 229, 255, 0.05)',
        backdropFilter: 'blur(10px)',

        '&:hover': {
            borderWidth: 2,
            borderColor: '#00e5ff',
            backgroundColor: 'rgba(0, 229, 255, 0.15)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 229, 255, 0.3)',
        },
    }),

    ...(variant === 'text' && {
        '&:hover': {
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
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
