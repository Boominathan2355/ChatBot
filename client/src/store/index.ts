import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import chatReducer from './slices/chatSlice';

import { persistenceMiddleware } from './middleware/persistence';
import { errorLoggerMiddleware } from './middleware/errorLogger';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        ui: uiReducer,
        chat: chatReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(persistenceMiddleware, errorLoggerMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
