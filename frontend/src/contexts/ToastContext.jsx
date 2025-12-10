import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast/Toast';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [recentMessages, setRecentMessages] = useState(new Set());
    const MAX_TOASTS = 5; // Maximum number of toasts to show at once
    const DEBOUNCE_TIME = 500; // Prevent same message within 500ms

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const messageKey = `${type}:${message}`;

        // Debounce duplicate messages
        if (recentMessages.has(messageKey)) {
            return; // Skip duplicate within debounce time
        }

        // Add to recent messages temporarily
        setRecentMessages(prev => new Set(prev).add(messageKey));
        setTimeout(() => {
            setRecentMessages(prev => {
                const newSet = new Set(prev);
                newSet.delete(messageKey);
                return newSet;
            });
        }, DEBOUNCE_TIME);

        // Add toast
        setToasts(prev => {
            const id = Date.now() + Math.random();
            const newToast = { id, message, type, duration };

            // Limit to MAX_TOASTS, remove oldest if needed
            const newToasts = [...prev, newToast];
            if (newToasts.length > MAX_TOASTS) {
                return newToasts.slice(-MAX_TOASTS);
            }

            return newToasts;
        });

        return Date.now();
    }, [recentMessages]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        warning: (message, duration) => addToast(message, 'warning', duration),
        info: (message, duration) => addToast(message, 'info', duration),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <Toast
                        key={t.id}
                        id={t.id}
                        type={t.type}
                        message={t.message}
                        duration={t.duration}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
