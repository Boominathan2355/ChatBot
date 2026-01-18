import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button
} from '@mui/material';

interface RenameDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    onTitleChange: (title: string) => void;
    onSave: () => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
    open,
    onClose,
    title,
    onTitleChange,
    onSave
}) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Chat Name"
                    fullWidth
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onSave()}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={onSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

export default RenameDialog;
