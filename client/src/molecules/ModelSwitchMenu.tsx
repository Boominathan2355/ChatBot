import React from 'react';
import {
    Menu,
    MenuItem,
    ListItemText,
    Box,
    Typography,
    Divider,
    CircularProgress,
    ListItemIcon
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface Model {
    id: string;
    name: string;
}

interface ModelSwitchMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    currentModel: string;
    availableModels: Model[];
    aiProvider: string;
    isLoading: boolean;
    onModelSwitch: (modelId: string) => void;
    resolvedMode: ResolvedMode;
}

export const ModelSwitchMenu: React.FC<ModelSwitchMenuProps> = ({
    anchorEl,
    open,
    onClose,
    currentModel,
    availableModels,
    aiProvider,
    isLoading,
    onModelSwitch,
    resolvedMode
}) => {
    // Determine header text based on provider
    const headerText = aiProvider === 'ollama' ? 'Ollama Models' : `${aiProvider} Models`;

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: isDarkMode(resolvedMode)
                        ? 'rgba(30, 30, 30, 0.85)' // Slightly darker, more opaque
                        : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: isDarkMode(resolvedMode) ? '#fff' : '#212121',
                    border: isDarkMode(resolvedMode)
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(0,0,0,0.1)',
                    minWidth: 220,
                    maxHeight: 400,
                    boxShadow: isDarkMode(resolvedMode)
                        ? '0 8px 32px rgba(0,0,0,0.45)'
                        : '0 8px 32px rgba(0,0,0,0.15)',
                    borderRadius: 3, // More rounded 12px
                    mt: 1,
                    p: 1 // Add padding to container
                }
            }}
            transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
            disablePortal
            transitionDuration={200}
        >
            <Box sx={{ px: 2, py: 1, pb: 0.5 }}>
                <Typography
                    sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        opacity: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: isDarkMode(resolvedMode) ? '#fff' : '#000'
                    }}
                >
                    {headerText}
                </Typography>
            </Box>
            <Divider sx={{ my: 0.5, opacity: 0.1 }} />
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {availableModels.map((m) => (
                    <MenuItem
                        key={m.id}
                        selected={m.id === currentModel}
                        onClick={() => onModelSwitch(m.id)}
                        sx={{
                            fontSize: 13,
                            py: 1,
                            px: 1.5,
                            borderRadius: 1.5, // Inner item rounding
                            mb: 0.25,
                            mx: 0.5,
                            transition: 'all 0.15s ease-out',
                            '&.Mui-selected': {
                                bgcolor: isDarkMode(resolvedMode)
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'rgba(0, 0, 0, 0.08)',
                                color: isDarkMode(resolvedMode) ? '#fff' : '#000',
                                '&:hover': {
                                    bgcolor: isDarkMode(resolvedMode)
                                        ? 'rgba(255, 255, 255, 0.18)'
                                        : 'rgba(0, 0, 0, 0.12)'
                                }
                            },
                            '&:hover': {
                                bgcolor: isDarkMode(resolvedMode)
                                    ? 'rgba(255, 255, 255, 0.06)'
                                    : 'rgba(0, 0, 0, 0.04)'
                            }
                        }}
                    >
                        <ListItemText
                            primary={m.name}
                            primaryTypographyProps={{
                                fontSize: 13,
                                fontWeight: m.id === currentModel ? 600 : 500,
                                style: {
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }
                            }}
                        />
                        {m.id === currentModel && (
                            <ListItemIcon sx={{ minWidth: 'auto', ml: 1 }}>
                                <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                            </ListItemIcon>
                        )}
                    </MenuItem>
                ))}
                {availableModels.length === 0 && !isLoading && (
                    <MenuItem disabled sx={{ fontSize: 13, justifyContent: 'center' }}>
                        No models found
                    </MenuItem>
                )}
                {isLoading && (
                    <MenuItem
                        disabled
                        sx={{ py: 2, justifyContent: 'center' }}
                    >
                        <CircularProgress size={16} thickness={4} />
                    </MenuItem>
                )}
            </Box>
        </Menu>
    );
};

// Model selector trigger button component
interface ModelSelectorTriggerProps {
    currentModel: string;
    onClick: (e: React.MouseEvent<HTMLElement>) => void;
    resolvedMode: ResolvedMode;
}

export const ModelSelectorTrigger: React.FC<ModelSelectorTriggerProps> = ({
    currentModel,
    onClick,
    resolvedMode
}) => {
    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                borderRadius: 50, // Pill shape
                cursor: 'pointer',
                height: 34,
                bgcolor: isDarkMode(resolvedMode)
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
                border: '1px solid',
                borderColor: isDarkMode(resolvedMode)
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.06)',
                '&:hover': {
                    bgcolor: isDarkMode(resolvedMode)
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.08)',
                    borderColor: isDarkMode(resolvedMode)
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(0,0,0,0.1)'
                },
                transition: 'all 0.2s ease',
                flexShrink: 0,
                userSelect: 'none'
            }}
        >
            <SmartToyIcon
                sx={{
                    fontSize: 16,
                    opacity: 0.9,
                    color: isDarkMode(resolvedMode) ? 'inherit' : 'action.active'
                }}
            />
            <Typography
                sx={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    maxWidth: { xs: 80, sm: 140 }, // Slightly larger max width
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1
                }}
            >
                {currentModel || 'Select Model'}
            </Typography>
            <KeyboardArrowDownIcon sx={{ fontSize: 16, opacity: 0.6 }} />
        </Box>
    );
};

export default ModelSwitchMenu;
