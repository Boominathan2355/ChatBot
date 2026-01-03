import React from 'react';
import { Box, styled } from '@mui/material';
import type { BoxProps } from '@mui/material';

const StyledGlassContainer = styled(Box)(({ theme }) => ({
    background: 'rgba(16, 24, 48, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: theme.spacing(3),
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
    transition: 'all 0.3s ease',

    '&:hover': {
        border: '1px solid rgba(0, 229, 255, 0.3)',
        boxShadow: '0 12px 40px rgba(0, 229, 255, 0.15)',
    },
}));

interface GlassContainerProps extends BoxProps {
    children: React.ReactNode;
}

const GlassContainer: React.FC<GlassContainerProps> = ({ children, ...props }) => {
    return <StyledGlassContainer {...props}>{children}</StyledGlassContainer>;
};

export default GlassContainer;
