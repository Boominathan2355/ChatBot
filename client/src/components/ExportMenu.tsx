import React, { useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip
} from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CodeIcon from '@mui/icons-material/Code';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { useAppSelector } from '../store/hooks';

interface ExportMenuProps {
    resolvedMode: 'light' | 'dark' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light';
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ resolvedMode }) => {
    const { messages, currentChat } = useAppSelector(state => state.chat);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportText = () => {
        const text = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
        downloadFile(text, `chat-${currentChat?.title || 'export'}.txt`, 'text/plain');
        handleClose();
    };

    const handleExportMarkdown = () => {
        const md = messages.map(m => `**${m.role.toUpperCase()}:**\n${m.content}`).join('\n\n---\n\n');
        downloadFile(md, `chat-${currentChat?.title || 'export'}.md`, 'text/markdown');
        handleClose();
    };

    const handleExportJSON = () => {
        const json = JSON.stringify(messages, null, 2);
        downloadFile(json, `chat-${currentChat?.title || 'export'}.json`, 'application/json');
        handleClose();
    };

    const isDark = ['dark', 'soft-dark', 'night', 'high-contrast'].includes(resolvedMode);

    return (
        <>
            <Tooltip title="Export Chat">
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
                    <IosShareIcon fontSize="small" />
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
                        minWidth: 180,
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
                <MenuItem onClick={handleExportText}>
                    <ListItemIcon><TextSnippetIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Text (.txt)</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleExportMarkdown}>
                    <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Markdown (.md)</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleExportJSON}>
                    <ListItemIcon><DataObjectIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>JSON (.json)</ListItemText>
                </MenuItem>
                <MenuItem disabled>
                    <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>PDF (Coming Soon)</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};
