import React from 'react';
import { Card, styled } from '@mui/material';
import type { CardProps } from '@mui/material';

const StyledGlassCard = styled(Card)(({ theme }) => ({
    background: theme.palette.mode === 'dark'
        ? 'rgba(40, 40, 40, 0.6)'
        : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px) saturate(150%)',
    border: theme.palette.mode === 'dark'
        ? '1px solid rgba(255, 255, 255, 0.08)'
        : '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: 16,
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',

    '&:hover': {
        border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.15)'
            : '1px solid rgba(0, 0, 0, 0.15)',
        boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 8px 32px rgba(0, 0, 0, 0.08)',
    },
}));

interface GlassCardProps extends CardProps {
    children: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, ...props }) => {
    return <StyledGlassCard {...props}>{children}</StyledGlassCard>;
};

export default GlassCard;
