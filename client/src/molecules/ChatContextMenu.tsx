import React from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface Chat {
    _id: string;
    isPinned?: boolean;
    folder?: string | null;
}

interface ChatContextMenuProps {
    contextMenu: { mouseX: number; mouseY: number; chatId: string } | null;
    onClose: () => void;
    targetChat: Chat | undefined;
    folders: string[];
    onRename: () => void;
    onPinChat: () => void;
    onMoveToFolder: (folder: string) => void;
    onRemoveFromFolder: () => void;
    onDelete: (e: React.MouseEvent, chatId: string) => void;
    resolvedMode: ResolvedMode;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
    contextMenu,
    onClose,
    targetChat,
    folders,
    onRename,
    onPinChat,
    onMoveToFolder,
    onRemoveFromFolder,
    onDelete,
    resolvedMode
}) => {
    return (
        <Menu
            open={contextMenu !== null}
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={
                contextMenu !== null
                    ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                    : undefined
            }
            PaperProps={{
                sx: {
                    width: 200,
                    bgcolor: isDarkMode(resolvedMode)
                        ? 'rgba(26, 26, 26, 0.8)'
                        : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: isDarkMode(resolvedMode)
                        ? '1px solid rgba(255, 255, 255, 0.08)'
                        : '1px solid rgba(0, 0, 0, 0.08)'
                }
            }}
        >
            <MenuItem onClick={onRename}>
                <ListItemIcon>
                    <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Rename</ListItemText>
            </MenuItem>

            <MenuItem onClick={onPinChat}>
                <ListItemIcon>
                    {targetChat?.isPinned ? (
                        <PushPinIcon fontSize="small" />
                    ) : (
                        <PushPinOutlinedIcon fontSize="small" />
                    )}
                </ListItemIcon>
                <ListItemText>
                    {targetChat?.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                </ListItemText>
            </MenuItem>

            <Divider />

            {folders.map((folder) => (
                <MenuItem key={folder} onClick={() => onMoveToFolder(folder)}>
                    <ListItemIcon>
                        <DriveFileMoveIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Move to {folder}</ListItemText>
                </MenuItem>
            ))}

            {targetChat?.folder && (
                <MenuItem onClick={onRemoveFromFolder}>
                    <ListItemIcon>
                        <FolderOpenIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Remove from Folder</ListItemText>
                </MenuItem>
            )}

            <Divider />

            <MenuItem
                onClick={(e) => {
                    onClose();
                    if (contextMenu?.chatId) {
                        onDelete(e, contextMenu.chatId);
                    }
                }}
                sx={{ color: 'error.main' }}
            >
                <ListItemIcon>
                    <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
            </MenuItem>
        </Menu>
    );
};

export default ChatContextMenu;
