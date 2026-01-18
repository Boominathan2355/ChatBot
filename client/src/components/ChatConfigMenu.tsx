import React, { useState } from 'react';
import {
    Box,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Divider,
    Tooltip
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import WorkIcon from '@mui/icons-material/Work';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScienceIcon from '@mui/icons-material/Science';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setChatTone, setChatMode } from '../store/slices/chatSlice';
import type { ChatSettings } from '../store/slices/chatSlice';

interface ChatConfigMenuProps {
    resolvedMode: 'light' | 'dark' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light';
}

export const ChatConfigMenu: React.FC<ChatConfigMenuProps> = ({ resolvedMode }) => {
    const dispatch = useAppDispatch();
    const { tone, mode } = useAppSelector(state => state.chat.chatSettings);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleToneChange = (newTone: ChatSettings['tone']) => {
        dispatch(setChatTone(newTone));
        handleClose();
    };

    const handleModeChange = (newMode: ChatSettings['mode']) => {
        dispatch(setChatMode(newMode));
        handleClose();
    };

    const isDark = ['dark', 'soft-dark', 'night', 'high-contrast'].includes(resolvedMode);

    return (
        <>
            <Tooltip title="Response Settings">
                <IconButton
                    onClick={handleClick}
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
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        bgcolor: isDark ? '#1E1E1E' : '#fff',
                        color: isDark ? '#fff' : '#000',
                        minWidth: 200,
                        '& .MuiMenuItem-root': {
                            px: 2,
                            py: 1,
                            borderRadius: 1,
                            mx: 0.5,
                            '&:hover': {
                                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                            }
                        }
                    }
                }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="overline" color="text.secondary">Tone</Typography>
                </Box>

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

                <Divider sx={{ my: 1 }} />

                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="overline" color="text.secondary">Mode</Typography>
                </Box>

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
