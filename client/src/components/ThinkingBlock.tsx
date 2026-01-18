import React, { useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PsychologyIcon from '@mui/icons-material/Psychology';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface ThinkingBlockProps {
    content: string;
    resolvedMode: ResolvedMode;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, resolvedMode }) => {
    const [expanded, setExpanded] = useState(false);
    const isDark = isDarkMode(resolvedMode);

    return (
        <Box
            sx={{
                mb: 2,
                overflow: 'hidden',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: 2
            }}
        >
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    cursor: 'pointer',
                    userSelect: 'none',
                    opacity: 0.9,
                    '&:hover': {
                        opacity: 1
                    }
                }}
            >
                <PsychologyIcon
                    sx={{
                        fontSize: 18,
                        color: '#3b82f6' // Blue color like the atom icon
                    }}
                />
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        color: isDark ? '#e5e7eb' : '#374151'
                    }}
                >
                    Thinking
                </Typography>
                {expanded ? (
                    <KeyboardArrowUpIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                ) : (
                    <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                )}
            </Box>

            <Collapse in={expanded}>
                <Box
                    sx={{
                        pl: 4.5, // Indent to align with text, relative to icon width + gap
                        pr: 2,
                        pb: 2,
                        color: isDark ? '#9ca3af' : '#6b7280', // Muted text color
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap'
                    }}
                >
                    {content}
                </Box>
            </Collapse>
        </Box>
    );
};

export default ThinkingBlock;
