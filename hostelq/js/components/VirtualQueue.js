/* -------------------------------------------------------------
 * HostelQ - Virtual Queue Dashboard Component
 * Shows queue ticket stats, wait progress bar, and scrolling ticker
 * ------------------------------------------------------------- */

import { store } from '../store.js';

export const VirtualQueue = {
    render(state) {
        const user = store.getCurrentUserObject();
        if (!user) return `<div class="loading-spinner-container"><p>Loading session...</p></div>`;

        const queue = state.queue;
        
        // If not in queue, redirect to waiting room
        if (!queue.isInQueue) {
            // Check if user has already booked a room
            if (user.bookedRoom) {
                setTimeout(() => window.location.hash = '#/dashboard', 10);
            } else {
                setTimeout(() => window.location.hash = '#/waiting-room', 10);
            }
            return `<div class="loading-spinner-container"><p>Redirecting...</p></div>`;
        }

        // If turn has arrived, redirect to selection
        if (queue.isMyTurn) {
            setTimeout(() => window.location.hash = '#/select-room', 10);
            return `<div class="loading-spinner-container"><p>Your turn! Redirecting to Room Selection...</p></div>`;
        }

        // Progress Math
        const ahead = queue.studentsAhead;
        const total = queue.totalAheadAtStart || 1;
        const progressPercent = Math.max(5, Math.round(((total - ahead) / total) * 100));

        // Format wait time
        const min = Math.floor(queue.estimatedWaitSec / 60);
        const sec = queue.estimatedWaitSec % 60;
        const waitStr = min > 0 ? `${min}m ${sec}s` : `${sec}s`;

        // Render notifications feed (latest 4)
        const feedItems = state.notifications.slice(0, 4).map(item => `
            <div class="ticker-item">
                <span style="font-weight:600; color:var(--text-primary); margin-right: 6px;">[${item.timestamp}]</span>
                ${item.desc}
            </div>
        `).join('');

        return `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="glass-card queue-panel">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
                        <span class="badge badge-primary">Virtual Queue Active</span>
                        <span style="font-size:0.85rem; color:var(--text-muted)">Queue ID: <strong>#${queue.queueNumber}</strong></span>
                    </div>

                    <h2 style="font-family:'Outfit', sans-serif; font-size:2rem; font-weight:700; margin-bottom:8px;">
                        Securing your booking session
                    </h2>
                    <p style="color:var(--text-secondary); max-width:560px; margin: 0 auto 30px;">
                        Please do not close this browser tab. You will be redirected to the room selection dashboard automatically when your estimated turn arrives.
                    </p>

                    <div class="queue-dashboard-grid">
                        <div class="queue-stat-card">
                            <div class="queue-stat-num">#${queue.queueNumber}</div>
                            <div class="queue-stat-lbl">Your Queue Spot</div>
                        </div>
                        <div class="queue-stat-card" style="border-color: rgba(59, 130, 246, 0.2)">
                            <div class="queue-stat-num" id="queue-ahead-digits" style="color:var(--color-accent)">${ahead}</div>
                            <div class="queue-stat-lbl">Students Ahead</div>
                        </div>
                        <div class="queue-stat-card">
                            <div class="queue-stat-num" id="queue-time-digits">${waitStr}</div>
                            <div class="queue-stat-lbl">Est. Waiting Time</div>
                        </div>
                    </div>

                    <div class="live-bar-container">
                        <div class="live-bar-meta">
                            <span>Queue Progress</span>
                            <span id="queue-progress-text">${progressPercent}%</span>
                        </div>
                        <div class="live-bar-bg">
                            <div class="live-bar-fill" id="queue-progress-bar" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>

                    <!-- Live Ticker -->
                    <div class="live-ticker-container">
                        <div class="live-ticker-title">
                            <span class="live-dot"></span>
                            <span>Live Allocation Ticker</span>
                        </div>
                        <div class="ticker-list" id="queue-live-ticker">
                            ${feedItems.length > 0 ? feedItems : '<p style="color:var(--text-muted); font-size:0.85rem;">Listening to live server transactions...</p>'}
                        </div>
                    </div>

                    <div style="margin-top: 30px; font-size: 0.85rem; color: var(--text-muted); text-align: center;">
                        Logged in as: <strong style="color:var(--text-primary)">${user.name} (${user.regNo})</strong>
                    </div>
                </div>
            </div>
        `;
    },
    afterRender(state) {
        // Automatically check if state has updated. This is handled by main rendering loop in app.js
    }
};
