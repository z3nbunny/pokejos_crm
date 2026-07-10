import CatchupSync from './CatchupSync';
import DuplicateManager from './DuplicateManager';
import SearchableAccountSelect from './SearchableAccountSelect';
import AutoResizingTextarea from './AutoResizingTextarea';
import ContactCard from './ContactCard';
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, onSnapshot, doc, updateDoc
} from 'firebase/firestore';


const ACTIVITY_TYPES = [
  'Cold Drop', 'Tasting', 'Client Check-in', 'Win-back Visit',
  'Party Room Visit', 'Admin', 'Delivery', 'Event', 'Pick-Up', 'Music'
];

const getActivityBadge = (type) => {
  const colors = {
    'Cold Drop': 'bg-blue-900/50 text-blue-300 border-blue-800',
    'Tasting': 'bg-sky-900/50 text-sky-300 border-sky-800',
    'Client Check-in': 'bg-teal-900/50 text-teal-300 border-teal-800',
    'Win-back Visit': 'bg-green-900/50 text-green-300 border-green-800',
    'Party Room Visit': 'bg-amber-900/50 text-amber-300 border-amber-800',
    'Admin': 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
    'Delivery': 'bg-slate-700/50 text-slate-300 border-slate-600',
    'Event': 'bg-indigo-900/50 text-indigo-300 border-indigo-800',
    'Pick-Up': 'bg-rose-900/50 text-rose-300 border-rose-800',
    'Music': 'bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-800'
  };
  return colors[type] || 'bg-slate-800 text-slate-300 border-slate-700';
};

const getAvatarConfig = (name) => {
  if (!name) return { letter: '?', color: 'bg-slate-800' };
  const letter = name.charAt(0).toUpperCase();
  const colors = [
    'bg-red-600', 'bg-orange-600', 'bg-emerald-600', 'bg-teal-600',
    'bg-cyan-600', 'bg-blue-600', 'bg-indigo-600', 'bg-violet-600',
    'bg-fuchsia-600', 'bg-rose-600'
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return { letter, color: colors[hash % colors.length] };
};

// --- EMAIL RANDOMIZER ARRAYS ---
const introParagraphs = [
  "Here is the rundown of today's Pok-E-Jo's catering outreach efforts.",
  "Great momentum in the field today. Below is everything we accomplished today.",
  "Hope you're having a solid week. Here are the latest updates and drop-off notes.",
  "Here is the end-of-day digest for our recent catering prospects."
];

const outroParagraphs = [
  "Let me know if you need any clarification on these accounts.",
  "We'll keep pushing these leads forward this week.",
  "Looking forward to closing a few of these corporate catering deals soon.",
  "I'll follow up on the active tasks tomorrow. Have a great day!"
];

export default function App() {
  const [view, setView] = useState('gallery');
  const [accounts, setAccounts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountLogs, setAccountLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);

  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ accountId: '', title: '', activityType: 'Cold Drop', notes: '', nextFollowUp: '' });
  const [editingLog, setEditingLog] = useState(null);

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', status: 'Active' });
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ accountId: '', fullName: '', email: '', phone: '', role: 'Decision Maker' });

  const [digestText, setDigestText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'accounts'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('fullName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => setAllContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const qLogs = query(collection(db, 'outreach_logs'), orderBy('timestamp', 'desc'));
    const unsubscribeAllLogs = onSnapshot(qLogs, (snapshot) => setAllLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribeAllLogs();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    const qLogs = query(collection(db, 'outreach_logs'), where('accountId', '==', selectedAccount.id), orderBy('timestamp', 'desc'));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => setAccountLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribeLogs();
  }, [selectedAccount]);

  const handleQuickLogSubmit = async (e) => {
    e.preventDefault();
    if (!logForm.accountId || !logForm.notes.trim()) return;
    try {
      await addDoc(collection(db, 'outreach_logs'), { ...logForm, notes: logForm.notes.trim(), timestamp: serverTimestamp() });
      setLogForm({ accountId: '', title: '', activityType: 'Cold Drop', notes: '', nextFollowUp: '' });
      setIsQuickLogOpen(false);
    } catch (error) { console.error("Error saving log: ", error); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingLog.notes.trim()) return;
    try {
      const logRef = doc(db, 'outreach_logs', editingLog.id);
      await updateDoc(logRef, {
        accountId: editingLog.accountId, title: editingLog.title, activityType: editingLog.activityType,
        notes: editingLog.notes.trim(), nextFollowUp: editingLog.nextFollowUp
      });
      setEditingLog(null);
    } catch (error) { console.error("Error updating log: ", error); }
  };

  const handleInlineDateSave = async (logId, newDate) => {
    try { await updateDoc(doc(db, 'outreach_logs', logId), { nextFollowUp: newDate }); }
    catch (error) { console.error("Error auto-saving date: ", error); }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'accounts'), { name: accountForm.name, status: accountForm.status, createdAt: serverTimestamp() });
      setAccountForm({ name: '', status: 'Active' });
      setIsAddAccountOpen(false);
    } catch (error) { console.error("Error adding account: ", error); }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'contacts'), { ...contactForm });
      setContactForm({ accountId: '', fullName: '', email: '', phone: '', role: 'Decision Maker' });
      setIsAddContactOpen(false);
    } catch (error) { console.error("Error adding contact: ", error); }
  };

  // --- UPDATED: Email Engine with Randomizer ---
  const generateDailyDigest = async () => {
    setCopied(false);
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    try {
      const q = query(collection(db, 'outreach_logs'), where('timestamp', '>=', startOfDay), where('timestamp', '<=', endOfDay), orderBy('timestamp', 'asc'));
      const querySnapshot = await getDocs(q);

      const notesArray = querySnapshot.docs.map(doc => doc.data().notes).filter(note => note && note.trim() !== "");

      if (notesArray.length === 0) {
        setDigestText("No interactions logged with notes for today yet.");
        return;
      }

      // Pick random paragraphs
      const randomIntro = introParagraphs[Math.floor(Math.random() * introParagraphs.length)];
      const randomOutro = outroParagraphs[Math.floor(Math.random() * outroParagraphs.length)];

      // Stitch it all together with perfect formatting
      const finalEmailText = `${randomIntro}\n\n${notesArray.join('\n\n')}\n\n${randomOutro}`;
      setDigestText(finalEmailText);

    } catch (error) { console.error("Error generating digest: ", error); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(digestText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- NEW: Trigger Native Email Client ---
  const launchEmailClient = () => {
    const subject = encodeURIComponent(`Daily Outreach Digest - ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(digestText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">

      <nav className="w-64 bg-slate-950 p-6 flex flex-col justify-between border-r border-slate-800 shrink-0 z-20">
        <div>
          <h1 className="text-xl font-black tracking-wider text-orange-500 mb-8">CATERING CRM</h1>
          <div className="space-y-2">
            <button onClick={() => setView('gallery')} className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${view === 'gallery' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900'}`}>Accounts Gallery</button>
            <button onClick={() => setView('dashboard')} className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${view === 'dashboard' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900'}`}>Workspace Detail</button>
            <button onClick={() => setView('masterLog')} className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${view === 'masterLog' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900'}`}>Master Outreach Log</button>
            <button onClick={() => { setView('digest'); generateDailyDigest(); }} className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${view === 'digest' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900'}`}>Daily Digest Generator</button>
          </div>
        </div>
        <button onClick={() => setIsQuickLogOpen(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition transform active:scale-95">+ Quick Log</button>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden relative">

        {/* VIEW 0: Accounts Gallery */}
        {view === 'gallery' && (
          <div className="p-8 flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold">Accounts & Contacts</h2>
                <p className="text-sm text-slate-400 mt-1">High-level view of your pipeline and key decision-makers.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsAddContactOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg border border-slate-700 text-sm transition shadow-sm">+ Add Contact</button>
                <button onClick={() => setIsAddAccountOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition shadow-md">+ Add Account</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {accounts.map(acc => {
                  const avatar = getAvatarConfig(acc.name);
                  const linkedContacts = allContacts.filter(c => c.accountId === acc.id);
                  return (
                    <div key={acc.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col hover:border-slate-600 transition shadow-lg group relative">
                      <button onClick={() => { setSelectedAccount(acc); setView('dashboard'); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 bg-slate-800 hover:bg-orange-600 border border-slate-700 text-white text-xs px-3 py-1.5 rounded transition shadow-md">Open Workspace ↗</button>
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-inner ${avatar.color}`}>{avatar.letter}</div>
                        <div className="pr-12">
                          <h3 className="text-lg font-bold text-slate-100 leading-tight">{acc.name}</h3>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest ${acc.status === 'Active' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{acc.status}</span>
                        </div>
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-800/50">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Personnel ({linkedContacts.length})</h4>
                        {linkedContacts.length > 0 ? (
                          <div className="space-y-2">
                            <div className="space-y-2">
                              {linkedContacts.map(contact => (
                                <ContactCard key={contact.id} contact={contact} />
                              ))}
                            </div>
                          </div>
                        ) : (<div className="h-16 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center"><p className="text-xs text-slate-600 font-medium">No contacts assigned</p></div>)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 1: Directory Dashboard */}
        {view === 'dashboard' && (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/3 p-8 overflow-y-auto border-r border-slate-800">
              <h2 className="text-2xl font-bold mb-6">Select Account</h2>
              <div className="space-y-3">
                {accounts.map(acc => (
                  <div key={acc.id} onClick={() => setSelectedAccount(acc)} className={`p-4 rounded-xl border cursor-pointer transition ${selectedAccount?.id === acc.id ? 'bg-slate-800 border-orange-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                    <h3 className="font-semibold text-lg">{acc.name}</h3>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-2/3 p-8 bg-slate-950 overflow-y-auto">
              {selectedAccount ? (
                <div className="max-w-3xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-inner ${getAvatarConfig(selectedAccount.name).color}`}>{getAvatarConfig(selectedAccount.name).letter}</div>
                    <h2 className="text-4xl font-black text-orange-400">{selectedAccount.name}</h2>
                  </div>

                  {/* --- INLINE CONTACT MANAGER --- */}
                  <div className="mb-10">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-200">Key Contacts</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allContacts.filter(c => c.accountId === selectedAccount.id).map(contact => (
                        <ContactCard key={contact.id} contact={contact} />
                      ))}
                      {allContacts.filter(c => c.accountId === selectedAccount.id).length === 0 && (
                        <p className="text-slate-500 italic text-sm">No contacts added yet.</p>
                      )}
                    </div>
                  </div>
                  {/* --- END NEW --- */}

                  <div className="space-y-4">
                    {accountLogs.length > 0 ? accountLogs.map(log => (
                      <div key={log.id} className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative group">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getActivityBadge(log.activityType)}`}>{log.activityType}</span>
                            <span className="font-semibold text-slate-200">{log.title}</span>
                          </div>
                          <span className="text-xs font-medium text-slate-500">{log.timestamp?.toDate() ? new Date(log.timestamp.toDate()).toLocaleDateString() : 'Just now'}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{log.notes}</p>
                        <button onClick={() => setEditingLog(log)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded transition">Edit Log</button>
                      </div>
                    )) : <p className="text-slate-600 italic">No timeline entries recorded yet.</p>}
                  </div>
                </div>
              ) : <div className="h-full flex items-center justify-center text-slate-600">Select an account from the sidebar</div>}
            </div>
          </div>
        )}

        {/* VIEW 2: Master Outreach Log */}
        {view === 'masterLog' && (
          <div className="p-8 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-2xl font-bold mb-6">Master Outreach Log</h2>
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                  <thead className="text-xs uppercase bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-bold">Action</th>
                      <th className="px-6 py-4 font-bold">Type</th>
                      <th className="px-6 py-4 font-bold">Title</th>
                      <th className="px-6 py-4 font-bold">Date</th>
                      <th className="px-6 py-4 font-bold">Account</th>
                      <th className="px-6 py-4 font-bold">Notes</th>
                      <th className="px-6 py-4 font-bold text-emerald-400">Next Follow-up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {allLogs.map(log => {
                      const accountName = accounts.find(a => a.id === log.accountId)?.name || 'Unknown';
                      return (
                        <tr key={log.id} className="hover:bg-slate-900/50 transition">
                          <td className="px-6 py-3"><button onClick={() => setEditingLog(log)} className="text-orange-500 hover:text-orange-400 font-medium text-xs bg-slate-800 px-3 py-1 rounded">Edit</button></td>
                          <td className="px-6 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getActivityBadge(log.activityType)}`}>{log.activityType}</span></td>
                          <td className="px-6 py-3 font-medium text-slate-200">{log.title || '-'}</td>
                          <td className="px-6 py-3">{log.timestamp?.toDate() ? new Date(log.timestamp.toDate()).toLocaleDateString() : 'Just now'}</td>
                          <td className="px-6 py-3"><span className="bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700">{accountName}</span></td>
                          <td className="px-6 py-3 max-w-[200px] truncate">{log.notes}</td>
                          <td className="px-6 py-3"><input type="date" value={log.nextFollowUp || ''} onChange={(e) => handleInlineDateSave(log.id, e.target.value)} onClick={(e) => e.target.showPicker?.()} className="bg-transparent text-slate-300 hover:bg-slate-800 border border-transparent hover:border-slate-700 rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Daily Digest Generator */}
        {view === 'digest' && (
          <div className="p-8 flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Daily Digest Generator</h2>
              <div className="flex gap-3">
                <button onClick={generateDailyDigest} className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg border border-slate-700 text-sm">Shuffle & Refresh</button>
                <button onClick={copyToClipboard} className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg border border-slate-700 text-sm shadow-md transition">{copied ? '✓ Copied!' : 'Copy to Clipboard'}</button>
                <button onClick={launchEmailClient} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-lg text-sm shadow-md transition flex items-center gap-2">
                  Draft Email ↗
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-6 overflow-y-auto font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{digestText}</div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {isQuickLogOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 text-slate-100">Quick Log Interaction</h3>
            <form onSubmit={handleQuickLogSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Target Account</label>
                  <SearchableAccountSelect
                    accounts={accounts}
                    selectedId={logForm.accountId}
                    onChange={(id) => setLogForm({ ...logForm, accountId: id })}
                  />
                </div>                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Activity Type</label><select value={logForm.activityType} onChange={(e) => setLogForm({ ...logForm, activityType: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200">{ACTIVITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Title</label><input type="text" required value={logForm.title} onChange={(e) => setLogForm({ ...logForm, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200" /></div>
                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Next Follow-Up</label><input type="date" onClick={(e) => e.target.showPicker?.()} value={logForm.nextFollowUp} onChange={(e) => setLogForm({ ...logForm, nextFollowUp: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 [color-scheme:dark]" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Notes</label>
                <AutoResizingTextarea
                  required={true}
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                />
              </div>              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800"><button type="button" onClick={() => setIsQuickLogOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800">Cancel</button><button type="submit" className="px-6 py-2.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {editingLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 text-orange-400">Edit Log</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-400 mb-1">Account</label><select value={editingLog.accountId} onChange={(e) => setEditingLog({ ...editingLog, accountId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-1">Type</label><select value={editingLog.activityType} onChange={(e) => setEditingLog({ ...editingLog, activityType: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200">{ACTIVITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-400 mb-1">Title</label><input type="text" value={editingLog.title} onChange={(e) => setEditingLog({ ...editingLog, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200" /></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-1">Follow-Up</label><input type="date" onClick={(e) => e.target.showPicker?.()} value={editingLog.nextFollowUp || ''} onChange={(e) => setEditingLog({ ...editingLog, nextFollowUp: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 [color-scheme:dark]" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Notes</label>
                <AutoResizingTextarea
                  required={true}
                  value={editingLog.notes}
                  onChange={(e) => setEditingLog({ ...editingLog, notes: e.target.value })}
                />
              </div>              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800"><button type="button" onClick={() => setEditingLog(null)} className="px-5 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800">Cancel</button><button type="submit" className="px-6 py-2.5 rounded-lg font-bold bg-orange-600 hover:bg-orange-500 text-white">Update</button></div>
            </form>
          </div>
        </div>
      )}

      {isAddAccountOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 text-slate-100">Add New Account</h3>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Company Name</label><input type="text" required value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200" /></div>
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Status</label><select value={accountForm.status} onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Cold Lead">Cold Lead</option></select></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800"><button type="button" onClick={() => setIsAddAccountOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800">Cancel</button><button type="submit" className="px-6 py-2.5 rounded-lg font-bold bg-orange-600 hover:bg-orange-500 text-white">Create Account</button></div>
            </form>
          </div>
        </div>
      )}

      {isAddContactOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 text-slate-100">Add New Contact</h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Link to Account</label><select required value={contactForm.accountId} onChange={(e) => setContactForm({ ...contactForm, accountId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200"><option value="" disabled>Select Company...</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label><input type="text" required value={contactForm.fullName} onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-400 mb-1">Email</label><input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200" /></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-1">Phone</label><input type="text" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-400 mb-1">Role</label><input type="text" value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800"><button type="button" onClick={() => setIsAddContactOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800">Cancel</button><button type="submit" className="px-6 py-2.5 rounded-lg font-bold bg-orange-600 hover:bg-orange-500 text-white">Save Contact</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

