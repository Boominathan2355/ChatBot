import { createSlice, type PayloadAction } from '@reduxjs/toolkit';


type ReduxThemeMode = 'light' | 'dark' | 'system' | 'soft-dark' | 'night' | 'high-contrast' | 'soft-light';

interface UiState {
    themeMode: ReduxThemeMode;
    sidebarOpen: boolean;
    settingsDialogOpen: boolean;
    shareDialogOpen: boolean;
    renameDialogOpen: boolean;
}

const getInitialTheme = (): ReduxThemeMode => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ReduxThemeMode) || 'dark';
};

const initialState: UiState = {
    themeMode: getInitialTheme(),
    sidebarOpen: true, // Default open, can be adjusted based on media query in component
    settingsDialogOpen: false,
    shareDialogOpen: false,
    renameDialogOpen: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setThemeMode: (state, action: PayloadAction<ReduxThemeMode>) => {
            state.themeMode = action.payload;
            localStorage.setItem('theme-mode', action.payload);
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload;
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSettingsDialogOpen: (state, action: PayloadAction<boolean>) => {
            state.settingsDialogOpen = action.payload;
        },
        setShareDialogOpen: (state, action: PayloadAction<boolean>) => {
            state.shareDialogOpen = action.payload;
        },
        setRenameDialogOpen: (state, action: PayloadAction<boolean>) => {
            state.renameDialogOpen = action.payload;
        },
    },
});

export const {
    setThemeMode,
    setSidebarOpen,
    toggleSidebar,
    setSettingsDialogOpen,
    setShareDialogOpen,
    setRenameDialogOpen
} = uiSlice.actions;

export default uiSlice.reducer;
