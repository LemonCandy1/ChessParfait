import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
    const [message, setMessage] = useState('');
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const show = useCallback((text: string) => {
        setMessage(text);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setMessage(''), 3500);
    }, []);

    return [message, show] as const;
}
