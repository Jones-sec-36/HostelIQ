/* -------------------------------------------------------------
 * HostelQ - Student Login Component
 * Renders student credentials form and registers handlers
 * ------------------------------------------------------------- */

import { store } from '../store.js';

export const StudentLogin = {
    render(state) {
        return `
            <div class="auth-container">
                <div class="glass-card auth-card">
                    <div class="auth-header">
                        <h2>Student Login</h2>
                        <p>Access your HostelQ booking queue dashboard</p>
                    </div>

                    <form id="login-form">
                        <div class="form-group">
                            <label for="reg-no">Register Number</label>
                            <input type="text" id="reg-no" class="input-glass" placeholder="e.g. STU001" required autocomplete="off">
                        </div>

                        <div class="form-group" style="margin-bottom: 24px;">
                            <label for="password">Password</label>
                            <input type="password" id="password" class="input-glass" placeholder="••••••••" required>
                        </div>

                        <div id="login-error" style="color: var(--color-danger); font-size: 0.85rem; margin-bottom: 16px; text-align: center; display: none;"></div>

                        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">
                            Sign In
                        </button>
                    </form>

                    <div class="demo-credentials-box">
                        <div class="demo-title">
                            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Demo Accounts (Click to login)
                        </div>
                        <div class="demo-account-list">
                            <div class="demo-account-item">
                                <span>Alex Mercer (Block A Recommendation)</span>
                                <span class="demo-badge-click" data-reg="STU001">STU001</span>
                            </div>
                            <div class="demo-account-item">
                                <span>David Chen (Block B Recommendation)</span>
                                <span class="demo-badge-click" data-reg="STU002">STU002</span>
                            </div>
                            <div class="demo-account-item">
                                <span>Sophia Martinez (Block A Recommendation)</span>
                                <span class="demo-badge-click" data-reg="STU003">STU003</span>
                            </div>
                            <div class="demo-account-item">
                                <span>Emily Watson (No Recommendation)</span>
                                <span class="demo-badge-click" data-reg="STU004">STU004</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    afterRender(state) {
        const form = document.getElementById('login-form');
        const errDiv = document.getElementById('login-error');
        const regInput = document.getElementById('reg-no');
        const passInput = document.getElementById('password');

        // Form Submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            errDiv.style.display = 'none';

            const regNo = regInput.value.trim();
            const password = passInput.value;

            const res = store.loginStudent(regNo, password);
            if (res.success) {
                // Check if already booked, or where to route
                const userObj = store.getCurrentUserObject();
                if (userObj.bookedRoom) {
                    window.location.hash = '#/dashboard';
                } else if (store.state.bookingWindow.status === 'open') {
                    window.location.hash = '#/queue';
                } else {
                    window.location.hash = '#/waiting-room';
                }
            } else {
                errDiv.textContent = res.error;
                errDiv.style.display = 'block';
            }
        });

        // Click Demo Badges
        document.querySelectorAll('.demo-badge-click').forEach(badge => {
            badge.addEventListener('click', (e) => {
                const reg = e.target.getAttribute('data-reg');
                regInput.value = reg;
                passInput.value = 'password';
                
                // Programmatically trigger login submit
                form.requestSubmit();
            });
        });
    }
};
