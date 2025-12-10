import React, { useEffect, useState } from 'react';
import './Toast.scss';

const Toast = ({ id, type = 'info', message, duration = 3000, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onClose(id), 300); // Wait for animation
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300); // Wait for animation
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
            default:
                return 'ℹ️';
        }
    };

    return (
        <div
            className={`toast toast-${type} ${isExiting ? 'toast-exiting' : ''}`}
            onClick={handleClose}
        >
            <div className="toast-icon">{getIcon()}</div>
            <div className="toast-message">{message}</div>
            <button className="toast-close" onClick={handleClose}>✕</button>
        </div>
    );
};

export default Toast;
