import { Box, Typography, Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useNavigate } from 'react-router-dom';


interface OopsPageProps {
    title?: string;
    description?: string;
    onReset?: () => void;
    isError?: boolean;
    sx?: SxProps<Theme>;
}

const OopsPage: React.FC<OopsPageProps> = ({
    title = "404",
    description = "Oops! Page not found.",
    onReset,
    isError = false,
    sx
}) => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                height: '100vh',
                ...sx,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'background.default',
                color: 'text.primary',
                p: 3,
                textAlign: 'center'
            }}
        >
            <Typography variant="h2" sx={{ mb: 2, fontWeight: 'bold', background: isError ? 'linear-gradient(45deg, #FF5252, #F48FB1)' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {title}
            </Typography>
            <Typography variant="h4" sx={{ mb: 4 }}>
                {isError ? "Something went wrong" : description}
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, opacity: 0.7, maxWidth: 600 }}>
                {isError ? description : "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    onClick={() => navigate('/')}
                    size="large"
                    sx={{ borderRadius: 4, px: 4 }}
                >
                    Go Home
                </Button>
                {onReset && (
                    <Button
                        variant="outlined"
                        onClick={onReset}
                        size="large"
                        sx={{ borderRadius: 4, px: 4 }}
                    >
                        Try Again
                    </Button>
                )}
            </Box>
        </Box>
    );
};

export default OopsPage;
