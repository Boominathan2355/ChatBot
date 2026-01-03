import React, { useEffect, useRef } from 'react';
import { Box, styled } from '@mui/material';

const BackgroundContainer = styled(Box)({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1345 50%, #0f1b3d 100%)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 15s ease infinite',

    '@keyframes gradientShift': {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' },
    },
});

const Particle = styled('div')<{ size: number; top: number; left: number; delay: number; duration: number }>(
    ({ size, top, left, delay, duration }) => ({
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 229, 255, 0.8), transparent)',
        top: `${top}%`,
        left: `${left}%`,
        animation: `float ${duration}s ease-in-out ${delay}s infinite, pulse-glow 3s ease-in-out infinite`,
        pointerEvents: 'none',

        '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-30px)' },
        },
    })
);

const AnimatedBackground: React.FC = () => {
    const particles = useRef<Array<{ size: number; top: number; left: number; delay: number; duration: number; color: string }>>([]);

    useEffect(() => {
        // Generate random particles
        const colors = ['rgba(0, 229, 255, 0.8)', 'rgba(187, 134, 252, 0.8)', 'rgba(255, 107, 157, 0.8)'];

        for (let i = 0; i < 20; i++) {
            particles.current.push({
                size: Math.random() * 100 + 50,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 5,
                duration: Math.random() * 10 + 10,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    }, []);

    return (
        <BackgroundContainer>
            {particles.current.map((particle, index) => (
                <Particle
                    key={index}
                    size={particle.size}
                    top={particle.top}
                    left={particle.left}
                    delay={particle.delay}
                    duration={particle.duration}
                    sx={{
                        background: `radial-gradient(circle, ${particle.color}, transparent)`,
                        filter: 'blur(40px)',
                    }}
                />
            ))}
        </BackgroundContainer>
    );
};

export default AnimatedBackground;
