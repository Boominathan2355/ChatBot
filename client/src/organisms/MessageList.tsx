import React from 'react';
import { Box, Typography } from '@mui/material';
import { MessageBubble } from '../molecules/MessageBubble';
import type { ResolvedMode } from '../types';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    image?: { url: string; width?: number; height?: number };
    metadata?: { senderName?: string; documentId?: string };
}

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    resolvedMode: ResolvedMode;
    isMobile: boolean;
    // Edit state
    editingMessageIndex: number | null;
    editedContent: string;
    onEditChange: (content: string) => void;
    onCancelEdit: () => void;
    onSaveEdit: (index: number) => void;
    // Actions
    onCopy: (content: string) => void;
    onEdit: (index: number, content: string) => void;
    onRegenerate: (index: number) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    isLoading,
    resolvedMode,
    isMobile,
    editingMessageIndex,
    editedContent,
    onEditChange,
    onCancelEdit,
    onSaveEdit,
    onCopy,
    onEdit,
    onRegenerate
}) => {
    return (
        <Box
            sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                px: isMobile ? 2 : 4,
                py: 4
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto' }}>
                {/* Empty State */}
                {messages.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography
                            variant="h4"
                            sx={{ fontWeight: 500, opacity: 0.8, mb: 1 }}
                        >
                            How can I help you today?
                        </Typography>
                    </Box>
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                    <MessageBubble
                        key={i}
                        message={msg}
                        index={i}
                        isLoading={isLoading}
                        isLastMessage={i === messages.length - 1}
                        nextMessage={messages[i + 1]}
                        resolvedMode={resolvedMode}
                        onCopy={onCopy}
                        onEdit={onEdit}
                        onRegenerate={onRegenerate}
                        isEditing={editingMessageIndex === i}
                        editedContent={editedContent}
                        onEditChange={onEditChange}
                        onCancelEdit={onCancelEdit}
                        onSaveEdit={onSaveEdit}
                    />
                ))}

            </Box>
        </Box>
    );
};

export default MessageList;
