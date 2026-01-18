import { type Middleware } from '@reduxjs/toolkit';

export const errorLoggerMiddleware: Middleware = _store => next => action => {
    const actionType = (action as { type: string }).type;

    if (actionType.endsWith('/rejected')) {
        const payload = (action as { payload: any }).payload;
        console.error(`[Redux Error] Action: ${actionType}`, payload);

        // Optionally dispatch a global notification toast here if we had one
        // store.dispatch(showToast({ type: 'error', message: payload }));
    }

    return next(action);
};
