import React from 'react';
import {
    Menu,
    MenuItem,
    ListItemText,
    Box,
    Typography,
    Divider,
    CircularProgress
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
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
    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: isDarkMode(resolvedMode)
                        ? 'rgba(26, 26, 26, 0.8)'
                        : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    color: isDarkMode(resolvedMode) ? '#fff' : '#212121',
                    border: isDarkMode(resolvedMode)
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(0,0,0,0.08)',
                    minWidth: 200,
                    maxHeight: 400,
                    boxShadow: isDarkMode(resolvedMode)
                        ? '0 8px 32px rgba(0,0,0,0.4)'
                        : '0 8px 32px rgba(0,0,0,0.1)',
                    borderRadius: 2,
                    mt: 1
                }
            }}
            transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        >
            <Box sx={{ px: 2, py: 1.5 }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        opacity: 0.4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}
                >
                    {aiProvider} Models
                </Typography>
            </Box>
            <Divider sx={{ opacity: 0.1 }} />
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {availableModels.map((m) => (
                    <MenuItem
                        key={m.id}
                        selected={m.id === currentModel}
                        onClick={() => onModelSwitch(m.id)}
                        sx={{
                            fontSize: 13,
                            py: 1,
                            px: 2,
                            '&.Mui-selected': {
                                bgcolor: isDarkMode(resolvedMode)
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'rgba(0, 0, 0, 0.05)',
                                color: isDarkMode(resolvedMode)
                                    ? '#fff'
                                    : '#000',
                                '&:hover': {
                                    bgcolor: isDarkMode(resolvedMode)
                                        ? 'rgba(255, 255, 255, 0.2)'
                                        : 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        }}
                    >
                        <ListItemText
                            primary={m.name}
                            primaryTypographyProps={{
                                fontSize: 13,
                                fontWeight: m.id === currentModel ? 600 : 400
                            }}
                        />
                    </MenuItem>
                ))}
                {availableModels.length === 0 && !isLoading && (
                    <MenuItem disabled sx={{ fontSize: 13 }}>
                        No models found
                    </MenuItem>
                )}
                {isLoading && (
                    <MenuItem
                        disabled
                        sx={{ py: 2, justifyContent: 'center' }}
                    >
                        <CircularProgress size={20} />
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
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 2,
                cursor: 'pointer',
                height: 32,
                bgcolor: isDarkMode(resolvedMode)
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(255,255,255,0.05)',
                '&:hover': {
                    bgcolor: isDarkMode(resolvedMode)
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.08)'
                },
                mb: 0.25,
                transition: 'all 0.2s',
                flexShrink: 0
            }}
        >
            <SmartToyIcon sx={{ fontSize: 16, opacity: 0.8 }} />
            <Typography
                sx={{
                    fontSize: 12,
                    fontWeight: 500,
                    maxWidth: { xs: 60, sm: 120 },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
                {currentModel || 'AI Model'}
            </Typography>
            <KeyboardArrowDownIcon sx={{ fontSize: 14, opacity: 0.5 }} />
        </Box>
    );
};

export default ModelSwitchMenu;
