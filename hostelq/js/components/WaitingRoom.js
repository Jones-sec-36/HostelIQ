/* -------------------------------------------------------------
 * HostelQ - Waiting Lobby Component
 * Displays countdown timer to booking start and redirects to queue
 * ------------------------------------------------------------- */

import { store } from '../store.js';

export const WaitingRoom = {
    render(state) {
        const user = store.getCurrentUserObject();
        if (!user) return `<div class="loading-spinner-container"><p>Loading session...</p></div>`;

        const windowState = state.bookingWindow;
        let countdownHTML = '';
        let subtitleHTML = '';
        let buttonHTML = '';

        if (windowState.status === 'closed') {
            countdownHTML = `<div class="countdown-number" style="color:var(--color-danger)">CLOSED</div>`;
            subtitleHTML = `<p style="margin-top:14px; color:var(--text-secondary)">The hostel room booking window is currently closed by the hostel board. Please wait for the admin to announce the open schedule.</p>`;
            buttonHTML = `<button class="btn btn-secondary" disabled>Join Virtual Queue</button>`;
        } else if (windowState.status === 'countdown') {
            countdownHTML = `
                <div class="countdown-pulse"></div>
                <div class="countdown-number" id="lobby-timer-digits">${windowState.countdownRemaining}</div>
                <div class="countdown-label">Seconds</div>
            `;
            subtitleHTML = `<p style="margin-top:14px; color:var(--text-secondary)">The room booking window opens shortly. You are currently in the pre-admission waiting lobby. The 'Join Queue' button will activate automatically.</p>`;
            buttonHTML = `<button class="btn btn-primary" id="btn-join-queue-inactive" disabled>Join Virtual Queue</button>`;
        } else {
            // Window is Open!
            countdownHTML = `<div class="countdown-number" style="color:var(--color-success)">OPEN</div>`;
            subtitleHTML = `<p style="margin-top:14px; color:var(--color-success); font-weight: 500;">Official room bookings have commenced! Click below to secure your position in the virtual queue.</p>`;
            buttonHTML = `<button class="btn btn-primary btn-lg" id="btn-join-queue-active">Join Virtual Queue Now</button>`;
        }

        return `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="glass-card queue-panel">
                    <div style="margin-bottom: 24px;">
                        <span class="badge badge-info">Waiting Room</span>
                    </div>
                    
                    <h2 style="font-family:'Outfit', sans-serif; font-size:2rem; font-weight:700; margin-bottom:24px;">
                        Hostel room allocation lobby
                    </h2>

                    <div class="countdown-visual" id="lobby-countdown-box">
                        ${countdownHTML}
                    </div>

                    <div style="max-width:540px; margin: 0 auto 30px;">
                        ${subtitleHTML}
                    </div>

                    <div id="join-btn-container">
                        ${buttonHTML}
                    </div>

                    <div style="margin-top: 30px; font-size: 0.85rem; color: var(--text-muted);">
                        Logged in as: <strong style="color:var(--text-primary)">${user.name} (${user.regNo})</strong>
                    </div>
                </div>
            </div>
        `;
    },
    afterRender(state) {
        // If window is already open, bind join queue click
        const joinBtn = document.getElementById('btn-join-queue-active');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                store.joinQueue();
                window.location.hash = '#/queue';
            });
        }

        // Setup reactive transitions
        // We will let app.js trigger full renders on store changes.
        // But if the student is already logged in and the state updates,
        // this will update automatically.
    }
};
