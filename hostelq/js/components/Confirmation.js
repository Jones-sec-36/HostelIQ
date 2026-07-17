/* -------------------------------------------------------------
 * HostelQ - Booking Confirmation & Receipt Component
 * Shows booking success screen and allows printing or downloading SVG receipt
 * ------------------------------------------------------------- */

import { store } from '../store.js';

export const Confirmation = {
    render(state) {
        const user = store.getCurrentUserObject();
        if (!user || !user.bookedRoom) {
            // Redirect to dashboard or home
            setTimeout(() => window.location.hash = '#/dashboard', 10);
            return `<div class="loading-spinner-container"><p>Redirecting...</p></div>`;
        }

        const room = user.bookedRoom;

        return `
            <div class="receipt-wrapper">
                <div class="glass-card receipt-card">
                    <div class="receipt-header">
                        <div class="receipt-success-badge">
                            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h2>Room Allocated Successfully!</h2>
                        <p>Your room booking has been recorded instantly in the hostel database.</p>
                    </div>

                    <div class="receipt-details">
                        <div class="receipt-row">
                            <span class="receipt-lbl">Student Name</span>
                            <span class="receipt-val">${user.name}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Register Number</span>
                            <span class="receipt-val">${user.regNo}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Receipt Number</span>
                            <span class="receipt-val" style="font-family:monospace">${room.receiptNo}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Allotted Room</span>
                            <span class="receipt-val">${room.block} • Room ${room.roomNo}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Bed Number</span>
                            <span class="receipt-val">Bed #${room.bedNo}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Room Configuration</span>
                            <span class="receipt-val">${room.type}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Annual Cost</span>
                            <span class="receipt-val">${room.price}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Timestamp</span>
                            <span class="receipt-val">${room.timestamp}</span>
                        </div>
                        <div class="receipt-row" style="border:none">
                            <span class="receipt-lbl">Allocation Status</span>
                            <span class="badge badge-success">Official - Confirmed</span>
                        </div>
                    </div>

                    <div class="receipt-actions">
                        <button class="btn btn-secondary" id="btn-print-receipt" style="flex:1;">
                            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                            Print Receipt
                        </button>
                        <button class="btn btn-primary" id="btn-download-receipt" style="flex:1;">
                            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download Receipt
                        </button>
                    </div>
                    
                    <div style="text-align:center; margin-top:24px;">
                        <a href="#/dashboard" class="nav-link" style="display:inline-block">Go to Student Dashboard &rarr;</a>
                    </div>
                </div>
            </div>
        `;
    },
    afterRender(state) {
        const user = store.getCurrentUserObject();
        if (!user || !user.bookedRoom) return;

        const room = user.bookedRoom;

        // Print Handler
        const printBtn = document.getElementById('btn-print-receipt');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // SVG Download Handler
        const downloadBtn = document.getElementById('btn-download-receipt');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const svgContent = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650" style="background:#0F172A; font-family:'Inter', sans-serif;">
                        <!-- Styling -->
                        <style>
                            .title { font-size: 22px; fill: #FFFFFF; font-weight: 700; }
                            .subtitle { font-size: 13px; fill: #94A3B8; }
                            .lbl { font-size: 14px; fill: #94A3B8; }
                            .val { font-size: 14px; fill: #FFFFFF; font-weight: 600; text-anchor: end; }
                            .badge { fill: rgba(16, 185, 129, 0.1); stroke: #10B981; }
                            .badge-text { font-size: 12px; fill: #10B981; font-weight: 700; text-anchor: middle; }
                        </style>
                        
                        <!-- Header Banner -->
                        <rect x="0" y="0" width="500" height="90" fill="#1E3A8A"/>
                        <text x="250" y="45" fill="#FFFFFF" font-size="28" font-weight="800" text-anchor="middle" letter-spacing="1">HostelQ Receipt</text>
                        <text x="250" y="68" fill="#93C5FD" font-size="12" text-anchor="middle">Official E-Allocation Summary</text>
                        
                        <!-- Watermark Logo -->
                        <circle cx="250" cy="300" r="120" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="2"/>
                        <text x="250" y="320" fill="rgba(255,255,255,0.03)" font-size="70" font-weight="900" text-anchor="middle">HQ</text>

                        <!-- Content Layout -->
                        <g transform="translate(40, 140)">
                            <text class="title" x="0" y="0">Allocation Confirmed</text>
                            <text class="subtitle" x="0" y="22">Your room slot is locked and secured.</text>
                            
                            <!-- Dashed line -->
                            <line x1="0" y1="45" x2="420" y2="45" stroke="#334155" stroke-dasharray="6,4" stroke-width="2"/>
                            
                            <!-- Rows -->
                            <g transform="translate(0, 80)">
                                <text class="lbl" x="0" y="0">Student Name</text>
                                <text class="val" x="420" y="0">${user.name}</text>
                                
                                <text class="lbl" x="0" y="35">Register Number</text>
                                <text class="val" x="420" y="35">${user.regNo}</text>
                                
                                <text class="lbl" x="0" y="70">Receipt ID</text>
                                <text class="val" x="420" y="70" font-family="monospace">${room.receiptNo}</text>
                                
                                <text class="lbl" x="0" y="105">Allotted Room</text>
                                <text class="val" x="420" y="105">${room.block} • Room ${room.roomNo}</text>
                                
                                <text class="lbl" x="0" y="140">Bed Slot Number</text>
                                <text class="val" x="420" y="140">Bed #${room.bedNo}</text>
                                
                                <text class="lbl" x="0" y="175">Room Configuration</text>
                                <text class="val" x="420" y="175">${room.type}</text>
                                
                                <text class="lbl" x="0" y="210">Annual Fee</text>
                                <text class="val" x="420" y="210">${room.price}</text>
                                
                                <text class="lbl" x="0" y="245">Allotted Time</text>
                                <text class="val" x="420" y="245">${room.timestamp}</text>
                            </g>
                            
                            <line x1="0" y1="365" x2="420" y2="365" stroke="#334155" stroke-width="1"/>
                            
                            <!-- Status Badge -->
                            <g transform="translate(0, 395)">
                                <text class="lbl" x="0" y="15">Verification Status</text>
                                <rect class="badge" x="300" y="-5" width="120" height="28" rx="6"/>
                                <text class="badge-text" x="360" y="14">SUCCESSFUL</text>
                            </g>
                        </g>

                        <!-- Footer -->
                        <rect x="0" y="600" width="500" height="50" fill="#090d16"/>
                        <text x="250" y="630" fill="#64748B" font-size="11" text-anchor="middle">&copy; 2026 HostelQ. Generated electronically.</text>
                    </svg>
                `;

                const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `HostelQ-Receipt-${room.receiptNo}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                store.addNotification("Downloaded Receipt", `Successfully downloaded HostelQ SVG Receipt for Room ${room.roomNo}`, "success");
            });
        }
    }
};
