/* -------------------------------------------------------------
 * HostelQ - Student Dashboard Component
 * Displays roommate list, room card, and hostel policies
 * ------------------------------------------------------------- */

import { store } from '../store.js';

export const StudentDashboard = {
    render(state) {
        const user = store.getCurrentUserObject();
        if (!user) {
            setTimeout(() => window.location.hash = '#/login', 10);
            return `<div class="loading-spinner-container"><p>Redirecting to login...</p></div>`;
        }

        // If student has NOT booked yet, guide them to booking window
        if (!user.bookedRoom) {
            const hasQueueActive = state.queue.isInQueue;
            const targetHash = hasQueueActive ? '#/queue' : (state.bookingWindow.status === 'open' ? '#/queue' : '#/waiting-room');
            const buttonText = hasQueueActive ? 'Resume Queue Position' : (state.bookingWindow.status === 'open' ? 'Enter Room Booking Portal' : 'Enter Waiting Room');

            return `
                <div style="max-width: 800px; margin: 40px auto 0; text-align: center;">
                    <div class="glass-card queue-panel" style="padding: 50px 40px;">
                        <div class="feature-icon-container" style="margin: 0 auto 24px; width:64px; height:64px;">
                            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        </div>
                        <h2 style="font-family:'Outfit', sans-serif; font-size:2rem; font-weight:700; margin-bottom:16px;">
                            No Active Room Allocation
                        </h2>
                        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 30px;">
                            You have not booked a room for the 2026-2027 academic year yet. Join the virtual queue when the booking window opens.
                        </p>
                        <a href="${targetHash}" class="btn btn-primary btn-lg">${buttonText}</a>
                    </div>
                </div>
            `;
        }

        const room = user.bookedRoom;

        // Roommate HTML list
        let roommatesHTML = '';
        if (room.roommates && room.roommates.length > 0) {
            roommatesHTML = room.roommates.map(rm => `
                <div class="roommate-card glass-card">
                    <div class="roommate-avatar">
                        ${rm.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div class="roommate-name">${rm.name}</div>
                    <div class="roommate-reg">${rm.regNo} (Bed #${rm.bedNo})</div>
                    <span class="badge badge-success" style="font-size:0.65rem;">Roommate</span>
                </div>
            `).join('');
        } else {
            // Find if there are other occupants in this room who are not explicitly mapped
            // (e.g. background simulated bookings)
            const roomObj = state.rooms.find(r => r.block === room.block && r.roomNo === room.roomNo);
            const otherBeds = roomObj ? roomObj.beds.filter(b => b.status === 'booked' && b.bookedBy.regNo !== user.regNo) : [];
            
            if (otherBeds.length > 0) {
                roommatesHTML = otherBeds.map(b => `
                    <div class="roommate-card glass-card">
                        <div class="roommate-avatar">
                            ${b.bookedBy.name.split(' ').map(n=>n[0]).join('') || 'ST'}
                        </div>
                        <div class="roommate-name">${b.bookedBy.name || 'Room occupant'}</div>
                        <div class="roommate-reg">${b.bookedBy.regNo} (Bed #${b.bedNo})</div>
                        <span class="badge badge-success" style="font-size:0.65rem;">Roommate</span>
                    </div>
                `).join('');
            } else {
                roommatesHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted); font-size:0.9rem; border: 1px dashed var(--border-color); border-radius:var(--radius-md);">
                        No other roommates assigned yet. Slots are still open in this room!
                    </div>
                `;
            }
        }

        return `
            <div class="dashboard-wrapper">
                <div class="dashboard-banner">
                    <div class="dashboard-banner-text">
                        <h2>Welcome back, ${user.name}!</h2>
                        <p>Your room slot is locked and confirmed in <strong>${room.block}</strong>. Review your allocation details and roommate roster below.</p>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="dash-main">
                        <!-- Allocated Room Summary Card -->
                        <div class="glass-card" style="padding: 24px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
                                <span class="filter-section-title">Your Room Details</span>
                                <span class="badge badge-success">BOOKED</span>
                            </div>

                            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
                                <div>
                                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Block / Room Number</div>
                                    <div style="font-size:1.4rem; font-weight:700; font-family:'Outfit',sans-serif; color:var(--text-primary); margin-top:4px;">
                                        ${room.block} • Room ${room.roomNo}
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Bed Slot</div>
                                    <div style="font-size:1.4rem; font-weight:700; font-family:'Outfit',sans-serif; color:var(--color-accent); margin-top:4px;">
                                        Bed #${room.bedNo}
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Room Type</div>
                                    <div style="font-size:1.4rem; font-weight:700; font-family:'Outfit',sans-serif; color:var(--text-primary); margin-top:4px;">
                                        ${room.type}
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; justify-content:space-between; margin-top:20px; padding-top:16px; border-top:1px solid var(--border-color); font-size:0.85rem; color:var(--text-secondary);">
                                <span>Receipt No: <strong style="color:var(--text-primary); font-family:monospace;">${room.receiptNo}</strong></span>
                                <span>Allocated On: <strong style="color:var(--text-primary);">${room.timestamp}</strong></span>
                            </div>
                            
                            <div style="margin-top:20px;">
                                <a href="#/confirmation" class="btn btn-secondary btn-sm" style="font-size:0.85rem;">
                                    View Printable Receipt
                                </a>
                            </div>
                        </div>

                        <!-- Roommates List -->
                        <div>
                            <h3 style="font-family:'Outfit',sans-serif; font-size:1.25rem; font-weight:700; margin-bottom:16px;">
                                Room Occupants (${room.block} - Room ${room.roomNo})
                            </h3>
                            <div class="roommates-grid">
                                ${roommatesHTML}
                            </div>
                        </div>
                    </div>

                    <!-- Guidelines Sidebar -->
                    <aside class="glass-card guidelines-card">
                        <span class="filter-section-title">Hostel Admission Guidelines</span>
                        
                        <div class="guidelines-list">
                            <div class="guidelines-item">
                                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <span><strong>Reporting Date:</strong> Check-in commences on August 15, 2026. Report to the Block Warden.</span>
                            </div>
                            <div class="guidelines-item">
                                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <span><strong>Documents Required:</strong> Bring copy of booking receipt, passport size photos, and medical form.</span>
                            </div>
                            <div class="guidelines-item">
                                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <span><strong>Curfew:</strong> Regular curfew times are 9:30 PM for in-block check-in.</span>
                            </div>
                            <div class="guidelines-item">
                                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <span><strong>Mess Enrollment:</strong> Select your dining option (North Indian / South Indian / Special) at the mess counter.</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        `;
    },
    afterRender(state) {
        // No heavy post-render tasks
    }
};
