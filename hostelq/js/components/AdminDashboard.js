/* -------------------------------------------------------------
 * HostelQ - Admin Dashboard & Analytics Console Component
 * Integrates login, control panel, occupancy statistics, system reset, and CSV reports
 * ------------------------------------------------------------- */

import { store } from '../store.js';

export const AdminDashboard = {
    // Component local state
    localState: {
        reportSearchQuery: ""
    },

    render(state) {
        const user = store.getCurrentUserObject();
        
        // If not logged in as admin, render admin login card
        if (!user || !user.isAdmin) {
            return `
                <div class="auth-container">
                    <div class="glass-card auth-card">
                        <div class="auth-header">
                            <h2>Admin Dashboard</h2>
                            <p>Authentication required to access management console</p>
                        </div>

                        <form id="admin-login-form">
                            <div class="form-group">
                                <label for="admin-user">Username</label>
                                <input type="text" id="admin-user" class="input-glass" placeholder="Username" required value="admin">
                            </div>

                            <div class="form-group" style="margin-bottom: 24px;">
                                <label for="admin-pass">Password</label>
                                <input type="password" id="admin-pass" class="input-glass" placeholder="••••••••" required value="password">
                            </div>

                            <div id="admin-login-error" style="color: var(--color-danger); font-size: 0.85rem; margin-bottom: 16px; text-align: center; display: none;"></div>

                            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">
                                Authenticate
                            </button>
                        </form>
                        
                        <div class="demo-credentials-box" style="text-align:center;">
                            <p style="font-size:0.8rem; color:var(--text-muted);">Default credentials pre-filled: <strong>admin</strong> / <strong>password</strong></p>
                        </div>
                    </div>
                </div>
            `;
        }

        // -------------------------------------------------------------
        // Authenticated Admin Dashboard Layout
        // -------------------------------------------------------------
        
        // Calculate Statistics
        const totalRooms = state.rooms.length;
        let totalBeds = 0;
        let occupiedBeds = 0;
        let reservedBeds = 0;
        
        state.rooms.forEach(r => {
            totalBeds += r.beds.length;
            r.beds.forEach(b => {
                if (b.status === 'booked') occupiedBeds++;
                else if (b.status === 'reserved') reservedBeds++;
            });
        });

        const vacantBeds = totalBeds - occupiedBeds;
        const occupancyRatePercent = Math.round((occupiedBeds / totalBeds) * 100);

        // Occupancy by Block (for bar chart)
        const blocks = ["Block A", "Block B", "Block C"];
        const blockStats = blocks.map(b => {
            const roomsInBlock = state.rooms.filter(r => r.block === b);
            let bedsCount = 0;
            let occupiedCount = 0;
            
            roomsInBlock.forEach(r => {
                bedsCount += r.beds.length;
                r.beds.forEach(bed => {
                    if (bed.status === 'booked') occupiedCount++;
                });
            });

            return {
                block: b,
                total: bedsCount,
                occupied: occupiedCount,
                percent: Math.round((occupiedCount / (bedsCount || 1)) * 100)
            };
        });

        // Current queue count
        const activeQueueCount = state.queue.isInQueue && !state.queue.isMyTurn ? 1 : 0;
        const simulatedQueueSize = Math.max(0, Math.floor(Math.random() * 5) + (state.bookingWindow.status === 'open' ? 14 : 0));

        // Event logs
        const logItemsHTML = state.notifications.slice(0, 10).map(log => {
            let badgeClass = 'badge-info';
            if (log.type === 'success') badgeClass = 'badge-success';
            else if (log.type === 'danger') badgeClass = 'badge-danger';
            else if (log.type === 'warning') badgeClass = 'badge-warning';

            return `
                <div style="font-size:0.8rem; display:flex; gap:10px; border-bottom:1px solid var(--border-color); padding: 8px 0; align-items:center;">
                    <span style="color:var(--text-muted); font-family:monospace;">${log.timestamp}</span>
                    <span class="badge ${badgeClass}" style="font-size:0.6rem; padding: 2px 6px;">${log.type.toUpperCase()}</span>
                    <span style="color:var(--text-secondary); flex:1;">${log.desc}</span>
                </div>
            `;
        }).join('');

        // Reports Filter
        // We aggregate all bookings from student objects to have a search-friendly list
        const allBookings = [];
        state.students.forEach(stud => {
            if (stud.bookedRoom) {
                allBookings.push({
                    regNo: stud.regNo,
                    name: stud.name,
                    block: stud.bookedRoom.block,
                    roomNo: stud.bookedRoom.roomNo,
                    bedNo: stud.bookedRoom.bedNo,
                    type: stud.bookedRoom.type,
                    price: stud.bookedRoom.price,
                    timestamp: stud.bookedRoom.timestamp,
                    receiptNo: stud.bookedRoom.receiptNo
                });
            }
        });

        // Filter bookings by query
        const filteredReportBookings = allBookings.filter(b => {
            const query = this.localState.reportSearchQuery.toLowerCase();
            return b.name.toLowerCase().includes(query) || 
                   b.regNo.toLowerCase().includes(query) || 
                   b.roomNo.toLowerCase().includes(query) || 
                   b.block.toLowerCase().includes(query);
        });

        // Table Rows HTML
        const tableRowsHTML = filteredReportBookings.map(b => `
            <tr>
                <td style="font-weight:600; color:var(--text-primary);">${b.name}</td>
                <td>${b.regNo}</td>
                <td>${b.block} - ${b.roomNo}</td>
                <td>Bed #${b.bedNo}</td>
                <td>${b.type}</td>
                <td style="font-family:monospace; font-size:0.8rem;">${b.receiptNo}</td>
                <td style="font-size:0.8rem;">${b.timestamp}</td>
            </tr>
        `).join('');

        // Bar Charts HTML
        const chartsHTML = blockStats.map(bs => `
            <div class="chart-bar-item">
                <div class="chart-bar-labels">
                    <span>${bs.block} (${bs.occupied}/${bs.total} Beds)</span>
                    <strong>${bs.percent}%</strong>
                </div>
                <div class="chart-bar-rail">
                    <div class="chart-bar-fill" style="width: ${bs.percent}%;"></div>
                </div>
            </div>
        `).join('');

        return `
            <div class="admin-wrapper">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
                    <div>
                        <h1 style="font-family:'Outfit', sans-serif; font-size:2rem; font-weight:700;">Admin Management Console</h1>
                        <p style="color:var(--text-secondary); font-size:0.95rem;">Monitor rooms, manage bookings queue, and simulate real-time traffic.</p>
                    </div>
                    <button class="btn btn-secondary btn-sm btn-logout" style="font-size:0.85rem;">Logout Admin</button>
                </div>

                <!-- Statistics Metrics -->
                <div class="admin-grid">
                    <div class="glass-card analytics-card">
                        <div class="analytics-lbl">Occupancy Rate</div>
                        <div class="analytics-num">${occupancyRatePercent}%</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${occupiedBeds} occupied / ${totalBeds} total beds</div>
                    </div>
                    <div class="glass-card analytics-card">
                        <div class="analytics-lbl">Available Beds</div>
                        <div class="analytics-num" style="color:var(--color-success)">${vacantBeds}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Vacant allocations remaining</div>
                    </div>
                    <div class="glass-card analytics-card">
                        <div class="analytics-lbl">Live Queue Size</div>
                        <div class="analytics-num" style="color:var(--color-warning)">${simulatedQueueSize}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Students waiting in line</div>
                    </div>
                    <div class="glass-card analytics-card">
                        <div class="analytics-lbl">Booking Window Status</div>
                        <div class="analytics-num" style="color: ${state.bookingWindow.status === 'open' ? 'var(--color-success)' : 'var(--color-danger)'}">
                            ${state.bookingWindow.status.toUpperCase()}
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Countdown timer: ${state.bookingWindow.countdownRemaining}s</div>
                    </div>
                </div>

                <!-- Controls and Occupancy charts grid -->
                <div class="admin-sections-grid" style="margin-bottom: 40px;">
                    <!-- Controls Column -->
                    <div class="glass-card admin-panel-control">
                        <div style="border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                            <span class="filter-section-title">Admission Portal Controls</span>
                        </div>

                        <!-- Window status buttons -->
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <span style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);">Booking Window Options</span>
                            <div class="flex-btn-row">
                                <button class="btn btn-secondary btn-set-window" data-status="closed">Close Portal</button>
                                <button class="btn btn-warning btn-set-window" data-status="countdown">Start 15s Countdown</button>
                                <button class="btn btn-success btn-set-window" data-status="open">Open Instantly</button>
                            </div>
                        </div>

                        <!-- Simulator controls -->
                        <div class="simulation-control-box" style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:10px;">
                            <span style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);">
                                Simulator Speed Control: <span class="speed-indicator">${state.simulationSpeed}x</span>
                            </span>
                            <div class="flex-btn-row">
                                <button class="btn btn-secondary btn-set-speed" data-speed="0">Pause Sim</button>
                                <button class="btn btn-secondary btn-set-speed" data-speed="1">1x Speed</button>
                                <button class="btn btn-secondary btn-set-speed" data-speed="2">2x Speed</button>
                                <button class="btn btn-secondary btn-set-speed" data-speed="5">5x Speed</button>
                                <button class="btn btn-secondary btn-set-speed" data-speed="10">10x Speed</button>
                            </div>
                        </div>

                        <!-- System Reset -->
                        <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:10px;">
                            <span style="font-size:0.85rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:8px;">Maintenance Actions</span>
                            <button class="btn btn-danger btn-reset-system" style="padding: 8px 16px; font-size: 0.85rem;">Reset Booking Database</button>
                        </div>
                    </div>

                    <!-- Occupancy charts Column -->
                    <div class="glass-card" style="padding:24px;">
                        <span class="filter-section-title">Hostel Block Occupancy</span>
                        <div class="chart-bar-list">
                            ${chartsHTML}
                        </div>
                        
                        <div style="border-top:1px solid var(--border-color); margin-top:20px; padding-top:16px; display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
                            <span>Total capacity: <strong>${totalBeds} Beds</strong></span>
                            <span>Currently Locked/Reserved: <strong>${reservedBeds} Beds</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Live Logs & Reports grid -->
                <div class="admin-sections-grid" style="grid-template-columns: 0.8fr 1.2fr; margin-bottom:40px;">
                    <!-- Event Feed -->
                    <div class="glass-card" style="padding:24px; max-height: 400px; overflow-y: auto;">
                        <span class="filter-section-title">Live Transaction Logs</span>
                        <div style="margin-top:16px; display:flex; flex-direction:column;">
                            ${logItemsHTML.length > 0 ? logItemsHTML : '<p style="color:var(--text-muted); font-size:0.85rem;">No transaction logs available.</p>'}
                        </div>
                    </div>

                    <!-- Booking report -->
                    <div class="glass-card" style="padding:24px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
                            <span class="filter-section-title">Allocated Bookings Registry</span>
                            <button class="btn btn-success btn-sm btn-export-csv" style="padding: 6px 12px; font-size:0.85rem;">Export CSV Report</button>
                        </div>

                        <div class="search-input-wrapper">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            <input type="text" id="report-search-input" class="input-glass" placeholder="Search by Student, Reg No, Room..." value="${this.localState.reportSearchQuery}">
                        </div>

                        <div class="table-container">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Reg No</th>
                                        <th>Allotted Room</th>
                                        <th>Bed Slot</th>
                                        <th>Type</th>
                                        <th>Receipt ID</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRowsHTML.length > 0 ? tableRowsHTML : '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No booking reports match the search criteria.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    afterRender(state) {
        const self = this;
        const user = store.getCurrentUserObject();

        if (!user || !user.isAdmin) {
            // Admin Login bindings
            const loginForm = document.getElementById('admin-login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const err = document.getElementById('admin-login-error');
                    err.style.display = 'none';

                    const u = document.getElementById('admin-user').value.trim();
                    const p = document.getElementById('admin-pass').value;

                    const res = store.loginAdmin(u, p);
                    if (res.success) {
                        window.appRender();
                    } else {
                        err.textContent = res.error;
                        err.style.display = 'block';
                    }
                });
            }
            return;
        }

        // Admin logout
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                store.logout();
                window.location.hash = '#/';
            });
        }

        // Portal Window Controls
        document.querySelectorAll('.btn-set-window').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.target.getAttribute('data-status');
                store.setBookingWindowStatus(status);
            });
        });

        // Simulator Speed Controls
        document.querySelectorAll('.btn-set-speed').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = e.target.getAttribute('data-speed');
                store.setSimulationSpeed(speed);
            });
        });

        // Reset System State
        const resetBtn = document.querySelector('.btn-reset-system');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm("Are you sure you want to restore the system database to its default initial state? All active bookings and user states will be deleted.")) {
                    store.resetState();
                    alert("Database reset completed successfully!");
                    window.location.reload();
                }
            });
        }

        // Search reports registry
        const reportSearch = document.getElementById('report-search-input');
        if (reportSearch) {
            reportSearch.addEventListener('input', (e) => {
                self.localState.reportSearchQuery = e.target.value;
                window.appRender();
                const inp = document.getElementById('report-search-input');
                if (inp) {
                    inp.focus();
                    inp.setSelectionRange(inp.value.length, inp.value.length);
                }
            });
        }

        // Export Report to CSV file
        const exportBtn = document.querySelector('.btn-export-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                // Get all active bookings
                const bookingsExport = [];
                state.students.forEach(stud => {
                    if (stud.bookedRoom) {
                        bookingsExport.push({
                            name: stud.name,
                            regNo: stud.regNo,
                            room: `${stud.bookedRoom.block} Room ${stud.bookedRoom.roomNo}`,
                            bed: `Bed ${stud.bookedRoom.bedNo}`,
                            type: stud.bookedRoom.type,
                            price: stud.bookedRoom.price,
                            receipt: stud.bookedRoom.receiptNo,
                            timestamp: stud.bookedRoom.timestamp
                        });
                    }
                });

                if (bookingsExport.length === 0) {
                    alert("No bookings currently recorded to export.");
                    return;
                }

                // Build CSV string
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Student Name,Register Number,Allocated Room,Bed Number,Configuration,Fee,Receipt ID,Timestamp\n";

                bookingsExport.forEach(row => {
                    const csvRow = [
                        `"${row.name}"`,
                        `"${row.regNo}"`,
                        `"${row.room}"`,
                        `"${row.bed}"`,
                        `"${row.type}"`,
                        `"${row.price}"`,
                        `"${row.receipt}"`,
                        `"${row.timestamp}"`
                    ].join(",");
                    csvContent += csvRow + "\n";
                });

                // Download Link trigger
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `HostelQ-Allocation-Report-${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                store.addNotification("Report Exported", "Booking reports registry exported to CSV successfully.", "success");
            });
        }
    }
};
