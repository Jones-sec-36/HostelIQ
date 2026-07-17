/* -------------------------------------------------------------
 * HostelQ - Room Selection & Locking Component
 * Implements filters, recommendations, interactive bed grid, group booking, and lock drawers
 * ------------------------------------------------------------- */

import { store } from '../store.js';

export const RoomSelection = {
    // Component local state to keep track of active room modal and form options
    localState: {
        selectedRoomId: null,
        groupBookingActive: false,
        friendRegs: ["", "", ""],
        searchQuery: "",
        selectedBlock: "All",
        selectedTypes: {
            "4-in-1 AC": true,
            "8-in-1 AC": true,
            "10-in-1 AC": true,
            "Non AC": true
        }
    },

    render(state) {
        const user = store.getCurrentUserObject();
        if (!user) return `<div class="loading-spinner-container"><p>Loading session...</p></div>`;

        // Verification: If not their turn, redirect
        if (!state.queue.isMyTurn) {
            if (user.bookedRoom) {
                setTimeout(() => window.location.hash = '#/dashboard', 10);
            } else {
                setTimeout(() => window.location.hash = '#/waiting-room', 10);
            }
            return `<div class="loading-spinner-container"><p>Waiting for your turn. Redirecting...</p></div>`;
        }

        // Format Session Timer
        const sessionSec = state.queue.sessionTimeRemaining || 300;
        const sMin = Math.floor(sessionSec / 60);
        const sSec = sessionSec % 60;
        const timeStr = `${String(sMin).padStart(2, '0')}:${String(sSec).padStart(2, '0')}`;
        const timerUrgent = sessionSec < 60;

        // Recommendations System
        let recommendationHTML = '';
        if (user.recommendedRoom) {
            const rec = user.recommendedRoom;
            const targetRoom = state.rooms.find(r => r.block === rec.block && r.roomNo === rec.roomNo);
            const availCount = targetRoom ? targetRoom.beds.filter(b => b.status === 'available').length : 0;
            
            if (availCount > 0) {
                recommendationHTML = `
                    <div class="recommendation-banner">
                        <div class="recommend-icon">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 .364l-.707 .707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548 .547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                        </div>
                        <div class="recommend-body">
                            <h4>Smart Room Recommendation</h4>
                            <p>Your previous year's room <strong>${rec.roomNo}</strong> in <strong>${rec.block}</strong> is available with ${availCount} vacant bed(s).</p>
                        </div>
                        <button class="btn btn-success btn-sm btn-quick-select" data-room-id="${targetRoom.id}" style="margin-left: auto; padding: 6px 12px; font-size: 0.85rem;">
                            Quick View
                        </button>
                    </div>
                `;
            }
        }

        // Apply filters
        const filteredRooms = state.rooms.filter(room => {
            // Block filter
            if (this.localState.selectedBlock !== "All" && room.block !== this.localState.selectedBlock) {
                return false;
            }
            // Room type filter
            if (!this.localState.selectedTypes[room.type]) {
                return false;
            }
            // Search query filter (room number or type)
            if (this.localState.searchQuery) {
                const query = this.localState.searchQuery.toLowerCase();
                const matchRoom = room.roomNo.toLowerCase().includes(query);
                const matchBlock = room.block.toLowerCase().includes(query);
                if (!matchRoom && !matchBlock) return false;
            }
            return true;
        });

        // Block Selector Tabs
        const blocks = ["All", "Block A", "Block B", "Block C"];
        const blockTabsHTML = blocks.map(b => `
            <button class="block-tab ${this.localState.selectedBlock === b ? 'active' : ''}" data-block="${b}">
                ${b}
            </button>
        `).join('');

        // Room Grid HTML
        let roomsHTML = '';
        if (filteredRooms.length === 0) {
            roomsHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                    <h3>No rooms match your active search filters</h3>
                    <p style="font-size:0.9rem; margin-top:8px;">Try clearing filters or checking other blocks</p>
                </div>
            `;
        } else {
            roomsHTML = filteredRooms.map(room => {
                const totalBeds = room.beds.length;
                const availableBeds = room.beds.filter(b => b.status === 'available').length;
                
                let cardBorderClass = '';
                let statusBadge = '';
                
                if (availableBeds === 0) {
                    cardBorderClass = 'border-danger';
                    statusBadge = '<span class="badge badge-danger">Fully Booked</span>';
                } else if (availableBeds <= 2) {
                    cardBorderClass = 'border-warning';
                    statusBadge = `<span class="badge badge-warning">${availableBeds} Vacant</span>`;
                } else {
                    cardBorderClass = 'border-success';
                    statusBadge = `<span class="badge badge-success">${availableBeds} Vacant</span>`;
                }

                // Render Bed Dots preview
                const bedDots = room.beds.map(bed => {
                    let dotClass = 'available';
                    if (bed.status === 'booked') dotClass = 'booked';
                    else if (bed.status === 'reserved') dotClass = 'reserved';
                    return `<span class="bed-dot ${dotClass}" title="Bed ${bed.bedNo} (${bed.status})"></span>`;
                }).join('');

                return `
                    <div class="glass-card room-card hover-elevate ${cardBorderClass}" data-room-id="${room.id}">
                        <div class="room-card-head">
                            <div>
                                <div class="room-num">${room.roomNo}</div>
                                <div class="room-type-lbl">${room.block} • ${room.type}</div>
                            </div>
                            ${statusBadge}
                        </div>
                        
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--color-accent);">
                            ${room.price}
                        </div>

                        <div style="border-top:1px solid var(--border-color); padding-top:12px;">
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px; text-transform:uppercase; font-weight:600;">Beds Layout</div>
                            <div class="room-beds-layout">
                                ${bedDots}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Side Drawer for Selected Room
        let drawerHTML = '';
        if (this.localState.selectedRoomId) {
            const activeRoom = state.rooms.find(r => r.id === this.localState.selectedRoomId);
            if (activeRoom) {
                const totalBeds = activeRoom.beds.length;
                const availableBeds = activeRoom.beds.filter(b => b.status === 'available' || (b.status === 'reserved' && b.lockedBy === user.regNo));
                
                // Active Lock details
                const currentStudentLock = state.activeLock.roomId === activeRoom.id ? state.activeLock : null;

                // Render Large Interactive Beds
                const bedButtonsHTML = activeRoom.beds.map(bed => {
                    let bedClass = bed.status; // available, reserved, booked
                    let iconSVG = '';
                    let statusLabel = 'Available';

                    if (bed.status === 'booked') {
                        statusLabel = `Booked by ${bed.bookedBy.name}`;
                        iconSVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`;
                    } else if (bed.status === 'reserved') {
                        if (bed.lockedBy === user.regNo) {
                            bedClass += ' selected';
                            statusLabel = 'Your Temporary Lock';
                            iconSVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>`;
                        } else {
                            statusLabel = 'Locked by student';
                            iconSVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
                        }
                    } else {
                        // Available
                        iconSVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
                    }

                    return `
                        <button class="bed-option-btn ${bedClass}" data-bed-id="${bed.id}" ${bed.status !== 'available' && bed.lockedBy !== user.regNo ? 'disabled' : ''}>
                            ${iconSVG}
                            <span class="bed-option-num">Bed ${bed.bedNo}</span>
                            <span class="bed-status-lbl">${statusLabel}</span>
                        </button>
                    `;
                }).join('');

                // Display Lock Timer inside drawer if current bed is locked by me
                let lockTimerHTML = '';
                let confirmBookingHTML = '';

                if (currentStudentLock) {
                    const lockSec = currentStudentLock.timeRemaining || 180;
                    const lMin = Math.floor(lockSec / 60);
                    const lSec = lockSec % 60;
                    const lockTimeStr = `${String(lMin).padStart(2, '0')}:${String(lSec).padStart(2, '0')}`;

                    lockTimerHTML = `
                        <div class="lock-timer-section">
                            <span>Bed Lock Expires In:</span>
                            <span class="lock-time-val" id="drawer-lock-timer">${lockTimeStr}</span>
                        </div>
                    `;

                    // Group booking inputs if toggled
                    let groupFormHTML = '';
                    if (this.localState.groupBookingActive) {
                        // Limit group size based on available beds in this room
                        const maxFriendsAllowed = Math.min(3, availableBeds.length - 1);
                        
                        let inputsHTML = '';
                        for (let i = 0; i < maxFriendsAllowed; i++) {
                            inputsHTML += `
                                <div class="form-group" style="margin-bottom:10px;">
                                    <label style="font-size:0.75rem;">Friend ${i + 1} Register Number</label>
                                    <input type="text" class="input-glass friend-reg-input" data-index="${i}" value="${this.localState.friendRegs[i]}" placeholder="e.g. STU002" style="padding: 8px 12px; font-size: 0.85rem;">
                                </div>
                            `;
                        }

                        if (maxFriendsAllowed <= 0) {
                            groupFormHTML = `<p style="font-size:0.85rem; color:var(--color-danger); margin-top:8px;">No additional vacant beds available in this room for group booking.</p>`;
                        } else {
                            groupFormHTML = `
                                <div class="group-input-list">
                                    <p style="font-size:0.8rem; color:var(--text-secondary);">Enter Register Numbers of friends. We will lock and book their beds immediately upon confirmation.</p>
                                    ${inputsHTML}
                                </div>
                            `;
                        }
                    }

                    confirmBookingHTML = `
                        <div class="group-booking-box">
                            <div class="group-toggle-wrap">
                                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary)">Group booking with friends</span>
                                <input type="checkbox" id="group-booking-toggle" ${this.localState.groupBookingActive ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--color-accent); cursor:pointer;">
                            </div>
                            
                            ${groupFormHTML}

                            <div style="display:flex; gap:12px; margin-top:10px;">
                                <button class="btn btn-secondary btn-release-lock" style="flex:1;">Cancel Lock</button>
                                <button class="btn btn-success btn-confirm-booking" style="flex:2;">Confirm & Book</button>
                            </div>
                        </div>
                    `;
                } else {
                    confirmBookingHTML = `
                        <div style="text-align:center; padding: 20px; background-color: rgba(255,255,255,0.01); border:1px dashed var(--border-color); border-radius: var(--radius-md);">
                            <p style="font-size:0.85rem; color:var(--text-muted);">Please select a vacant green bed above to lock it for 3 minutes and initiate booking.</p>
                        </div>
                    `;
                }

                drawerHTML = `
                    <div class="drawer-overlay" id="drawer-overlay">
                        <div class="drawer-panel" id="drawer-panel">
                            <div class="drawer-head">
                                <div>
                                    <h3>Room ${activeRoom.roomNo}</h3>
                                    <p style="font-size: 0.85rem; color: var(--text-secondary);">${activeRoom.block} • ${activeRoom.type}</p>
                                </div>
                                <button class="btn-close" id="btn-close-drawer">&times;</button>
                            </div>

                            <div style="font-size: 1.3rem; font-weight: 800; color: var(--color-accent);">
                                ${activeRoom.price}
                            </div>

                            <div class="bed-selector-container">
                                <span class="filter-section-title">Select Bed Slot</span>
                                <div class="bed-grid-large">
                                    ${bedButtonsHTML}
                                </div>
                            </div>

                            ${lockTimerHTML}
                            
                            ${confirmBookingHTML}
                        </div>
                    </div>
                `;
            }
        }

        return `
            <div class="booking-container">
                <!-- Session Timer Banner -->
                <div class="booking-header-timer ${timerUrgent ? 'warning-pulse' : ''}">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>URGENT: Booking Session Active. Select a room before the session expires!</span>
                    </div>
                    <div class="timer-digits" id="session-timer-digits">${timeStr}</div>
                </div>

                ${recommendationHTML}

                <!-- Selection Core Grid -->
                <div class="selection-grid">
                    <!-- Filters Sidebar -->
                    <aside class="glass-card filter-panel">
                        <div>
                            <span class="filter-section-title">Search Rooms</span>
                            <div class="search-input-wrapper" style="margin-top:8px;">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input type="text" id="room-search-input" class="input-glass" placeholder="e.g. 101, Block A..." value="${this.localState.searchQuery}">
                            </div>
                        </div>

                        <div>
                            <span class="filter-section-title">Room Type Options</span>
                            <div class="filter-options" style="margin-top:10px;">
                                <label class="checkbox-label">
                                    <input type="checkbox" class="type-filter-checkbox" data-type="4-in-1 AC" ${this.localState.selectedTypes["4-in-1 AC"] ? 'checked' : ''}>
                                    4-in-1 AC Suite
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" class="type-filter-checkbox" data-type="8-in-1 AC" ${this.localState.selectedTypes["8-in-1 AC"] ? 'checked' : ''}>
                                    8-in-1 AC Shared
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" class="type-filter-checkbox" data-type="10-in-1 AC" ${this.localState.selectedTypes["10-in-1 AC"] ? 'checked' : ''}>
                                    10-in-1 AC Dorm
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" class="type-filter-checkbox" data-type="Non AC" ${this.localState.selectedTypes["Non AC"] ? 'checked' : ''}>
                                    Non AC Standard
                                </label>
                            </div>
                        </div>

                        <div style="border-top:1px solid var(--border-color); padding-top:16px;">
                            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; margin-bottom:8px;">Legend</div>
                            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
                                <div style="display:flex; align-items:center; gap:8px;"><span class="bed-dot available"></span> Available Beds</div>
                                <div style="display:flex; align-items:center; gap:8px;"><span class="bed-dot reserved"></span> Locked / Reserved</div>
                                <div style="display:flex; align-items:center; gap:8px;"><span class="bed-dot booked"></span> Fully Booked</div>
                            </div>
                        </div>
                    </aside>

                    <!-- Main Rooms Area -->
                    <div class="rooms-container">
                        <div class="block-title-tabs">
                            ${blockTabsHTML}
                        </div>

                        <div class="rooms-map-grid">
                            ${roomsHTML}
                        </div>
                    </div>
                </div>

                <!-- Side Drawer rendering -->
                ${drawerHTML}
            </div>
        `;
    },

    afterRender(state) {
        const self = this;

        // Overlay & drawer close
        const closeDrawer = () => {
            self.localState.selectedRoomId = null;
            self.localState.groupBookingActive = false;
            self.localState.friendRegs = ["", "", ""];
            // Re-render
            window.appRender();
        };

        const overlay = document.getElementById('drawer-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeDrawer();
            });
        }

        const closeBtn = document.getElementById('btn-close-drawer');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeDrawer);
        }

        // Room Card selection click
        document.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('click', () => {
                const roomId = card.getAttribute('data-room-id');
                self.localState.selectedRoomId = roomId;
                window.appRender();
            });
        });

        // Quick select recommendation click
        const quickSelectBtn = document.querySelector('.btn-quick-select');
        if (quickSelectBtn) {
            quickSelectBtn.addEventListener('click', () => {
                const roomId = quickSelectBtn.getAttribute('data-room-id');
                self.localState.selectedRoomId = roomId;
                window.appRender();
            });
        }

        // Block Tab change
        document.querySelectorAll('.block-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const b = e.target.getAttribute('data-block');
                self.localState.selectedBlock = b;
                window.appRender();
            });
        });

        // Search Input typing
        const searchInput = document.getElementById('room-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                self.localState.searchQuery = e.target.value;
                // Avoid full repaint instantly, let user type but update store rendering shortly
                // Or just do immediate render since it is client-side and extremely fast
                window.appRender();
                // Refocus input
                const inp = document.getElementById('room-search-input');
                if (inp) {
                    inp.focus();
                    inp.setSelectionRange(inp.value.length, inp.value.length);
                }
            });
        }

        // Type checkboxes filter change
        document.querySelectorAll('.type-filter-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const type = e.target.getAttribute('data-type');
                self.localState.selectedTypes[type] = e.target.checked;
                window.appRender();
            });
        });

        // Bed Button lock click
        document.querySelectorAll('.bed-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const bedId = btn.getAttribute('data-bed-id');
                const roomId = self.localState.selectedRoomId;
                
                const res = store.lockBed(roomId, bedId);
                if (res.success) {
                    window.appRender();
                } else {
                    alert(res.error || "Could not lock bed");
                }
            });
        });

        // Group Booking Toggle Checkbox
        const groupToggle = document.getElementById('group-booking-toggle');
        if (groupToggle) {
            groupToggle.addEventListener('change', (e) => {
                self.localState.groupBookingActive = e.target.checked;
                window.appRender();
            });
        }

        // Group Friend Inputs typing
        document.querySelectorAll('.friend-reg-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = Number(e.target.getAttribute('data-index'));
                self.localState.friendRegs[idx] = e.target.value.trim();
            });
        });

        // Release Lock Button
        const releaseBtn = document.querySelector('.btn-release-lock');
        if (releaseBtn) {
            releaseBtn.addEventListener('click', () => {
                store.releaseActiveLock();
                window.appRender();
            });
        }

        // Confirm Booking button
        const confirmBtn = document.querySelector('.btn-confirm-booking');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const roomId = self.localState.selectedRoomId;
                const bedId = state.activeLock.bedId;
                
                let friends = [];
                if (self.localState.groupBookingActive) {
                    // Filter out empty entries
                    friends = self.localState.friendRegs.filter(r => r !== "");
                }

                const res = store.confirmBooking(roomId, bedId, friends);
                if (res.success) {
                    self.localState.selectedRoomId = null;
                    self.localState.groupBookingActive = false;
                    self.localState.friendRegs = ["", "", ""];
                    window.location.hash = '#/confirmation';
                } else {
                    alert(res.error || "Booking failed.");
                }
            });
        }
    }
};
