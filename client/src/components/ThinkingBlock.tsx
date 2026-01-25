import React, { useState, useEffect } from 'react';
import { Box, Typography, Collapse, keyframes } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PsychologyIcon from '@mui/icons-material/Psychology';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

const pulse = keyframes`
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.6; transform: scale(1); }
`;



interface ThinkingBlockProps {
    content: string;
    resolvedMode: ResolvedMode;
    isStreaming?: boolean;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, resolvedMode, isStreaming }) => {
    // Auto-expand while streaming
    const [expanded, setExpanded] = useState(isStreaming || false);
    const isDark = isDarkMode(resolvedMode);

    useEffect(() => {
        if (isStreaming) setExpanded(true);
    }, [isStreaming]);

    return (
        <Box
            sx={{
                mb: 2,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: 2,
                borderLeft: '3px solid',
                borderColor: isStreaming ? (isDark ? '#3b82f6' : '#2563eb') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                transition: 'all 0.3s ease',
            }}
        >
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    pl: 1.5,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': {
                        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
                    }
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isStreaming
                            ? (isDark ? '#3b82f6' : '#2563eb')
                            : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
                        animation: isStreaming ? `${pulse} 2s infinite ease-in-out` : 'none'
                    }}
                >
                    <PsychologyIcon sx={{ fontSize: 16 }} />
                </Box>

                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                        flex: 1
                    }}
                >
                    {isStreaming ? "Thinking..." : "Thought Process"}
                </Typography>

                <Box sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', display: 'flex' }}>
                    {expanded ? <KeyboardArrowUpIcon sx={{ fontSize: 16 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                </Box>
            </Box>

            <Collapse in={expanded}>
                <Box
                    sx={{
                        p: 1.5,
                        pt: 0,
                        pl: 4,
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                        fontStyle: 'italic'
                    }}
                >
                    {content}
                    {isStreaming && <span className="animate-pulse">_</span>}
                </Box>
            </Collapse>
        </Box>
    );
};

export default ThinkingBlock;
