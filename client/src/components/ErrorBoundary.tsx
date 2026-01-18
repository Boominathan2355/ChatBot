import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import OopsPage from '../pages/OopsPage';

interface ErrorFallbackProps {
    error: any;
    resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
    return (
        <OopsPage
            title="Oops!"
            description={error.message || "An unexpected error occurred."}
            onReset={resetErrorBoundary}
            isError={true}
        />
    );
};

interface GlobalErrorBoundaryProps {
    children: React.ReactNode;
}

export const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({ children }) => {
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            {children}
        </ErrorBoundary>
    );
};

export default GlobalErrorBoundary;
