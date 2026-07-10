import React, { useRef, useEffect } from 'react';

export default function AutoResizingTextarea({ value, onChange, placeholder, required }) {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to calculate the new scrollHeight correctly on deletion
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-orange-500 transition overflow-hidden"
            style={{ minHeight: '100px', resize: 'none' }}
        />
    );
}