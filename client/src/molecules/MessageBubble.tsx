import React from 'react';
import {
    Box,
    Avatar,
    Typography,
    TextField,
    Button
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MessageRenderer, ImageMessage } from '../components';
import ThinkingIndicator from '../components/ThinkingIndicator';
import { ActionButton } from '../atoms';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    image?: { url: string; width?: number; height?: number };
    metadata?: { senderName?: string; documentId?: string };
}

interface MessageBubbleProps {
    message: Message;
    index: number;
    isLoading: boolean;
    isLastMessage: boolean;
    nextMessage?: Message;
    resolvedMode: ResolvedMode;
    onCopy: (content: string) => void;
    onEdit: (index: number, content: string) => void;
    onRegenerate: (index: number) => void;
    // Edit mode props
    isEditing?: boolean;
    editedContent?: string;
    onEditChange?: (content: string) => void;
    onCancelEdit?: () => void;
    onSaveEdit?: (index: number) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    index,
    isLoading,
    nextMessage,
    resolvedMode,
    onCopy,
    onEdit,
    onRegenerate,
    isEditing = false,
    editedContent = '',
    onEditChange,
    onCancelEdit,
    onSaveEdit
}) => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 2,
                mb: 6,
                alignItems: 'flex-start',
                flexDirection: isUser ? 'row-reverse' : 'row'
            }}
        >
            <Avatar
                sx={{
                    width: 28,
                    height: 28,
                    bgcolor: isUser
                        ? (isDarkMode(resolvedMode)
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.08)')
                        : (isDarkMode(resolvedMode) ? '#fff' : '#212121'),
                    color: isUser
                        ? 'inherit'
                        : (isDarkMode(resolvedMode) ? '#212121' : '#fff'),
                    fontSize: 12
                }}
            >
                {isUser
                    ? <PersonIcon sx={{ fontSize: 16 }} />
                    : <SmartToyIcon sx={{ fontSize: 16 }} />}
            </Avatar>

            <Box
                sx={{
                    flex: 1,
                    pt: 0.25,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    width: isEditing ? '100%' : 'auto'
                }}
            >
                <Typography
                    sx={{
                        fontWeight: 600,
                        fontSize: 13,
                        mb: 0.5,
                        opacity: 0.6
                    }}
                >
                    {isUser ? 'You' : 'Jarvis'}
                </Typography>

                <Box
                    sx={{
                        minWidth: isEditing
                            ? { xs: '280px', sm: '300px' }
                            : 'auto',
                        maxWidth: isEditing
                            ? { xs: '95%', sm: '90%', md: '85%' }
                            : (isUser
                                ? { xs: '85%', sm: '75%', md: '70%' }
                                : { xs: '95%', sm: '92%', md: '90%' }),
                        width: isEditing ? { xs: '95%', sm: '90%' } : 'auto',
                        background: isUser
                            ? (isDarkMode(resolvedMode)
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 112, 243, 0.08)')
                            : 'transparent',
                        backdropFilter: isUser
                            ? 'blur(20px) saturate(150%)'
                            : 'none',
                        WebkitBackdropFilter: isUser
                            ? 'blur(20px) saturate(150%)'
                            : 'none',
                        borderRadius: { xs: 2, sm: 2.5 },
                        px: isUser ? { xs: 1.5, sm: 2 } : 0,
                        py: isUser ? { xs: 1.2, sm: 1.5 } : 0,
                        boxShadow: isUser
                            ? (isDarkMode(resolvedMode)
                                ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                                : '0 4px 16px rgba(0, 112, 243, 0.12)')
                            : 'none',
                        border: isUser
                            ? (isDarkMode(resolvedMode)
                                ? '1px solid rgba(255, 255, 255, 0.1)'
                                : '1px solid rgba(0, 112, 243, 0.15)')
                            : 'none',
                        transition: 'all 0.2s ease-in-out',
                        wordBreak: 'break-word',
                        '&:hover': {
                            boxShadow: isUser
                                ? (isDarkMode(resolvedMode)
                                    ? '0 6px 20px rgba(0, 0, 0, 0.3)'
                                    : '0 6px 20px rgba(0, 112, 243, 0.15)')
                                : 'none'
                        }
                    }}
                >
                    {message.image && (
                        <ImageMessage
                            src={message.image.url}
                            width={message.image.width}
                            height={message.image.height}
                            resolvedMode={resolvedMode}
                        />
                    )}

                    {isEditing ? (
                        <Box>
                            <TextField
                                fullWidth
                                multiline
                                value={editedContent}
                                onChange={(e) => onEditChange?.(e.target.value)}
                                autoFocus
                                variant="standard"
                                sx={{
                                    '& .MuiInput-root': { fontSize: 14 }
                                }}
                            />
                            <Box
                                sx={{
                                    mt: 1,
                                    display: 'flex',
                                    gap: 1,
                                    justifyContent: 'flex-end'
                                }}
                            >
                                <Button
                                    size="small"
                                    onClick={onCancelEdit}
                                    sx={{ textTransform: 'none', fontSize: 11 }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => onSaveEdit?.(index)}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: 10,
                                        py: 0.3,
                                        px: 1.2,
                                        minWidth: 'auto'
                                    }}
                                >
                                    Resend
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            {message.content && (
                                <MessageRenderer
                                    content={message.content}
                                    role={message.role}
                                    resolvedMode={resolvedMode}
                                />
                            )}
                            {!message.content &&
                                isAssistant &&
                                isLoading && (
                                    <Box sx={{ pl: 0.5 }}>
                                        <ThinkingIndicator resolvedMode={resolvedMode} />
                                    </Box>
                                )}
                        </>
                    )}
                </Box>

                {/* Action Buttons */}
                {!isLoading && !isEditing && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        {message.content && (
                            <ActionButton
                                tooltip="Copy"
                                onClick={() => onCopy(message.content)}
                                icon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                                label="Copy"
                                resolvedMode={resolvedMode}
                            />
                        )}
                        {isUser && message.content && (
                            <ActionButton
                                tooltip="Edit"
                                onClick={() => onEdit(index, message.content)}
                                icon={<EditIcon sx={{ fontSize: 14 }} />}
                                label="Edit"
                                resolvedMode={resolvedMode}
                            />
                        )}
                        {isUser &&
                            nextMessage?.role === 'system' && (
                                <ActionButton
                                    tooltip="Try Again"
                                    onClick={() => onRegenerate(index)}
                                    icon={<RefreshIcon sx={{ fontSize: 14 }} />}
                                    label="Try Again"
                                    resolvedMode={resolvedMode}
                                />
                            )}
                        {isAssistant && (
                            <ActionButton
                                tooltip="Regenerate"
                                onClick={() => onRegenerate(index)}
                                icon={<RefreshIcon sx={{ fontSize: 14 }} />}
                                label="Regenerate"
                                resolvedMode={resolvedMode}
                            />
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default MessageBubble;
