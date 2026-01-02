import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Container } from '@mui/material';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

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
            <Box sx={{ mt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Paper sx={{ p: 4, width: '100%', textAlign: 'center' }}>
                    <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 700 }}>
                        Jarvis AI
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {isRegister ? 'Register' : 'Sign In'}
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => setIsRegister(!isRegister)}
                        >
                            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                        </Button>
                    </form>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login;
