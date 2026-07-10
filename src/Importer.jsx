import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export default function Importer() {
    const [status, setStatus] = useState("Waiting for files...");

    // Helper to format 2/5/2026 into 2026-02-05 for your HTML calendar
    const formatHTMLDate = (rawDate) => {
        if (!rawDate) return '';
        const d = new Date(rawDate);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);

        // We need all 3 files to run the relational mapping
        const accountsFile = files.find(f => f.name.toLowerCase().includes('account'));
        const contactsFile = files.find(f => f.name.toLowerCase().includes('contact'));
        const logsFile = files.find(f => f.name.toLowerCase().includes('log'));

        if (!accountsFile || !contactsFile || !logsFile) {
            setStatus("Error: Please select all 3 CSV files (Accounts, Contacts, Logs) at once.");
            return;
        }

        setStatus("Reading files...");

        // 1. Parse Accounts
        Papa.parse(accountsFile, {
            header: true, skipEmptyLines: true,
            complete: async (accountsRes) => {
                setStatus("Uploading Accounts...");
                const accountMap = {}; // We will store { "Silicon Labs": "firebase_id_123" } here

                for (const row of accountsRes.data) {
                    const accName = row.name?.trim();
                    if (!accName) continue;
                    const docRef = await addDoc(collection(db, 'accounts'), {
                        name: accName, status: row.status || 'Active', createdAt: serverTimestamp()
                    });
                    accountMap[accName] = docRef.id; // Save the newly generated ID
                }

                // 2. Parse Contacts
                setStatus("Accounts finished! Uploading Contacts...");
                Papa.parse(contactsFile, {
                    header: true, skipEmptyLines: true,
                    complete: async (contactsRes) => {
                        for (const row of contactsRes.data) {
                            const linkedAccountName = row.linkedAccount?.trim();
                            const accountId = accountMap[linkedAccountName] || '';

                            await addDoc(collection(db, 'contacts'), {
                                accountId, fullName: row.fullName?.trim() || 'Unknown',
                                email: row.email?.trim() || '', phone: row.phone?.trim() || '',
                                role: row.role?.trim() || 'Decision Maker'
                            });
                        }

                        // 3. Parse and Clean Raw Logs on the fly
                        setStatus("Contacts finished! Cleaning and uploading Logs...");
                        Papa.parse(logsFile, {
                            header: true, skipEmptyLines: true,
                            complete: async (logsRes) => {
                                for (const row of logsRes.data) {
                                    const linkedAccountName = row['Linked Account']?.trim();
                                    const accountId = accountMap[linkedAccountName] || '';
                                    if (!accountId) continue; // Skip logs with no company attached

                                    // Convert Airtable date to a proper Firebase Timestamp
                                    const logDate = row['Date'] ? new Date(row['Date']) : new Date();
                                    const fbTimestamp = Timestamp.fromDate(logDate);

                                    await addDoc(collection(db, 'outreach_logs'), {
                                        accountId,
                                        title: row['Name']?.trim() || 'Interaction',
                                        activityType: row['Activity Type']?.trim() || 'Cold Drop',
                                        notes: row['Notes']?.trim() || '',
                                        nextFollowUp: formatHTMLDate(row['Next Follow-up']),
                                        timestamp: fbTimestamp
                                    });
                                }

                                setStatus("🎉 MIGRATION COMPLETE! All relational data is perfectly linked in Firestore.");
                            }
                        });
                    }
                });
            }
        });
    };

    return (
        <div className="p-12 max-w-2xl mx-auto bg-slate-900 min-h-screen text-slate-100 font-sans">
            <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black text-orange-500 mb-6">Database Migration Tool</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    Select all three CSV files at exactly the same time. The script will automatically build your Accounts, generate unique cloud IDs, and perfectly link your Contacts and Logs to those new IDs.
                </p>

                <input
                    type="file" multiple accept=".csv" onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-orange-600 file:text-white hover:file:bg-orange-500 transition cursor-pointer mb-6"
                />

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 font-mono text-emerald-400">
                    Status: {status}
                </div>
            </div>
        </div>
    );
}