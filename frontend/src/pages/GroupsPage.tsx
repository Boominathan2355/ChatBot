import React, { useState, useEffect } from 'react';
import { Box, Container, Paper, Typography, Button, List, ListItem, ListItemButton, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupIcon from '@mui/icons-material/Group';
import api from '../services/api';

const GroupsPage: React.FC = () => {
    const [groups, setGroups] = useState<any[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const { data } = await api.get('/groups');
            setGroups(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateGroup = async () => {
        try {
            await api.post('/groups', { name: newGroupName, description: newGroupDesc });
            setOpenDialog(false);
            setNewGroupName('');
            setNewGroupDesc('');
            loadGroups();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to create group');
        }
    };

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
            <Container maxWidth="md">
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => navigate('/chat')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" color="primary">Groups</Typography>
                    </Box>
                    <Button variant="contained" onClick={() => setOpenDialog(true)}>
                        + New Group
                    </Button>
                </Box>

                <Paper sx={{ p: 3 }}>
                    {groups.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <GroupIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                            <Typography color="text.secondary">No groups yet. Create one to get started!</Typography>
                        </Box>
                    ) : (
                        <List>
                            {groups.map(group => (
                                <ListItem key={group._id} disablePadding>
                                    <ListItemButton
                                        onClick={() => navigate(`/groups/${group._id}`)}
                                        sx={{
                                            borderRadius: 2,
                                            mb: 1
                                        }}
                                    >
                                        <ListItemText
                                            primary={group.name}
                                            secondary={`${group.members.length} members • ${group.description || 'No description'}`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>
            </Container>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Group Name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Description (optional)"
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        margin="normal"
                        multiline
                        rows={3}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateGroup} variant="contained" disabled={!newGroupName.trim()}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GroupsPage;
