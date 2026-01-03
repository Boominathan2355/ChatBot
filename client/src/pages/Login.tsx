import React, { useState } from 'react';
import { Box, TextField, Typography, Container, Avatar } from '@mui/material';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassButton } from '../components';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint = isRegister ? '/auth/register' : '/auth/login';
            const payload = isRegister ? { username: email.split('@')[0], email, password } : { email, password };
            const { data } = await api.post(endpoint, payload);
            setAuth(data.user, data.token);
            navigate('/chat');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Authentication failed');
        }
    };

    return (
        <Container maxWidth="xs">
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 1
                }}
            >
                <GlassCard
                    sx={{
                        p: 4,
                        width: '100%',
                        textAlign: 'center',
                        animation: 'float 6s ease-in-out infinite'
                    }}
                    className="animate-pulse-glow"
                >
                    <Avatar
                        sx={{
                            width: 64,
                            height: 64,
                            mx: 'auto',
                            mb: 2,
                            background: 'linear-gradient(135deg, #00e5ff 0%, #bb86fc 100%)',
                            boxShadow: '0 8px 24px rgba(0, 229, 255, 0.4)'
                        }}
                    >
                        <LockOutlinedIcon sx={{ fontSize: 32 }} />
                    </Avatar>

                    <Typography
                        variant="h4"
                        gutterBottom
                        sx={{
                            background: 'linear-gradient(135deg, #00e5ff 0%, #bb86fc 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 700,
                            mb: 1
                        }}
                    >
                        Jarvis AI
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4, opacity: 0.8 }}>
                        {isRegister ? 'Create an account to get started' : 'Sign in to your account'}
                    </Typography>

                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Email Address"
                            margin="normal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            sx={{ mb: 3 }}
                        />
                        <GlassButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{ mb: 2 }}
                        >
                            {isRegister ? 'Register' : 'Sign In'}
                        </GlassButton>
                        <GlassButton
                            fullWidth
                            variant="text"
                            onClick={() => setIsRegister(!isRegister)}
                        >
                            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                        </GlassButton>
                    </form>
                </GlassCard>
            </Box>
        </Container>
    );
};

export default Login;
