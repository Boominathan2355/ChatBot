import React, { useEffect, useRef } from 'react';
import { Box, styled } from '@mui/material';
import { useThemeMode } from '../context/ThemeContext';

const BackgroundContainer = styled(Box)<{ mode: 'light' | 'dark' }>(({ mode }) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    overflow: 'hidden',
    background: mode === 'dark' ? '#0a0a0a' : '#ffffff',
}));

interface ParticleProps {
    size: number;
    top: number;
    left: number;
    delay: number;
    duration: number;
    mode: 'light' | 'dark';
}

const Particle = styled('div')<ParticleProps>(
    ({ size, top, left, delay, duration, mode }) => ({
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        top: `${top}%`,
        left: `${left}%`,
        animation: `float ${duration}s ease-in-out ${delay}s infinite`,
        pointerEvents: 'none',
        opacity: mode === 'dark' ? 0.08 : 0.06,

        '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-30px)' },
        },
    })
);

const AnimatedBackground: React.FC = () => {
    const { mode } = useThemeMode();
    const particles = useRef<Array<{ size: number; top: number; left: number; delay: number; duration: number }>>([]);

    useEffect(() => {
        if (particles.current.length === 0) {
            for (let i = 0; i < 15; i++) {
                particles.current.push({
                    size: Math.random() * 150 + 80,
                    top: Math.random() * 100,
                    left: Math.random() * 100,
                    delay: Math.random() * 5,
                    duration: Math.random() * 15 + 15,
                });
            }
        }
    }, []);

    return (
        <BackgroundContainer mode={mode}>
            {particles.current.map((particle, index) => (
                <Particle
                    key={index}
                    size={particle.size}
                    top={particle.top}
                    left={particle.left}
                    delay={particle.delay}
                    duration={particle.duration}
                    mode={mode}
                    sx={{
                        background: mode === 'dark'
                            ? 'radial-gradient(circle, rgba(255, 255, 255, 0.5), transparent)'
                            : 'radial-gradient(circle, rgba(0, 0, 0, 0.3), transparent)',
                        filter: 'blur(60px)',
                    }}
                />
            ))}
        </BackgroundContainer>
    );
};

export default AnimatedBackground;
