/* -------------------------------------------------------------
 * HostelQ - Landing Page Component
 * Shows hero banner, details, statistics, and main portals access
 * ------------------------------------------------------------- */

export const LandingPage = {
    render(state) {
        const isLoggedStudent = state.currentUser && state.currentUser.type === 'student';
        const targetStudentLink = isLoggedStudent ? '#/dashboard' : '#/login';

        return `
            <div class="landing-container">
                <!-- Hero Section -->
                <section class="landing-hero">
                    <div class="hero-text">
                        <div class="hero-badge">Hostel Room Allocation V2.0</div>
                        <h1>The First Virtual Queue-Based Hostel Room Booking Platform.</h1>
                        <p>Say goodbye to long queues and crowded rooms at the hostel office. HostelQ introduces a high-availability Virtual Waiting Room and Tatkal Room Lock system that ensures fair, rapid, and transparent room bookings.</p>
                        
                        <div class="hero-actions">
                            <a href="${targetStudentLink}" class="btn btn-primary btn-lg">
                                Student Portal
                                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </a>
                            <a href="#/admin" class="btn btn-secondary btn-lg">Admin Console</a>
                        </div>
                    </div>

                    <div class="hero-visual">
                        <div class="hero-card-stack">
                            <!-- Stack Card 2 (Deepest) -->
                            <div class="stacked-card card-back-2">
                                <div class="card-front-header">
                                    <span style="font-weight:700">Block C - Room 301</span>
                                    <span class="badge badge-danger">10-in-1 AC</span>
                                </div>
                                <div style="display:flex; gap:10px; opacity:0.3">
                                    <div style="width:20px; height:20px; background:red; border-radius:4px"></div>
                                    <div style="width:20px; height:20px; background:red; border-radius:4px"></div>
                                    <div style="width:20px; height:20px; background:red; border-radius:4px"></div>
                                </div>
                            </div>
                            
                            <!-- Stack Card 1 (Middle) -->
                            <div class="stacked-card card-back-1">
                                <div class="card-front-header">
                                    <span style="font-weight:700">Block B - Room 204</span>
                                    <span class="badge badge-warning">Non AC</span>
                                </div>
                                <div style="display:flex; gap:10px; opacity:0.6">
                                    <div style="width:20px; height:20px; background:green; border-radius:4px"></div>
                                    <div style="width:20px; height:20px; background:orange; border-radius:4px"></div>
                                    <div style="width:20px; height:20px; background:red; border-radius:4px"></div>
                                </div>
                            </div>

                            <!-- Front Card (Main focus) -->
                            <div class="stacked-card card-front">
                                <div class="card-front-header">
                                    <div style="display:flex; align-items:center; gap:8px">
                                        <div class="live-dot"></div>
                                        <span style="font-weight: 700; font-size: 1.1rem">Virtual Queue Activity</span>
                                    </div>
                                    <span class="badge badge-primary">Queue Open</span>
                                </div>

                                <div class="queue-preview-widget">
                                    <div class="widget-row">
                                        <span class="widget-label">Student Queue ID</span>
                                        <span class="widget-val">#1,402</span>
                                    </div>
                                    <div class="widget-row">
                                        <span class="widget-label">Students Ahead</span>
                                        <span class="widget-val" style="color:var(--color-accent)">12 Students</span>
                                    </div>
                                    <div class="widget-row">
                                        <span class="widget-label">Est. Waiting Time</span>
                                        <span class="widget-val" style="color:var(--color-warning)">~ 2 Mins</span>
                                    </div>
                                    
                                    <div class="widget-progress" style="margin-top:10px">
                                        <div class="widget-bar"></div>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted)">
                                        <span>Joining...</span>
                                        <span>72% Checked-In</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Statistics Section -->
                <section class="stats-section">
                    <div class="glass-card stat-item">
                        <div class="stat-num">500+</div>
                        <div class="stat-label">Students Handled in Queue</div>
                    </div>
                    <div class="glass-card stat-item">
                        <div class="stat-num">&lt; 10s</div>
                        <div class="stat-label">Average Wait Time Per Turn</div>
                    </div>
                    <div class="glass-card stat-item">
                        <div class="stat-num">3 Mins</div>
                        <div class="stat-label">Temporary Room Lock Period</div>
                    </div>
                    <div class="glass-card stat-item">
                        <div class="stat-num">100%</div>
                        <div class="stat-label">Anti-Overcrowding Compliance</div>
                    </div>
                </section>

                <!-- Features Section -->
                <section class="features-section">
                    <div class="section-header">
                        <h2>Engineered for High-Pressure Bookings</h2>
                        <p>Built with enterprise-grade queuing algorithms to handle peak admission traffic without crashing.</p>
                    </div>

                    <div class="features-grid">
                        <div class="glass-card feature-card hover-elevate">
                            <div class="feature-icon-container">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                            <h3>Virtual Waiting Room</h3>
                            <p>Students enter a waiting lobby with a countdown timer. Once the window opens, they are seamlessly queued without manual server-hammering.</p>
                        </div>

                        <div class="glass-card feature-card hover-elevate">
                            <div class="feature-icon-container">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                            </div>
                            <h3>3-Minute Tatkal Lock</h3>
                            <p>Clicking an available bed locks it immediately for 3 minutes, giving students sufficient time to consult roommates and complete confirmation.</p>
                        </div>

                        <div class="glass-card feature-card hover-elevate">
                            <div class="feature-icon-container">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                            </div>
                            <h3>Group Bookings with Friends</h3>
                            <p>Lock and allocate multiple beds in the same room simultaneously, ensuring friends stay together without coordination issues.</p>
                        </div>

                        <div class="glass-card feature-card hover-elevate">
                            <div class="feature-icon-container">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 .364l-.707 .707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548 .547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                            </div>
                            <h3>Smart Recommendations</h3>
                            <p>Automatically flags if the student's previous year's room is available, simplifying the re-booking process.</p>
                        </div>
                    </div>
                </section>
            </div>
        `;
    },
    afterRender(state) {
        // No heavy bindings needed for Landing Page
    }
};
