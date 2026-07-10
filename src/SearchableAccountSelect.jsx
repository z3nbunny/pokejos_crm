import React, { useState, useRef, useEffect } from 'react';

export default function SearchableAccountSelect({ accounts, selectedId, onChange }) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Set the initial input text if an ID is already selected
    useEffect(() => {
        const selectedAccount = accounts.find(a => a.id === selectedId);
        if (selectedAccount) setSearch(selectedAccount.name);
    }, [selectedId, accounts]);

    // Close dropdown if user clicks outside of it
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                required={!selectedId}
                value={search}
                placeholder="Type to search accounts..."
                onClick={() => setIsOpen(true)}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setIsOpen(true);
                    onChange(""); // Clear the actual ID until they click a valid option
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-orange-500 transition"
            />

            {isOpen && (
                <ul className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl">
                    {filteredAccounts.length > 0 ? (
                        filteredAccounts.map(acc => (
                            <li
                                key={acc.id}
                                className="p-3 hover:bg-slate-800 cursor-pointer text-slate-200 transition"
                                onClick={() => {
                                    setSearch(acc.name);
                                    onChange(acc.id); // Send the actual ID back to the form
                                    setIsOpen(false);
                                }}
                            >
                                {acc.name}
                            </li>
                        ))
                    ) : (
                        <li className="p-3 text-slate-500 italic">No accounts found...</li>
                    )}
                </ul>
            )}
        </div>
    );
}