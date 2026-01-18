import React from 'react';
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemText,
    Typography,
    IconButton,
    Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import PushPinIcon from '@mui/icons-material/PushPin';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { ChatListItem, UserProfileMenu } from '../molecules';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

const DRAWER_WIDTH = 260;

interface Chat {
    _id: string;
    title?: string;
    isPinned?: boolean;
    folder?: string | null;
    isGrouped?: boolean;
    lastMessageAt?: string;
}

interface Group {
    _id: string;
    name: string;
}

interface ChatSidebarProps {
    chats: Chat[];
    groups: Group[];
    currentChatId: string | null;
    sidebarOpen: boolean;
    isMobile: boolean;
    folders: string[];
    openFolders: { [key: string]: boolean };
    user: { username?: string } | null;
    resolvedMode: ResolvedMode;
    // User menu state
    menuAnchorEl: HTMLElement | null;
    menuOpen: boolean;
    // Callbacks
    onSidebarClose: () => void;
    onSelectChat: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, chatId: string) => void;
    onCreateNewChat: () => void;
    onNavigateGroups: () => void;
    onStartGroupChat: (groupId: string) => void;
    onToggleFolder: (folder: string) => void;
    onMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
    onMenuClose: () => void;
    onSettingsOpen: () => void;
    onPersonalizationOpen: () => void;
    onLogout: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    chats,
    groups,
    currentChatId,
    sidebarOpen,
    isMobile,
    folders,
    openFolders,
    user,
    resolvedMode,
    menuAnchorEl,
    menuOpen,
    onSidebarClose,
    onSelectChat,
    onContextMenu,
    onCreateNewChat,
    onNavigateGroups,
    onStartGroupChat,
    onToggleFolder,
    onMenuClick,
    onMenuClose,
    onSettingsOpen,
    onPersonalizationOpen,
    onLogout
}) => {
    const pinnedChats = chats.filter((c) => c.isPinned);
    const recentChats = chats.filter(
        (c) => !c.isPinned && !c.folder && !c.isGrouped
    );
    const groupChats = chats.filter(
        (c) => !c.isPinned && !c.folder && c.isGrouped
    );

    return (
        <Drawer
            variant={isMobile ? 'temporary' : 'persistent'}
            open={sidebarOpen}
            onClose={onSidebarClose}
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    background: isDarkMode(resolvedMode)
                        ? 'rgba(33, 33, 33, 0.7)'
                        : 'rgba(245, 245, 245, 0.7)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    borderRight: isDarkMode(resolvedMode)
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(0,0,0,0.08)',
                    boxShadow: isDarkMode(resolvedMode)
                        ? '4px 0 24px rgba(0, 0, 0, 0.3)'
                        : '4px 0 24px rgba(0, 0, 0, 0.08)'
                }
            }}
        >
            {/* Sidebar Header */}
            <Box
                sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Tooltip title="Manage Groups">
                    <IconButton onClick={onNavigateGroups} size="small">
                        <GroupsIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="New Chat">
                    <IconButton onClick={onCreateNewChat} size="small">
                        <AddIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Chat List */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
                {/* Pinned Chats */}
                {pinnedChats.length > 0 && (
                    <>
                        <Typography
                            sx={{
                                px: 1.5, pt: 2, pb: 0.5,
                                fontSize: 11, opacity: 0.6, fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex', alignItems: 'center', gap: 1
                            }}
                        >
                            <PushPinIcon sx={{ fontSize: 12 }} /> Pinned
                        </Typography>
                        <List disablePadding>
                            {pinnedChats.map((chat) => (
                                <ChatListItem
                                    key={chat._id}
                                    chat={chat}
                                    selected={currentChatId === chat._id}
                                    onSelect={() => onSelectChat(chat._id)}
                                    onContextMenu={(e) => onContextMenu(e, chat._id)}
                                    resolvedMode={resolvedMode}
                                />
                            ))}
                        </List>
                    </>
                )}

                {/* Folders */}
                {folders.map((folder) => {
                    const folderChats = chats.filter(
                        (c) => !c.isPinned && c.folder === folder
                    );
                    if (folderChats.length === 0) return null;

                    return (
                        <Box key={folder}>
                            <ListItemButton
                                onClick={() => onToggleFolder(folder)}
                                sx={{
                                    py: 0.5, px: 1.5, mt: 1, opacity: 0.8,
                                    '&:hover': { opacity: 1, bgcolor: 'transparent' }
                                }}
                            >
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1, flex: 1
                                }}>
                                    {openFolders[folder]
                                        ? <FolderOpenIcon sx={{ fontSize: 14 }} />
                                        : <FolderIcon sx={{ fontSize: 14 }} />}
                                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                        {folder}
                                    </Typography>
                                </Box>
                                <KeyboardArrowRightIcon
                                    sx={{
                                        fontSize: 16,
                                        transform: openFolders[folder]
                                            ? 'rotate(90deg)' : 'none',
                                        transition: 'transform 0.2s'
                                    }}
                                />
                            </ListItemButton>

                            {openFolders[folder] && (
                                <List disablePadding sx={{ pl: 1 }}>
                                    {folderChats.map((chat) => (
                                        <ChatListItem
                                            key={chat._id}
                                            chat={chat}
                                            selected={currentChatId === chat._id}
                                            onSelect={() => onSelectChat(chat._id)}
                                            onContextMenu={(e) => onContextMenu(e, chat._id)}
                                            resolvedMode={resolvedMode}
                                        />
                                    ))}
                                </List>
                            )}
                        </Box>
                    );
                })}

                {/* Recent (Direct) */}
                {recentChats.length > 0 && (
                    <>
                        <Typography
                            sx={{
                                px: 1.5, pt: 2, pb: 0.5,
                                fontSize: 11, opacity: 0.4, fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            Recent
                        </Typography>
                        <List disablePadding>
                            {recentChats.map((chat) => (
                                <ChatListItem
                                    key={chat._id}
                                    chat={chat}
                                    selected={currentChatId === chat._id}
                                    onSelect={() => onSelectChat(chat._id)}
                                    onContextMenu={(e) => onContextMenu(e, chat._id)}
                                    resolvedMode={resolvedMode}
                                />
                            ))}
                        </List>
                    </>
                )}

                {/* Group Chats */}
                {groupChats.length > 0 && (
                    <>
                        <Typography
                            sx={{
                                px: 1.5, pt: 2, pb: 0.5,
                                fontSize: 11, opacity: 0.4, fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            Group Chats
                        </Typography>
                        <List disablePadding>
                            {groupChats.map((chat) => (
                                <ChatListItem
                                    key={chat._id}
                                    chat={chat}
                                    selected={currentChatId === chat._id}
                                    onSelect={() => onSelectChat(chat._id)}
                                    onContextMenu={(e) => onContextMenu(e, chat._id)}
                                    resolvedMode={resolvedMode}
                                />
                            ))}
                        </List>
                    </>
                )}

                {/* Available Groups to Start */}
                {groups.length > 0 && (
                    <>
                        <Typography
                            sx={{
                                px: 1.5, pt: 2, pb: 0.5,
                                fontSize: 11, opacity: 0.4, fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            Start New Group Chat
                        </Typography>
                        <List disablePadding>
                            {groups.map((group) => (
                                <ListItemButton
                                    key={group._id}
                                    onClick={() => onStartGroupChat(group._id)}
                                    sx={{
                                        borderRadius: 1, py: 0.75, px: 1.5, mb: 0.25,
                                        '&:hover': {
                                            bgcolor: resolvedMode === 'dark'
                                                ? 'rgba(255,255,255,0.04)'
                                                : 'rgba(0,0,0,0.03)'
                                        }
                                    }}
                                >
                                    <ListItemText
                                        primary={group.name}
                                        primaryTypographyProps={{
                                            noWrap: true, fontSize: 14
                                        }}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </>
                )}
            </Box>

            {/* Sidebar Footer - User Profile */}
            <UserProfileMenu
                user={user}
                anchorEl={menuAnchorEl}
                open={menuOpen}
                onMenuClick={onMenuClick}
                onMenuClose={onMenuClose}
                onSettingsOpen={onSettingsOpen}
                onPersonalizationOpen={onPersonalizationOpen}
                onLogout={onLogout}
                resolvedMode={resolvedMode}
            />
        </Drawer>
    );
};

export default ChatSidebar;
