import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface AttachmentPreviewProps {
    file: File;
    fileUrl: string | null;
    onRemove: () => void;
    resolvedMode: ResolvedMode;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
    file,
    fileUrl,
    onRemove,
    resolvedMode
}) => {
    return (
        <Box
            sx={{
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: isDarkMode(resolvedMode)
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.02)',
                p: 1,
                borderRadius: 1.5,
                border: isDarkMode(resolvedMode)
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.08)',
                width: 'fit-content'
            }}
        >
            {fileUrl ? (
                <Box sx={{ position: 'relative' }}>
                    <img
                        src={fileUrl}
                        alt="preview"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 4,
                            objectFit: 'cover'
                        }}
                    />
                </Box>
            ) : (
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isDarkMode(resolvedMode)
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.05)',
                        borderRadius: 1
                    }}
                >
                    <AttachFileIcon sx={{ fontSize: 20 }} />
                </Box>
            )}
            <Box sx={{ mr: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {file.name}
                </Typography>
                <Typography sx={{ fontSize: 11, opacity: 0.5 }}>
                    {(file.size / 1024).toFixed(0)} KB •{' '}
                    {file.type.split('/')[1] || 'document'}
                </Typography>
            </Box>
            <IconButton
                size="small"
                onClick={onRemove}
                sx={{ ml: 'auto' }}
            >
                <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
        </Box>
    );
};

export default AttachmentPreview;
