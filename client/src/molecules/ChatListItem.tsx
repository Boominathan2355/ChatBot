import React from 'react';
import {
    ListItemButton,
    ListItemText,
    IconButton
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface Chat {
    _id: string;
    title?: string;
    isPinned?: boolean;
    folder?: string | null;
    isGrouped?: boolean;
}

interface ChatListItemProps {
    chat: Chat;
    selected: boolean;
    onSelect: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    resolvedMode: ResolvedMode;
}

export const ChatListItem = React.memo<ChatListItemProps>(
    ({ chat, selected, onSelect, onContextMenu, resolvedMode }) => (
        <ListItemButton
            selected={selected}
            onClick={onSelect}
            sx={{
                borderRadius: 1,
                py: 0.75,
                px: 1.5,
                mb: 0.25,
                position: 'relative',
                '&.Mui-selected': {
                    bgcolor: isDarkMode(resolvedMode)
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.05)'
                },
                '&:hover': {
                    bgcolor: isDarkMode(resolvedMode)
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.03)',
                    '& .more-btn': { opacity: 1 }
                }
            }}
        >
            <ListItemText
                primary={chat.title || 'New Chat'}
                primaryTypographyProps={{
                    noWrap: true,
                    fontSize: 14,
                    sx: { pr: 3, fontWeight: selected ? 600 : 400 }
                }}
            />
            <IconButton
                className="more-btn"
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    onContextMenu(e);
                }}
                sx={{
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    color: isDarkMode(resolvedMode)
                        ? 'rgba(255,255,255,0.5)'
                        : 'rgba(0,0,0,0.5)',
                    '&:hover': {
                        color: isDarkMode(resolvedMode) ? '#fff' : '#000',
                        bgcolor: 'transparent'
                    }
                }}
            >
                <MoreHorizIcon sx={{ fontSize: 16 }} />
            </IconButton>
        </ListItemButton>
    ),
    (prevProps, nextProps) => {
        return (
            prevProps.chat._id === nextProps.chat._id &&
            prevProps.chat.title === nextProps.chat.title &&
            prevProps.selected === nextProps.selected &&
            prevProps.resolvedMode === nextProps.resolvedMode
        );
    }
);

ChatListItem.displayName = 'ChatListItem';

export default ChatListItem;
