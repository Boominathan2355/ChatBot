import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { isDarkMode } from '../types';
import type { ResolvedMode } from '../types';

const pulse = keyframes`
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
`;

interface ThinkingIndicatorProps {
    resolvedMode: ResolvedMode;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ resolvedMode }) => {
    const [text, setText] = useState('Thinking');
    const stages = ['Thinking', 'Analyzing', 'Processing', 'Generating'];

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % stages.length;
            setText(stages[index]);
        }, 3000); // Change text every 3 seconds

        return () => clearInterval(interval);
    }, []);

    const dotStyle = {
        width: 6,
        height: 6,
        borderRadius: '50%',
        bgcolor: isDarkMode(resolvedMode) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
        animation: `${pulse} 1.5s infinite ease-in-out`,
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, opacity: 0.8 }}>
            {/* Pulsing Dots */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box sx={{ ...dotStyle, animationDelay: '0s' }} />
                <Box sx={{ ...dotStyle, animationDelay: '0.2s' }} />
                <Box sx={{ ...dotStyle, animationDelay: '0.4s' }} />
            </Box>

            {/* Stage Text */}
            <Typography
                variant="caption"
                sx={{
                    fontFamily: 'monospace',
                    color: isDarkMode(resolvedMode) ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    fontWeight: 500
                }}
            >
                {text}...
            </Typography>
        </Box>
    );
};

export default ThinkingIndicator;
