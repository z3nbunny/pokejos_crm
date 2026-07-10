import React from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, deleteDoc, Timestamp, serverTimestamp, where } from 'firebase/firestore';

export default function CatchupSync() {

    const runSync = async () => {
        console.log("--- Master Sync Started ---");
        alert("Sync starting! Check your browser console (F12) for updates.");

        try {
            // 1. DELETE JULY DATA (Month 6 is July)
            const logsRef = collection(db, 'outreach_logs');
            const snapshot = await getDocs(query(logsRef));
            for (const doc of snapshot.docs) {
                const d = doc.data().timestamp?.toDate();
                if (d && d.getMonth() === 6) {
                    await deleteDoc(doc.ref);
                    console.log("Deleted old July record:", doc.id);
                }
            }

            // 2. JUNE DATA PAYLOAD
            const juneData = [
                // June 23
                { date: '2026-06-23T15:00:00', account: "West Lake Family Dental", contacts: [{ "fullName": "Rishonda", "role": "Office Manager", "email": "admin@wlfamilydental.com", "phone": "512-328-0911" }], log: { title: "First contact with Rishonda", type: "Cold Drop", notes: "Connected with Rishonda. Advanced into sales funnel—very open to a complimentary catering tasting." } },
                { date: '2026-06-23T15:00:00', account: "Village Medical", contacts: [{ "fullName": "Rosie", "role": "Practice Manager" }, { "fullName": "34th Street Main Office", "role": "Purchasing", "email": "patient-relations@villagemd.com" }], log: { title: "Met with Rosie / Routing Intel", type: "Cold Drop", notes: "Organization acquired by Harbor Health. Secured routing intel: purchasing decisions at 34th Street main office." } },
                { date: '2026-06-23T15:00:00', account: "Lone Star Circle of Care", contacts: [{ "fullName": "Lourdes", "role": "Front Staff", "email": "info@lscctx.org", "phone": "877-800-5722" }], log: { title: "Beef prices & catering pitch", type: "Cold Drop", notes: "Deployed Healthcare Mondays flyer. Overcame logistical objections regarding delivery fleet." } },
                { date: '2026-06-23T15:00:00', account: "Austin Regional Clinic", contacts: [{ "fullName": "Ariana", "role": "Front Desk" }, { "fullName": "Jennifer", "role": "Management", "phone": "Fax: 512-406-6266" }], log: { title: "Bypassed Security / Secured Fax", type: "Cold Drop", notes: "Secured dedicated fax line to bypass digital firewall for quarterly and holiday catering pitches." } },
                { date: '2026-06-23T15:00:00', account: "St. David's CareNow", contacts: [{ "fullName": "Rosa", "role": "Manager" }, { "fullName": "Priscilla Bauer", "role": "Occupational Specialist", "email": "priscilla.bauer@hcahealthcare.com", "phone": "512-541-9878" }], log: { title: "Massive Pipeline Win", type: "Cold Drop", notes: "Secured info for Priscilla Bauer. Discussed reciprocal relationship for occupational therapy." } },
                { date: '2026-06-23T15:00:00', account: "One Medical", contacts: [{ "fullName": "Erica", "role": "Gatekeeper" }], log: { title: "Holiday Spending Insight", type: "Cold Drop", notes: "Focuses on large holiday meals rather than weekly lunches. Warm lead for Q3/Q4." } },
                { date: '2026-06-23T15:00:00', account: "Happy Health and Wellness", contacts: [{ "fullName": "Arazeli", "role": "Champion" }, { "fullName": "Odis Cagle", "role": "COO", "email": "odis.cagle@happyhealthwellness.com", "phone": "512-354-7017" }], log: { title: "Secured COO Contact Info", type: "Cold Drop", notes: "Handed direct phone and email for COO Odis Cagle. Prepping corporate pitch for multi-site partnership." } },
                // June 25
                { date: '2026-06-25T14:00:00', account: "St. Louis King of France Catholic School", isExisting: true, log: { title: "Closed St. Louis Gala & Festival Prep", type: "Event", notes: "Closed Gala catering deal (300 guests, $900 revenue). Reviewing Jamaica Festival sponsorship." } },
                { date: '2026-06-25T14:00:00', account: "Mariachi Clasico", contacts: [{ "fullName": "Carlos", "role": "Band Leader", "email": "booking@mariachiclasico.com", "phone": "737-999-0241" }], log: { title: "Sunday Brunch Set Pitch", type: "Music", notes: "Pitching 75-minute brunch set. Potential for ~50 followers/family at $1k revenue baseline." } },
                { date: '2026-06-25T14:00:00', account: "Austin Telco", contacts: [{ "fullName": "Monica", "role": "Assistant Manager" }, { "fullName": "Laura Ogle", "role": "HQ Contact", "email": "logle@atfcu.org", "phone": "512-731-6770" }, { "fullName": "Jeanne Crans", "role": "HQ Contact", "email": "jcrans@atfcu.org" }], log: { title: "HQ Routing Intelligence", type: "Cold Drop", notes: "Purchasing decisions at Research Blvd HQ. Blueprint to target corporate hub." } },
                { date: '2026-06-25T14:00:00', account: "Truist Bank", contacts: [{ "fullName": "Michael", "role": "Team Member" }, { "fullName": "Ryan Melendez", "role": "Branch Manager", "email": "linkedin.com/in/ryan-melendez-0534b239" }], log: { title: "Warm Internal Reception", type: "Cold Drop", notes: "Reaching out via LinkedIn to bypass gatekeepers and pitch corporate lunch package." } },
                { date: '2026-06-25T14:00:00', account: "Chase Bank", contacts: [{ "fullName": "Matashia", "role": "Team Member" }, { "fullName": "Margo M Martinez", "role": "Branch Manager", "email": "margo.martinez@jpmchase.com", "phone": "512-462-0590" }], log: { title: "Monthly Culture Lunches Pitch", type: "Cold Drop", notes: "Secured direct email. Warm entry point for recurring monthly culture lunches." } },
                { date: '2026-06-25T14:00:00', account: "Frost Tower", contacts: [{ "fullName": "Glenn", "role": "Security Guard" }, { "fullName": "Dana Gann", "role": "Senior Property Manager", "email": "dgann@endeavor-re.com", "phone": "630-247-3262" }], log: { title: "Massive Multi-Tenant Pipeline", type: "Cold Drop", notes: "No preferred vendor list. Secured direct contact for Dana Gann, the ultimate gatekeeper." } },
                { date: '2026-06-25T14:00:00', account: "Happy State Bank", contacts: [{ "fullName": "Gage McCalister", "role": "Second-in-Command", "email": "gmcallister@happybank.com", "phone": "737-220-9161" }], log: { title: "Regional Tasting Opportunity", type: "Cold Drop", notes: "Receptive to catering; offered to loop in regional manager for formal tasting." } },
                { date: '2026-06-25T14:00:00', account: "PNC Bank", contacts: [{ "fullName": "Isai Alejo", "role": "Team Member", "email": "isai.alejo@pnc.com", "phone": "512-440-7788" }, { "fullName": "Philip Wainscott", "role": "Branch Manager", "email": "philip.wainscott@pnc.com" }], log: { title: "Complimentary Tasting Pitch", type: "Cold Drop", notes: "Final decision with Philip. Left promotional assets; following up next week." } },
                // June 26
                { date: '2026-06-26T10:00:00', account: "Pok-E-Jo's", log: { title: "Parmer Meeting & Admin", type: "Admin", notes: "Meeting with Doug, Russell, James, David Kahn. Researching contact details, sending catering invitations, and faxing ARC." } },
                // June 30
                { date: '2026-06-30T10:00:00', account: "Pok-E-Jo's", log: { title: "Catering Coordination", type: "Client Check-in", notes: "Coordinated Austin Telco 100-person lunch, Frost Tower tasting, and Happy State Bank 18-person lunch." } },
                { date: '2026-06-30T10:00:00', account: "St. David's CareNow", log: { title: "Catering Tasting", type: "Tasting", notes: "Staff loved food. Rosa plans to use us for large Thanksgiving/Christmas holiday catering." } },
                { date: '2026-06-30T10:00:00', account: "PNC Bank", log: { title: "Relationship Building", type: "Tasting", notes: "Tasting locked in for July 9th. Partnership discussions: literacy classes, branch openings, and samplings." } }
            ];

            // 3. INJECTION LOOP
            for (const entry of juneData) {
                let accountId = null;
                if (entry.isExisting) {
                    const q = query(collection(db, 'accounts'), where("name", "==", entry.account));
                    const snap = await getDocs(q);
                    if (!snap.empty) accountId = snap.docs[0].id;
                } else {
                    const accRef = await addDoc(collection(db, 'accounts'), { name: entry.account, status: 'Active', createdAt: serverTimestamp() });
                    accountId = accRef.id;
                    if (entry.contacts) {
                        for (const contact of entry.contacts) {
                            await addDoc(collection(db, 'contacts'), { accountId, ...contact });
                        }
                    }
                }
                if (accountId) {
                    await addDoc(collection(db, 'outreach_logs'), {
                        accountId, ...entry.log, timestamp: Timestamp.fromDate(new Date(entry.date))
                    });
                }
            }

            alert("Success! History synced.");
        } catch (e) { console.error(e); alert("Failed: " + e.message); }
    };

    return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <button onClick={runSync} style={{ padding: '20px', background: 'blue', color: 'white', fontSize: '20px' }}>RUN FINAL SYNC</button>
        </div>
    );
}