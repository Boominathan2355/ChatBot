import React from 'react';
import { Card, styled } from '@mui/material';
import type { CardProps } from '@mui/material';

const StyledGlassCard = styled(Card)(() => ({
    background: 'rgba(16, 24, 48, 0.5)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',

    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
        transition: 'left 0.5s',
    },

    '&:hover': {
        transform: 'translateY(-4px)',
        border: '1px solid rgba(187, 134, 252, 0.4)',
        boxShadow: '0 16px 48px rgba(187, 134, 252, 0.2)',

        '&::before': {
            left: '100%',
        },
    },
}));

interface GlassCardProps extends CardProps {
    children: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, ...props }) => {
    return <StyledGlassCard {...props}>{children}</StyledGlassCard>;
};

export default GlassCard;
