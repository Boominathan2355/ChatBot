import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    TextField,
    Button,
    Box
} from '@mui/material';
import type { ResolvedMode } from '../types';
import { isDarkMode } from '../types';

interface ShareDialogProps {
    open: boolean;
    onClose: () => void;
    shareUrl: string;
    inviteMode: boolean;
    onRevoke: () => void;
    onCopy: () => void;
    resolvedMode: ResolvedMode;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
    open,
    onClose,
    shareUrl,
    inviteMode,
    onRevoke,
    onCopy,
    resolvedMode
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { borderRadius: 3, minWidth: 440 }
            }}
        >
            <DialogTitle
                sx={{
                    borderBottom: isDarkMode(resolvedMode)
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(0,0,0,0.08)',
                    fontSize: 16,
                    fontWeight: 600
                }}
            >
                {inviteMode ? 'Invite People' : 'Share Chat'}
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
                <Typography sx={{ fontSize: 13, opacity: 0.7, mb: 1.5, mt: 2 }}>
                    {inviteMode
                        ? 'Share this link to let others join this specific chat group.'
                        : 'Share this link to let others view or import a copy of this chat.'}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        value={shareUrl}
                        InputProps={{
                            readOnly: true,
                            sx: {
                                fontSize: 13,
                                bgcolor: isDarkMode(resolvedMode)
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.03)',
                                borderRadius: 1.5,
                                height: 40,
                                '& fieldset': {
                                    border: isDarkMode(resolvedMode)
                                        ? '1px solid rgba(255,255,255,0.1)'
                                        : '1px solid rgba(0,0,0,0.1)'
                                }
                            }
                        }}
                        size="small"
                    />
                    <Button
                        disableElevation
                        variant="outlined"
                        onClick={onRevoke}
                        sx={{
                            color: '#f44336',
                            borderColor: isDarkMode(resolvedMode)
                                ? 'rgba(244, 67, 54, 0.5)'
                                : 'rgba(244, 67, 54, 0.5)',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            px: 2,
                            '&:hover': {
                                bgcolor: isDarkMode(resolvedMode)
                                    ? 'rgba(244, 67, 54, 0.1)'
                                    : 'rgba(244, 67, 54, 0.05)',
                                borderColor: '#f44336'
                            }
                        }}
                    >
                        Revoke
                    </Button>
                    <Button
                        disableElevation
                        variant="contained"
                        onClick={onCopy}
                        sx={{
                            bgcolor: isDarkMode(resolvedMode) ? '#fff' : '#212121',
                            color: isDarkMode(resolvedMode) ? '#212121' : '#fff',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            px: 3,
                            '&:hover': {
                                bgcolor: isDarkMode(resolvedMode) ? '#e0e0e0' : '#333'
                            }
                        }}
                    >
                        Copy
                    </Button>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 1 }}>
                <Button onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ShareDialog;
