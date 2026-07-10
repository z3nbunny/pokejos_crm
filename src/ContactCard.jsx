import React, { useState } from 'react';
import { db } from './firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function ContactCard({ contact, onContactDeleted }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        fullName: contact.fullName || '',
        role: contact.role || '',
        email: contact.email || '',
        phone: contact.phone || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'contacts', contact.id), formData);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating contact:", error);
            alert("Failed to save changes.");
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!window.confirm(`Permanently delete ${formData.fullName}?`)) return;
        try {
            await deleteDoc(doc(db, 'contacts', contact.id));
            if (onContactDeleted) onContactDeleted(contact.id); // Tells the parent UI to remove it from the screen
        } catch (error) {
            console.error("Error deleting contact:", error);
            alert("Failed to delete.");
        }
    };

    if (isEditing) {
        return (
            <div className="bg-slate-800 p-4 rounded-xl border border-blue-500 shadow-lg mb-3">
                <div className="grid grid-cols-1 gap-2 mb-3">
                    <input
                        className="bg-slate-900 text-slate-100 p-2 rounded border border-slate-700 focus:border-blue-500 outline-none w-full"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    />
                    <input
                        className="bg-slate-900 text-slate-100 p-2 rounded border border-slate-700 focus:border-blue-500 outline-none w-full"
                        placeholder="Role / Title"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                    />
                    <input
                        className="bg-slate-900 text-slate-100 p-2 rounded border border-slate-700 focus:border-blue-500 outline-none w-full"
                        placeholder="Email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                    <input
                        className="bg-slate-900 text-slate-100 p-2 rounded border border-slate-700 focus:border-blue-500 outline-none w-full"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition font-bold"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow mb-3 group hover:border-slate-500 transition">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-slate-100 text-lg">{formData.fullName || 'Unnamed Contact'}</h4>
                    {formData.role && <p className="text-orange-400 text-sm font-semibold">{formData.role}</p>}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-2">
                    <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-blue-400 text-sm">Edit</button>
                    <button onClick={handleDelete} className="text-slate-400 hover:text-red-400 text-sm">Delete</button>
                </div>
            </div>

            <div className="mt-3 text-sm text-slate-300">
                {formData.email && <div className="mb-1">📧 {formData.email}</div>}
                {formData.phone && <div>📞 {formData.phone}</div>}
            </div>
        </div>
    );
}