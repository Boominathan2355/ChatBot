import React, { useState } from 'react';
import { Box, CircularProgress, Typography, Modal, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';

interface ImageMessageProps {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    resolvedMode: 'light' | 'dark';
}

const ImageMessage: React.FC<ImageMessageProps> = ({ src, alt, width, height, resolvedMode }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const handleImageLoad = () => setIsLoading(false);
    const handleImageError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    return (
        <Box sx={{ mt: 1, mb: 0.5 }}>
            <Box
                onClick={() => !hasError && setOpenModal(true)}
                sx={{
                    position: 'relative',
                    maxWidth: '100%',
                    width: width ? Math.min(width, 300) : 'auto',
                    height: height ? 'auto' : 200,
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: hasError ? 'default' : 'pointer',
                    bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {isLoading && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={30} thickness={4} />
                    </Box>
                )}

                {hasError ? (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        <BrokenImageIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                        <Typography variant="caption" display="block">Image failed to load</Typography>
                    </Box>
                ) : (
                    <img
                        src={src}
                        alt={alt || 'Attached image'}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        style={{
                            display: isLoading ? 'none' : 'block',
                            width: '100%',
                            height: 'auto',
                            maxHeight: 400,
                            objectFit: 'contain'
                        }}
                    />
                )}
            </Box>

            {/* Lightbox Modal */}
            <Modal
                open={openModal}
                onClose={() => setOpenModal(false)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}
            >
                <Box sx={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', outline: 'none' }}>
                    <IconButton
                        onClick={() => setOpenModal(false)}
                        sx={{
                            position: 'absolute',
                            top: -40,
                            right: 0,
                            color: '#fff',
                            bgcolor: 'rgba(0,0,0,0.5)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <img
                        src={src}
                        alt={alt}
                        style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                    />
                </Box>
            </Modal>
        </Box>
    );
};

export default ImageMessage;
