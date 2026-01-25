import React, { useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune'; // For Tone
import PsychologyIcon from '@mui/icons-material/Psychology'; // For Mode
import SchoolIcon from '@mui/icons-material/School';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import WorkIcon from '@mui/icons-material/Work';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScienceIcon from '@mui/icons-material/Science';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setChatTone, setChatMode } from '../store/slices/chatSlice';
import type { ChatSettings } from '../store/slices/chatSlice';

interface HelperMenuProps {
    resolvedMode: 'light' | 'dark' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light';
}

export const ToneSelector: React.FC<HelperMenuProps> = ({ resolvedMode }) => {
    const dispatch = useAppDispatch();
    const { tone } = useAppSelector(state => state.chat.chatSettings);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const isDark = ['dark', 'soft-dark', 'night', 'high-contrast'].includes(resolvedMode);

    const handleToneChange = (newTone: ChatSettings['tone']) => {
        dispatch(setChatTone(newTone));
        setAnchorEl(null);
    };

    return (
        <>
            <Tooltip title={`Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}`}>
                <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    size="small"
                    sx={{
                        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                        '&:hover': {
                            color: isDark ? '#fff' : '#000',
                            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                        }
                    }}
                >
                    <TuneIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'center', vertical: 'bottom' }} // Open upwards
                anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mb: 1.5, // Margin bottom since it opens upwards usually? Wait, let's keep standard dropup/down logic.
                        // Actually standard from bottom bar is UP.
                        mt: -1,
                        bgcolor: isDark ? '#1E1E1E' : '#fff',
                        color: isDark ? '#fff' : '#000',
                        minWidth: 150,
                        '& .MuiMenuItem-root': {
                            px: 2, py: 1, borderRadius: 1, mx: 0.5,
                            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                        }
                    }
                }}
            >
                <MenuItem onClick={() => handleToneChange('formal')} selected={tone === 'formal'}>
                    <ListItemIcon><WorkIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Formal</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleToneChange('casual')} selected={tone === 'casual'}>
                    <ListItemIcon><ChatBubbleOutlineIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Casual</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleToneChange('friendly')} selected={tone === 'friendly'}>
                    <ListItemIcon><EmojiEmotionsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Friendly</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};

export const ModeSelector: React.FC<HelperMenuProps> = ({ resolvedMode }) => {
    const dispatch = useAppDispatch();
    const { mode } = useAppSelector(state => state.chat.chatSettings);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const isDark = ['dark', 'soft-dark', 'night', 'high-contrast'].includes(resolvedMode);

    const handleModeChange = (newMode: ChatSettings['mode']) => {
        dispatch(setChatMode(newMode));
        setAnchorEl(null);
    };

    return (
        <>
            <Tooltip title={`Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}>
                <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    size="small"
                    sx={{
                        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                        '&:hover': {
                            color: isDark ? '#fff' : '#000',
                            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                        }
                    }}
                >
                    <PsychologyIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'center', vertical: 'bottom' }}
                anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: -1,
                        bgcolor: isDark ? '#1E1E1E' : '#fff',
                        color: isDark ? '#fff' : '#000',
                        minWidth: 150,
                        '& .MuiMenuItem-root': {
                            px: 2, py: 1, borderRadius: 1, mx: 0.5,
                            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                        }
                    }
                }}
            >
                <MenuItem onClick={() => handleModeChange('normal')} selected={mode === 'normal'}>
                    <ListItemIcon><AutoAwesomeIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Normal</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleModeChange('creative')} selected={mode === 'creative'}>
                    <ListItemIcon><PsychologyIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Creative</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleModeChange('analytical')} selected={mode === 'analytical'}>
                    <ListItemIcon><ScienceIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Analytical</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleModeChange('educational')} selected={mode === 'educational'}>
                    <ListItemIcon><SchoolIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Educational</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};

