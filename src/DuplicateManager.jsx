import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, doc, where, writeBatch } from 'firebase/firestore';

export default function DuplicateManager() {
    const [duplicates, setDuplicates] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'accounts'));
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Group by exact normalized name
            const groups = all.reduce((acc, curr) => {
                const key = curr.name.toLowerCase().trim();
                acc[key] = acc[key] || [];
                acc[key].push(curr);
                return acc;
            }, {});

            // Filter groups with > 1 entry
            const dupGroups = Object.keys(groups).filter(key => groups[key].length > 1);

            const dupsWithStats = {};

            // Fetch exact counts for Contacts and Logs so you know which one to keep
            for (const key of dupGroups) {
                const accounts = groups[key];
                const accountsWithStats = await Promise.all(accounts.map(async (acc) => {
                    const cSnap = await getDocs(query(collection(db, 'contacts'), where("accountId", "==", acc.id)));
                    const lSnap = await getDocs(query(collection(db, 'outreach_logs'), where("accountId", "==", acc.id)));
                    return { ...acc, contactCount: cSnap.size, logCount: lSnap.size };
                }));
                // Use the original capitalized name for the UI header
                dupsWithStats[accounts[0].name] = accountsWithStats;
            }

            setDuplicates(dupsWithStats);
        } catch (error) {
            console.error("Error scanning:", error);
            alert("Failed to scan database. Check console.");
        }
        setLoading(false);
    };

    const mergeGroup = async (primaryIdRaw, dupIds, name) => {
        const primaryId = primaryIdRaw.trim(); // Sanitize input against accidental spaces

        const confirmMsg = `WARNING: You are about to move all data from ${dupIds.length} duplicate(s) into the Primary Account (ID: ${primaryId}).\n\nThe duplicate accounts will be PERMANENTLY DELETED.\n\nContinue?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            setLoading(true);
            const batch = writeBatch(db);

            for (const badId of dupIds) {
                // 1. Queue Contacts for migration
                const contacts = await getDocs(query(collection(db, 'contacts'), where("accountId", "==", badId)));
                contacts.docs.forEach(c => {
                    batch.update(doc(db, 'contacts', c.id), { accountId: primaryId });
                });

                // 2. Queue Logs for migration
                const logs = await getDocs(query(collection(db, 'outreach_logs'), where("accountId", "==", badId)));
                logs.docs.forEach(l => {
                    batch.update(doc(db, 'outreach_logs', l.id), { accountId: primaryId });
                });

                // 3. Queue duplicate account for deletion
                batch.delete(doc(db, 'accounts', badId));
            }

            // Execute all queued actions as one atomic transaction
            await batch.commit();

            alert(`✅ Success! Data merged into ${name} and duplicates deleted.`);
            fetchAccounts();
        } catch (e) {
            console.error(e);
            alert("❌ Merge failed: " + e.message + " (No data was harmed)");
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h3>Scanning database and calculating record counts...</h3>
        </div>
    );

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>Duplicate Account Manager</h2>

            {Object.keys(duplicates).length === 0 ? (
                <div style={{ padding: '20px', background: '#d4edda', color: '#155724', borderRadius: '5px' }}>
                    <strong>All clear!</strong> No duplicate accounts found in your database.
                </div>
            ) : null}

            {Object.entries(duplicates).map(([name, accounts]) => (
                <div key={name} style={{ border: '1px solid #ddd', padding: '20px', margin: '20px 0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0, color: '#2c3e50' }}>{name}</h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                                <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Account ID</th>
                                <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Contacts</th>
                                <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Logs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map(a => (
                                <tr key={a.id}>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}><code>{a.id}</code></td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                        <span style={{ fontWeight: a.contactCount > 0 ? 'bold' : 'normal', color: a.contactCount > 0 ? 'green' : 'gray' }}>
                                            {a.contactCount}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                        <span style={{ fontWeight: a.logCount > 0 ? 'bold' : 'normal', color: a.logCount > 0 ? 'green' : 'gray' }}>
                                            {a.logCount}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        style={{ padding: '12px 24px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
                        onClick={() => {
                            const input = prompt(`Enter the ID of the 'Primary' account you want to KEEP for ${name}:\n(Copy and paste from the list above)`);
                            if (input) {
                                const primaryId = input.trim();
                                if (accounts.find(a => a.id === primaryId)) {
                                    const badIds = accounts.filter(a => a.id !== primaryId).map(a => a.id);
                                    mergeGroup(primaryId, badIds, name);
                                } else {
                                    alert("❌ Invalid ID entered. Please make sure you copy the exact ID from the list.");
                                }
                            }
                        }}>
                        Merge {name} Duplicates
                    </button>
                </div>
            ))}
        </div>
    );
}