import React from 'react';
import {
    Box,
    Avatar,
    Typography,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface UserProfileMenuProps {
    user: { username?: string } | null;
    anchorEl: HTMLElement | null;
    open: boolean;
    onMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
    onMenuClose: () => void;
    onSettingsOpen: () => void;
    onPersonalizationOpen: () => void;
    onLogout: () => void;
    resolvedMode: ResolvedMode;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
    user,
    anchorEl,
    open,
    onMenuClick,
    onMenuClose,
    onSettingsOpen,
    onPersonalizationOpen,
    onLogout,
    resolvedMode
}) => {
    return (
        <Box
            sx={{
                p: 2,
                borderTop: isDarkMode(resolvedMode)
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid rgba(0,0,0,0.06)'
            }}
        >
            <Box
                onClick={onMenuClick}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': {
                        bgcolor: isDarkMode(resolvedMode)
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.03)'
                    }
                }}
            >
                <Avatar
                    sx={{
                        width: 32,
                        height: 32,
                        bgcolor: 'primary.main',
                        fontSize: 14
                    }}
                >
                    {user?.username?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant="subtitle2" noWrap>
                        {user?.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                        Free Plan
                    </Typography>
                </Box>
                <KeyboardArrowDownIcon
                    sx={{ fontSize: 16, color: 'text.secondary' }}
                />
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={onMenuClose}
                PaperProps={{
                    sx: {
                        width: 220,
                        mt: 1,
                        bgcolor: isDarkMode(resolvedMode)
                            ? 'rgba(26, 26, 26, 0.8)'
                            : 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: isDarkMode(resolvedMode)
                            ? '1px solid rgba(255, 255, 255, 0.08)'
                            : '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: isDarkMode(resolvedMode)
                            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                            : '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <MenuItem onClick={onSettingsOpen}>
                    <ListItemIcon>
                        <SmartToyIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Settings</ListItemText>
                </MenuItem>
                <MenuItem onClick={onPersonalizationOpen}>
                    <ListItemIcon>
                        <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Personalization</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Log out</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default UserProfileMenu;
