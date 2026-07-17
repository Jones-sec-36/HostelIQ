/* -------------------------------------------------------------
 * HostelQ - Core Application Shell & Routing Launcher
 * Integrates store listener, hash-router, toast alerts, theme and nav
 * ------------------------------------------------------------- */

import { store } from './store.js';

// Import Views
import { LandingPage } from './components/LandingPage.js';
import { StudentLogin } from './components/StudentLogin.js';
import { WaitingRoom } from './components/WaitingRoom.js';
import { VirtualQueue } from './components/VirtualQueue.js';
import { RoomSelection } from './components/RoomSelection.js';
import { Confirmation } from './components/Confirmation.js';
import { StudentDashboard } from './components/StudentDashboard.js';
import { AdminDashboard } from './components/AdminDashboard.js';

// Route Registry
const ROUTES = {
    '/': LandingPage,
    '/login': StudentLogin,
    '/waiting-room': WaitingRoom,
    '/queue': VirtualQueue,
    '/select-room': RoomSelection,
    '/confirmation': Confirmation,
    '/dashboard': StudentDashboard,
    '/admin': AdminDashboard
};

// SVG Icon Pack
const ICONS = {
    sun: `<svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 110 10 5 5 0 010-10zm0-5a1 1 0 011 1v2a1 1 0 01-2 0V3a1 1 0 011-1zm0 15a1 1 0 011 1v2a1 1 0 01-2 0v-2a1 1 0 011-1zM5.22 5.22a1 1 0 011.414 0l1.414 1.414a1 1 0 11-1.414 1.414L5.22 6.634a1 1 0 010-1.414zm10.606 10.606a1 1 0 011.414 0l1.414 1.414a1 1 0 01-1.414 1.414l-1.414-1.414a1 1 0 010-1.414zM2 12a1 1 0 011-1h2a1 1 0 010 2H3a1 1 0 01-1-1zm15 0a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1zM5.22 18.78a1 1 0 010-1.414l1.414-1.414a1 1 0 011.414 1.414l-1.414 1.414a1 1 0 01-1.414 0zm10.606-10.606a1 1 0 010-1.414l1.414-1.414a1 1 0 011.414 1.414l-1.414 1.414a1 1 0 01-1.414 0z"/></svg>`,
    moon: `<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 109 9 9.75 9.75 0 00-.67-3.4 6.75 6.75 0 01-7.93-7.93A9.75 9.75 0 0012 3z"/></svg>`,
    success: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    warning: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    danger: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    info: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
};

// Track notifications that have already popped up as Toast banners
let lastSeenToastId = null;

// Initialize App Configuration
function initApp() {
    setupTheme();
    setupRouting();
    setupMobileMenu();
    
    // Subscribe to store updates
    store.subscribe((state) => {
        handleStateUpdate(state);
    });

    // Run first render
    handleStateUpdate(store.state);
}

// Theme handling
function setupTheme() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const htmlEl = document.documentElement;

    const currentTheme = localStorage.getItem('theme') || 'dark';
    htmlEl.setAttribute('data-theme', currentTheme);
    toggleBtn.innerHTML = currentTheme === 'dark' ? ICONS.sun : ICONS.moon;

    toggleBtn.addEventListener('click', () => {
        const theme = htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        toggleBtn.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
    });
}

// Router management
function setupRouting() {
    window.addEventListener('hashchange', () => {
        const currentRoute = parseRoute();
        routeView(currentRoute);
    });
}

function parseRoute() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
}

function routeView(route) {
    const view = ROUTES[route] || LandingPage;
    const root = document.getElementById('app-root');

    // Route guards based on user session
    const currentUser = store.state.currentUser;
    const isLoggedStudent = currentUser && currentUser.type === 'student';
    const isLoggedAdmin = currentUser && currentUser.type === 'admin';

    // Route access restrictions
    if (route === '/queue' && (!isLoggedStudent || store.state.queue.isMyTurn)) {
        window.location.hash = '#/';
        return;
    }
    if (route === '/select-room' && (!isLoggedStudent || !store.state.queue.isMyTurn)) {
        window.location.hash = '#/';
        return;
    }
    if (route === '/dashboard' && !isLoggedStudent) {
        window.location.hash = '#/login';
        return;
    }
    if (route === '/confirmation' && (!isLoggedStudent || !store.getCurrentUserObject()?.bookedRoom)) {
        window.location.hash = '#/';
        return;
    }

    // Set active link style in navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        const routeAttr = link.getAttribute('data-route');
        if (route === '/' && routeAttr === 'landing') {
            link.classList.add('active');
        } else if (route === '/dashboard' && routeAttr === 'dashboard') {
            link.classList.add('active');
        } else if (route === '/admin' && routeAttr === 'admin') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Render HTML & bind event listeners
    root.innerHTML = view.render(store.state);
    view.afterRender(store.state);

    // Track active page title for accessibility
    const routeTitleMap = {
        '/': 'Home',
        '/login': 'Student Login',
        '/waiting-room': 'Waiting Lobby',
        '/queue': 'Virtual Queue Room',
        '/select-room': 'Room Booking Portal',
        '/confirmation': 'Booking Receipt',
        '/dashboard': 'Student Dashboard',
        '/admin': 'Admin Console'
    };
    document.title = `HostelQ - ${routeTitleMap[route] || 'Smart Hostel Booking'}`;
}

// Mobile responsive menu toggle
function setupMobileMenu() {
    const mobileBtn = document.getElementById('mobile-toggle');
    const menu = document.getElementById('nav-menu');

    mobileBtn.addEventListener('click', () => {
        menu.classList.toggle('open');
        mobileBtn.classList.toggle('active');
    });

    // Close menu when clicking link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('open');
            mobileBtn.classList.remove('active');
        });
    });
}

// Toast Alert System
function spawnToast(title, desc, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconSVG = ICONS[type] || ICONS.info;

    toast.innerHTML = `
        <div class="toast-icon">${iconSVG}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${desc}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Close button event
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'none';
        toast.offsetHeight; // reflow
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    });

    // Auto remove toast after 4.5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            toast.style.transition = 'all 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }
    }, 4500);
}

// Handle global pub-sub store updates
function handleStateUpdate(state) {
    const user = store.getCurrentUserObject();

    // 1. Update Navigation Bar options
    const studentDashLink = document.getElementById('student-dash-link');
    const authNavContainer = document.getElementById('auth-nav-container');

    if (user) {
        if (user.isAdmin) {
            studentDashLink.classList.add('hidden');
            authNavContainer.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.85rem; color:var(--text-secondary)">Warden Mode</span>
                    <button class="btn btn-secondary btn-sm" id="btn-nav-logout" style="padding: 6px 14px; font-size: 0.85rem;">Sign Out</button>
                </div>
            `;
        } else {
            // Logged student
            studentDashLink.classList.remove('hidden');
            authNavContainer.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.85rem; color:var(--text-secondary)">Hi, ${user.name.split(' ')[0]}</span>
                    <button class="btn btn-secondary btn-sm" id="btn-nav-logout" style="padding: 6px 14px; font-size: 0.85rem;">Sign Out</button>
                </div>
            `;
        }
        
        // Bind Nav logout click
        document.getElementById('btn-nav-logout').addEventListener('click', () => {
            store.logout();
            window.location.hash = '#/';
        });
    } else {
        studentDashLink.classList.add('hidden');
        authNavContainer.innerHTML = `
            <a href="#/login" class="btn btn-primary btn-sm" style="padding: 6px 14px; font-size: 0.85rem;">Student Sign In</a>
        `;
    }

    // 2. Trigger active notification toasts (only show ones we haven't seen yet)
    if (state.notifications.length > 0) {
        const latest = state.notifications[0];
        // Ensure we don't spam the toast on every single tick if it's already shown
        if (latest.id !== lastSeenToastId) {
            lastSeenToastId = latest.id;
            // Filter system reset or welcome logs to customize toast spawn if desired
            spawnToast(latest.title, latest.desc, latest.type);
        }
    }

    // 3. Perform routing evaluation or redirections (e.g. queue completes -> Selection)
    const currentRoute = parseRoute();
    
    // Redirect if student queue progress hits 0 while on /queue
    if (currentRoute === '/queue' && state.queue.isMyTurn) {
        window.location.hash = '#/select-room';
        return;
    }

    // Rerender the active page view
    routeView(currentRoute);
}

// Expose appRender globally so view components can trigger a redraw if local state updates
window.appRender = () => {
    routeView(parseRoute());
};

// Boot App
window.addEventListener('DOMContentLoaded', initApp);
