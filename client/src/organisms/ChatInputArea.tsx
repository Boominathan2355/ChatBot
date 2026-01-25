import React, { useRef } from 'react';
import {
    Box,
    TextField,
    IconButton,
    Tooltip,
    CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import LanguageIcon from '@mui/icons-material/Language';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { AttachmentPreview } from '../molecules/AttachmentPreview';
import { ModelSelectorTrigger, ModelSwitchMenu } from '../molecules/ModelSwitchMenu';
import { ToneSelector, ModeSelector } from '../components/ChatConfigMenu';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface ChatInputAreaProps {
    input: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
    onPaste: (e: React.ClipboardEvent) => void;
    isLoading: boolean;
    isUploading: boolean;
    // Web search
    webSearchEnabled: boolean;
    onToggleWebSearch: () => void;
    isSearching: boolean;
    // RAG toggle
    ragEnabled: boolean;
    onToggleRag: () => void;
    // Thinking mode
    thinkingEnabled: boolean;
    onToggleThinking: () => void;
    // File attachment
    attachedFile: File | null;
    attachedFileUrl: string | null;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveAttachment: () => void;
    // Model switching
    currentModel: string;
    availableModels: { id: string; name: string }[];
    aiProvider: string;
    isLoadingModels: boolean;
    onModelSwitch: (modelId: string) => void;
    modelMenuAnchor: HTMLElement | null;
    onModelMenuOpen: (e: React.MouseEvent<HTMLElement>) => void;
    onModelMenuClose: () => void;
    // Styling
    resolvedMode: ResolvedMode;
    isMobile: boolean;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
    input,
    onInputChange,
    onSend,
    onStop,
    onPaste,
    isLoading,
    isUploading,
    webSearchEnabled,
    onToggleWebSearch,
    isSearching,
    ragEnabled,
    onToggleRag,
    attachedFile,
    attachedFileUrl,
    onFileSelect,
    onRemoveAttachment,
    currentModel,
    availableModels,
    aiProvider,
    isLoadingModels,
    onModelSwitch,
    modelMenuAnchor,
    onModelMenuOpen,
    onModelMenuClose,
    resolvedMode,
    thinkingEnabled,
    onToggleThinking,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() || attachedFile) {
                onSend();
            }
        }
    };

    return (
        <Box
            sx={{
                p: { xs: 1.5, sm: 2 },
                background: isDarkMode(resolvedMode)
                    ? 'rgba(33, 33, 33, 0.7)'
                    : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                borderTop: isDarkMode(resolvedMode)
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.08)',
                boxShadow: isDarkMode(resolvedMode)
                    ? '0 -4px 24px rgba(0, 0, 0, 0.2)'
                    : '0 -4px 24px rgba(0, 0, 0, 0.05)'
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto' }}>
                {/* Attachment Preview */}
                {attachedFile && (
                    <AttachmentPreview
                        file={attachedFile}
                        fileUrl={attachedFileUrl}
                        onRemove={onRemoveAttachment}
                        resolvedMode={resolvedMode}
                    />
                )}

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 1,
                        bgcolor: isDarkMode(resolvedMode)
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.02)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 3,
                        border: isDarkMode(resolvedMode)
                            ? '1px solid rgba(255,255,255,0.08)'
                            : '1px solid rgba(0,0,0,0.08)',
                        p: 1,
                        '&:focus-within': {
                            border: isDarkMode(resolvedMode)
                                ? '1px solid rgba(255,255,255,0.15)'
                                : '1px solid rgba(0,0,0,0.15)'
                        }
                    }}
                >
                    {/* Web Search Toggle */}
                    <Tooltip
                        title={webSearchEnabled ? 'Web Search ON' : 'Web Search OFF'}
                    >
                        <IconButton
                            onClick={onToggleWebSearch}
                            size="small"
                            sx={{
                                bgcolor: webSearchEnabled
                                    ? (isDarkMode(resolvedMode)
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(0,0,0,0.08)')
                                    : 'transparent'
                            }}
                        >
                            {isSearching
                                ? <CircularProgress size={18} />
                                : <LanguageIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                    </Tooltip>

                    {/* RAG / Docs Toggle */}
                    <Tooltip title={ragEnabled ? 'Knowledge Base ON' : 'Knowledge Base OFF'}>
                        <IconButton
                            onClick={onToggleRag}
                            size="small"
                            sx={{
                                bgcolor: ragEnabled
                                    ? (isDarkMode(resolvedMode)
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(0,0,0,0.08)')
                                    : 'transparent',
                                color: ragEnabled ? 'primary.main' : 'inherit'
                            }}
                        >
                            <LibraryBooksIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>

                    {/* Thinking Mode Toggle */}
                    <Tooltip title={thinkingEnabled ? 'Thinking ON' : 'Thinking OFF'}>
                        <IconButton
                            onClick={onToggleThinking}
                            size="small"
                            sx={{
                                bgcolor: thinkingEnabled
                                    ? (isDarkMode(resolvedMode)
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(0,0,0,0.08)')
                                    : 'transparent',
                                color: thinkingEnabled ? 'primary.main' : 'inherit'
                            }}
                        >
                            <Box sx={{
                                width: 18,
                                height: 18,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: 12,
                                border: '1.5px solid currentColor',
                                borderRadius: '50%'
                            }}>
                                T
                            </Box>
                        </IconButton>
                    </Tooltip>

                    {/* Tone & Mode Selectors */}
                    <ToneSelector resolvedMode={resolvedMode} />
                    <ModeSelector resolvedMode={resolvedMode} />

                    {/* File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*,.pdf,.docx,.txt"
                        onChange={onFileSelect}
                    />
                    <Tooltip title="Attach File">
                        <IconButton
                            onClick={() => fileInputRef.current?.click()}
                            size="small"
                            color={attachedFile ? 'primary' : 'default'}
                        >
                            <AttachFileIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>

                    {/* Model Switcher */}
                    <ModelSelectorTrigger
                        currentModel={currentModel}
                        onClick={onModelMenuOpen}
                        resolvedMode={resolvedMode}
                    />

                    {/* Text Input */}
                    <TextField
                        fullWidth
                        multiline
                        maxRows={6}
                        placeholder="Message Jarvis..."
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={onPaste}
                        variant="standard"
                        InputProps={{
                            disableUnderline: true,
                            sx: { fontSize: 14, py: 0.5 }
                        }}
                    />

                    {/* Send/Stop Button */}
                    <IconButton
                        onClick={isLoading ? onStop : onSend}
                        disabled={
                            (!input.trim() && !attachedFile && !isLoading) ||
                            isUploading
                        }
                        size="small"
                        sx={{
                            bgcolor: (input.trim() || attachedFile || isLoading)
                                ? (isDarkMode(resolvedMode) ? '#fff' : '#212121')
                                : 'transparent',
                            color: (input.trim() || attachedFile || isLoading)
                                ? (isDarkMode(resolvedMode) ? '#212121' : '#fff')
                                : 'inherit',
                            '&:hover': {
                                bgcolor: (input.trim() || attachedFile || isLoading)
                                    ? (isDarkMode(resolvedMode) ? '#eee' : '#222')
                                    : 'transparent'
                            },
                            '&.Mui-disabled': { bgcolor: 'transparent' }
                        }}
                    >
                        {isUploading ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : isLoading ? (
                            <StopCircleIcon sx={{ fontSize: 20 }} />
                        ) : (
                            <SendIcon sx={{ fontSize: 18 }} />
                        )}
                    </IconButton>
                </Box>
            </Box>

            {/* Model Switch Menu */}
            <ModelSwitchMenu
                anchorEl={modelMenuAnchor}
                open={Boolean(modelMenuAnchor)}
                onClose={onModelMenuClose}
                currentModel={currentModel}
                availableModels={availableModels}
                aiProvider={aiProvider}
                isLoading={isLoadingModels}
                onModelSwitch={onModelSwitch}
                resolvedMode={resolvedMode}
            />
        </Box >
    );
};

export default ChatInputArea;
