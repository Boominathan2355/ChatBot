import React from 'react';
import { Button, Tooltip, type SxProps, type Theme } from '@mui/material';
import type { ResolvedMode } from '../../types';
import { isDarkMode } from '../../types';

interface ActionButtonProps {
    tooltip?: string;
    onClick: () => void;
    icon?: React.ReactNode;
    label?: string;
    disabled?: boolean;
    variant?: 'text' | 'outlined' | 'contained';
    size?: 'small' | 'medium' | 'large';
    color?: 'inherit' | 'primary' | 'secondary' | 'error';
    sx?: SxProps<Theme>;
    resolvedMode?: ResolvedMode;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
    tooltip,
    onClick,
    icon,
    label,
    disabled = false,
    variant = 'text',
    size = 'small',
    color = 'inherit',
    sx,
    resolvedMode = 'dark'
}) => {
    const defaultSx: SxProps<Theme> = {
        opacity: 0.5,
        '&:hover': {
            opacity: 1,
            bgcolor: isDarkMode(resolvedMode)
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)'
        },
        textTransform: 'none',
        fontSize: 11,
        py: 0.2,
        minWidth: 'auto',
        color: 'inherit',
        ...sx
    };

    const button = (
        <Button
            size={size}
            onClick={onClick}
            disabled={disabled}
            variant={variant}
            color={color}
            startIcon={icon}
            sx={defaultSx}
        >
            {label}
        </Button>
    );

    if (tooltip) {
        return <Tooltip title={tooltip}>{button}</Tooltip>;
    }

    return button;
};

export default ActionButton;
