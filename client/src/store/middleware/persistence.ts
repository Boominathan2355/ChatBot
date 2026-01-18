import { type Middleware } from '@reduxjs/toolkit';

export const persistenceMiddleware: Middleware<{}, any> = store => next => action => {
    const result = next(action);
    const state = store.getState();

    // Check specific actions or just state changes if we want to be generic
    // Use type assertion or string checking safely
    const actionType = (action as { type: string }).type;

    if (actionType.startsWith('auth/')) {
        const { user, token } = state.auth;
        if (token && user) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }

    if (actionType.startsWith('ui/')) {
        localStorage.setItem('theme-mode', state.ui.themeMode);
    }

    return result;
};
