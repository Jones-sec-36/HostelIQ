/* -------------------------------------------------------------
 * HostelQ - Unified Application Core (Classic Script)
 * Resolves CORS limitations when running locally via file:// protocol
 * Contains Mock Data, State Store, Simulator, Components, & Router
 * ------------------------------------------------------------- */

// =============================================================
// 1. MOCK DATA DEFINITIONS
// =============================================================

const INITIAL_STUDENTS = [
    { regNo: "STU001", name: "Alex Mercer", password: "password", recommendedRoom: { block: "Block A", roomNo: "102" }, bookedRoom: null },
    { regNo: "STU002", name: "David Chen", password: "password", recommendedRoom: { block: "Block B", roomNo: "204" }, bookedRoom: null },
    { regNo: "STU003", name: "Sophia Martinez", password: "password", recommendedRoom: { block: "Block A", roomNo: "105" }, bookedRoom: null },
    { regNo: "STU004", name: "Emily Watson", password: "password", recommendedRoom: null, bookedRoom: null },
    { regNo: "STU005", name: "Liam O'Connor", password: "password", recommendedRoom: { block: "Block C", roomNo: "302" }, bookedRoom: null },
    { regNo: "STU006", name: "Priya Sharma", password: "password", recommendedRoom: { block: "Block B", roomNo: "201" }, bookedRoom: null },
    { regNo: "STU007", name: "James Anderson", password: "password", recommendedRoom: null, bookedRoom: null },
    { regNo: "STU008", name: "Zara Khan", password: "password", recommendedRoom: null, bookedRoom: null }
];

const INITIAL_ADMINS = [
    { username: "admin", password: "password" }
];

const ROOM_TYPES = {
    "4-in-1 AC": { name: "4-in-1 AC Room", beds: 4, ac: true, price: "$2,400 / yr" },
    "8-in-1 AC": { name: "8-in-1 AC Room", beds: 8, ac: true, price: "$1,800 / yr" },
    "10-in-1 AC": { name: "10-in-1 AC Room", beds: 10, ac: true, price: "$1,400 / yr" },
    "Non AC": { name: "Standard Non-AC Room", beds: 4, ac: false, price: "$1,100 / yr" }
};

function generateInitialRooms() {
    const blocks = ["Block A", "Block B", "Block C"];
    const rooms = [];

    blocks.forEach(block => {
        let roomConfigs = [];
        if (block === "Block A") {
            roomConfigs = [
                { roomNo: "101", type: "4-in-1 AC" },
                { roomNo: "102", type: "4-in-1 AC" },
                { roomNo: "103", type: "4-in-1 AC" },
                { roomNo: "104", type: "8-in-1 AC" },
                { roomNo: "105", type: "8-in-1 AC" }
            ];
        } else if (block === "Block B") {
            roomConfigs = [
                { roomNo: "201", type: "8-in-1 AC" },
                { roomNo: "202", type: "8-in-1 AC" },
                { roomNo: "203", type: "Non AC" },
                { roomNo: "204", type: "Non AC" },
                { roomNo: "205", type: "Non AC" }
            ];
        } else {
            roomConfigs = [
                { roomNo: "301", type: "10-in-1 AC" },
                { roomNo: "302", type: "10-in-1 AC" },
                { roomNo: "303", type: "10-in-1 AC" },
                { roomNo: "304", type: "Non AC" }
            ];
        }

        roomConfigs.forEach(cfg => {
            const typeInfo = ROOM_TYPES[cfg.type];
            const beds = [];
            for (let i = 1; i <= typeInfo.beds; i++) {
                let status = "available";
                let bookedBy = null;
                if (Math.random() < 0.25) {
                    status = "booked";
                    bookedBy = { regNo: `STU${100 + Math.floor(Math.random() * 500)}`, name: `Simulated Student ${i}` };
                }
                beds.push({
                    id: `${block}-${cfg.roomNo}-B${i}`,
                    bedNo: i,
                    status: status,
                    lockedBy: null,
                    lockExpires: null,
                    bookedBy: bookedBy
                });
            }
            rooms.push({
                id: `${block}-${cfg.roomNo}`,
                block: block,
                roomNo: cfg.roomNo,
                type: cfg.type,
                price: typeInfo.price,
                ac: typeInfo.ac,
                beds: beds
            });
        });
    });
    return rooms;
}


// =============================================================
// 2. STATE STORE & SIMULATION ENGINE
// =============================================================

class Store {
    constructor() {
        this.listeners = [];
        
        // Robust fallback initialization of Supabase client in case of loading race conditions
        if (!window.supabaseClient && window.supabase) {
            try {
                window.supabaseClient = window.supabase.createClient(
                    "https://dezldhinizayqzfrfsby.supabase.co",
                    "sb_publishable_lHxwO27ZOLoFcAjXkZyfNg_rqC83qGF"
                );
                console.log("Initialized Supabase Client directly in Store constructor.");
            } catch (e) {
                console.error("Failed to initialize Supabase Client inside Store:", e);
            }
        }

        this.db = window.supabaseClient;
        this.isDbMode = !!this.db;
        this.loadState();
        this.startBackgroundProcesses();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        if (!this.isDbMode) {
            this.saveState();
        }
        this.listeners.forEach(listener => listener(this.state));
    }

    loadState() {
        if (this.isDbMode) {
            this.initDbMode();
        }

        const saved = localStorage.getItem('hostelq_state');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
                return;
            } catch (e) {
                console.error("Failed to load state, resetting.", e);
            }
        }

        this.state = {
            students: [...INITIAL_STUDENTS],
            admins: [...INITIAL_ADMINS],
            rooms: generateInitialRooms(),
            currentUser: null,
            bookingWindow: {
                status: 'countdown', // closed, countdown, open
                countdownRemaining: 15,
                totalCountdown: 15
            },
            queue: {
                isInQueue: false,
                queueNumber: null,
                studentsAhead: null,
                totalAheadAtStart: null,
                estimatedWaitSec: null,
                isMyTurn: false,
                sessionExpiresAt: null,
                sessionTimeRemaining: null
            },
            activeLock: {
                roomId: null,
                bedId: null,
                lockedAt: null,
                expiresAt: null,
                timeRemaining: null
            },
            bookings: [],
            notifications: [
                { id: 1, title: "Welcome to HostelQ", desc: "The booking window starts in 15 seconds. Be ready to join the queue!", type: "info", timestamp: new Date().toLocaleTimeString() }
            ],
            simulationSpeed: 1,
            simulatedBookingCount: 124
        };
        this.saveState();
    }

    saveState() {
        localStorage.setItem('hostelq_state', JSON.stringify(this.state));
    }

    async initDbMode() {
        if (!this.db) return;
        
        console.log("Supabase Mode Active: Checking and bootstrapping data...");
        try {
            const { data: rooms, error } = await this.db.from('rooms').select('id').limit(1);
            if (error) {
                console.error("Supabase check error (likely tables don't exist):", error);
                this.isDbMode = false;
                this.addNotification("Supabase Error", "Failed to query Supabase rooms table. Falling back to local storage.", "danger");
                this.notify();
                return;
            }

            if (rooms.length === 0) {
                console.log("Supabase tables are empty. Seeding initial data...");
                await this.bootstrapDatabase();
            }

            await this.syncWithDatabase();
            setInterval(() => this.syncWithDatabase(), 2500);

        } catch (err) {
            console.error("Failed to initialize database mode:", err);
            this.isDbMode = false;
            this.notify();
        }
    }

    async bootstrapDatabase() {
        const studentInserts = INITIAL_STUDENTS.map(s => ({
            reg_no: s.regNo,
            name: s.name,
            password: s.password,
            recommended_room: s.recommendedRoom,
            booked_room: s.bookedRoom
        }));
        await this.db.from('students').insert(studentInserts);

        const adminInserts = INITIAL_ADMINS.map(a => ({
            username: a.username,
            password: a.password
        }));
        await this.db.from('admins').insert(adminInserts);

        const initialRooms = generateInitialRooms();
        const roomInserts = [];
        const bedInserts = [];

        initialRooms.forEach(r => {
            roomInserts.push({
                id: r.id,
                block: r.block,
                room_no: r.roomNo,
                type: r.type,
                price: r.price,
                ac: r.ac
            });

            r.beds.forEach(b => {
                bedInserts.push({
                    id: b.id,
                    room_id: r.id,
                    bed_no: b.bedNo,
                    status: b.status,
                    locked_by: b.lockedBy,
                    lock_expires: b.lockExpires,
                    booked_by_reg_no: b.bookedBy ? b.bookedBy.regNo : null,
                    booked_by_name: b.bookedBy ? b.bookedBy.name : null
                });
            });
        });

        await this.db.from('rooms').insert(roomInserts);
        await this.db.from('beds').insert(bedInserts);

        const settings = [
            { key: 'booking_window_status', value: 'countdown' },
            { key: 'booking_window_countdown_remaining', value: '15' },
            { key: 'booking_window_total_countdown', value: '15' },
            { key: 'simulation_speed', value: '1' },
            { key: 'simulated_booking_count', value: '124' }
        ];
        await this.db.from('system_settings').insert(settings);

        await this.db.from('notifications').insert({
            id: 'init-notif',
            title: "Welcome to HostelQ",
            desc: "The booking window starts in 15 seconds. Be ready to join the queue!",
            type: "info",
            timestamp: new Date().toLocaleTimeString()
        });

        console.log("Database successfully seeded!");
    }

    async syncWithDatabase() {
        if (!this.db) return;

        try {
            const { data: studentsData } = await this.db.from('students').select('*');
            if (studentsData) {
                this.state.students = studentsData.map(s => ({
                    regNo: s.reg_no,
                    name: s.name,
                    password: s.password,
                    recommendedRoom: s.recommended_room,
                    bookedRoom: s.booked_room
                }));
            }

            const { data: adminsData } = await this.db.from('admins').select('*');
            if (adminsData) {
                this.state.admins = adminsData.map(a => ({
                    username: a.username,
                    password: a.password
                }));
            }

            const { data: roomsData } = await this.db.from('rooms').select('*');
            const { data: bedsData } = await this.db.from('beds').select('*');

            if (roomsData && bedsData) {
                this.state.rooms = roomsData.map(r => {
                    const bedsForRoom = bedsData
                        .filter(b => b.room_id === r.id)
                        .map(b => ({
                            id: b.id,
                            bedNo: b.bed_no,
                            status: b.status,
                            lockedBy: b.locked_by,
                            lockExpires: b.lock_expires ? Number(b.lock_expires) : null,
                            bookedBy: b.booked_by_reg_no ? {
                                regNo: b.booked_by_reg_no,
                                name: b.booked_by_name
                            } : null
                        }))
                        .sort((a, b) => a.bedNo - b.bedNo);

                    return {
                        id: r.id,
                        block: r.block,
                        roomNo: r.room_no,
                        type: r.type,
                        price: r.price,
                        ac: r.ac,
                        beds: bedsForRoom
                    };
                });
            }

            const { data: settingsData } = await this.db.from('system_settings').select('*');
            if (settingsData) {
                const settingsMap = {};
                settingsData.forEach(item => {
                    settingsMap[item.key] = item.value;
                });

                if (settingsMap['booking_window_status']) {
                    this.state.bookingWindow.status = settingsMap['booking_window_status'];
                }
                if (settingsMap['booking_window_countdown_remaining']) {
                    this.state.bookingWindow.countdownRemaining = Number(settingsMap['booking_window_countdown_remaining']);
                }
                if (settingsMap['booking_window_total_countdown']) {
                    this.state.bookingWindow.totalCountdown = Number(settingsMap['booking_window_total_countdown']);
                }
                if (settingsMap['simulation_speed']) {
                    this.state.simulationSpeed = Number(settingsMap['simulation_speed']);
                }
                if (settingsMap['simulated_booking_count']) {
                    this.state.simulatedBookingCount = Number(settingsMap['simulated_booking_count']);
                }
            }

            const { data: bookingsData } = await this.db.from('bookings').select('*');
            if (bookingsData) {
                this.state.bookings = bookingsData.map(b => ({
                    id: b.id,
                    roomNo: b.room_no,
                    block: b.block,
                    type: b.type,
                    bedsBooked: b.beds_booked,
                    timestamp: b.timestamp
                }));
            }

            const { data: notificationsData } = await this.db.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
            if (notificationsData) {
                this.state.notifications = notificationsData.map(n => ({
                    id: n.id,
                    title: n.title,
                    desc: n.desc,
                    type: n.type,
                    timestamp: n.timestamp
                }));
            }

            const user = this.getCurrentUserObject();
            if (user && this.state.currentUser.type === 'student') {
                const { data: queueData } = await this.db.from('queue').select('*').eq('reg_no', user.regNo).maybeSingle();
                if (queueData) {
                    this.state.queue = {
                        isInQueue: true,
                        queueNumber: queueData.queue_number,
                        studentsAhead: queueData.students_ahead,
                        totalAheadAtStart: queueData.students_ahead,
                        estimatedWaitSec: queueData.estimated_wait_sec,
                        isMyTurn: queueData.is_my_turn,
                        sessionExpiresAt: queueData.session_expires_at ? Number(queueData.session_expires_at) : null,
                        sessionTimeRemaining: queueData.session_expires_at ? Math.max(0, Math.ceil((Number(queueData.session_expires_at) - Date.now()) / 1000)) : null
                    };
                } else {
                    this.state.queue = { isInQueue: false, queueNumber: null, studentsAhead: null, totalAheadAtStart: null, estimatedWaitSec: null, isMyTurn: false, sessionExpiresAt: null, sessionTimeRemaining: null };
                }

                if (bedsData) {
                    const lockedBed = bedsData.find(b => b.locked_by === user.regNo && b.status === 'reserved');
                    if (lockedBed) {
                        this.state.activeLock = {
                            roomId: lockedBed.room_id,
                            bedId: lockedBed.id,
                            lockedAt: Number(lockedBed.lock_expires) - 3 * 60 * 1000,
                            expiresAt: Number(lockedBed.lock_expires),
                            timeRemaining: Math.max(0, Math.ceil((Number(lockedBed.lock_expires) - Date.now()) / 1000))
                        };
                    } else {
                        this.state.activeLock = { roomId: null, bedId: null, lockedAt: null, expiresAt: null, timeRemaining: null };
                    }
                }
            } else {
                this.state.queue = { isInQueue: false, queueNumber: null, studentsAhead: null, totalAheadAtStart: null, estimatedWaitSec: null, isMyTurn: false, sessionExpiresAt: null, sessionTimeRemaining: null };
                this.state.activeLock = { roomId: null, bedId: null, lockedAt: null, expiresAt: null, timeRemaining: null };
            }

            if (user && this.state.currentUser.type === 'student') {
                const liveStudent = this.state.students.find(s => s.regNo === user.regNo);
                if (liveStudent && liveStudent.bookedRoom) {
                    if (this.state.queue.isMyTurn) {
                        this.state.queue.isMyTurn = false;
                        this.state.queue.isInQueue = false;
                    }
                }
            }

            this.notifyListenersOnly();
        } catch (err) {
            console.error("Error in syncWithDatabase:", err);
        }
    }

    notifyListenersOnly() {
        this.listeners.forEach(listener => listener(this.state));
    }

    async resetState() {
        if (this.isDbMode) {
            try {
                console.log("Resetting database state...");
                await this.db.from('queue').delete().neq('reg_no', '');
                await this.db.from('bookings').delete().neq('id', '');
                await this.db.from('notifications').delete().neq('id', '');
                
                await this.db.from('beds')
                    .update({
                        status: 'available',
                        locked_by: null,
                        lock_expires: null,
                        booked_by_reg_no: null,
                        booked_by_name: null
                    })
                    .neq('id', '');

                await this.db.from('students')
                    .update({ booked_room: null })
                    .neq('reg_no', '');

                await this.db.from('system_settings').update({ value: 'countdown' }).eq('key', 'booking_window_status');
                await this.db.from('system_settings').update({ value: '15' }).eq('key', 'booking_window_countdown_remaining');
                await this.db.from('system_settings').update({ value: '1' }).eq('key', 'simulation_speed');
                await this.db.from('system_settings').update({ value: '124' }).eq('key', 'simulated_booking_count');

                await this.addNotification("System Reset", "The system state has been successfully reset by admin.", "info");
                await this.syncWithDatabase();
            } catch (err) {
                console.error("Failed to reset database:", err);
            }
        } else {
            localStorage.removeItem('hostelq_state');
            this.loadState();
            this.addNotification("System Reset", "The system state has been successfully reset by admin.", "info");
            this.notify();
        }
    }

    async loginStudent(regNo, password) {
        if (this.isDbMode) {
            try {
                const { data, error } = await this.db.from('students')
                    .select('*')
                    .eq('reg_no', regNo.toUpperCase())
                    .maybeSingle();

                if (error || !data) {
                    return { success: false, error: "Invalid Register Number or Password" };
                }

                if (data.password !== password) {
                    return { success: false, error: "Invalid Register Number or Password" };
                }

                this.state.currentUser = { type: 'student', regNo: data.reg_no };
                await this.addNotification("Login Successful", `Welcome back, ${data.name}!`, "success");
                
                if (data.booked_room) {
                    await this.db.from('queue').delete().eq('reg_no', data.reg_no);
                }

                await this.syncWithDatabase();
                return { success: true };
            } catch (err) {
                console.error("Supabase login student error:", err);
                return { success: false, error: "Database error during login." };
            }
        }

        const student = this.state.students.find(s => s.regNo.toUpperCase() === regNo.toUpperCase() && s.password === password);
        if (student) {
            this.state.currentUser = { type: 'student', regNo: student.regNo };
            this.addNotification("Login Successful", `Welcome back, ${student.name}!`, "success");
            if (student.bookedRoom) {
                this.state.queue.isMyTurn = false;
                this.state.queue.isInQueue = false;
            }
            this.notify();
            return { success: true };
        }
        return { success: false, error: "Invalid Register Number or Password" };
    }

    async loginAdmin(username, password) {
        if (this.isDbMode) {
            try {
                const { data, error } = await this.db.from('admins')
                    .select('*')
                    .eq('username', username)
                    .maybeSingle();

                if (error || !data || data.password !== password) {
                    return { success: false, error: "Invalid Admin Credentials" };
                }

                this.state.currentUser = { type: 'admin', username: data.username };
                await this.addNotification("Admin Login", "Access granted to admin console.", "success");
                await this.syncWithDatabase();
                return { success: true };
            } catch (err) {
                console.error("Supabase admin login error:", err);
                return { success: false, error: "Database error during admin login." };
            }
        }

        const admin = this.state.admins.find(a => a.username === username && a.password === password);
        if (admin) {
            this.state.currentUser = { type: 'admin', username: admin.username };
            this.addNotification("Admin Login", "Access granted to admin console.", "success");
            this.notify();
            return { success: true };
        }
        return { success: false, error: "Invalid Admin Credentials" };
    }

    logout() {
        this.state.currentUser = null;
        this.notify();
    }

    getCurrentUserObject() {
        if (!this.state.currentUser) return null;
        if (this.state.currentUser.type === 'student') {
            return this.state.students.find(s => s.regNo === this.state.currentUser.regNo);
        }
        return { username: this.state.currentUser.username, isAdmin: true };
    }

    async joinQueue() {
        const user = this.getCurrentUserObject();
        if (!user || user.bookedRoom) return;
        if (this.state.bookingWindow.status !== 'open') {
            return { success: false, error: "Booking window is not open yet." };
        }
        if (this.state.queue.isInQueue) return;

        const queueNum = this.state.simulatedBookingCount + 1;
        const ahead = Math.floor(10 + Math.random() * 10);
        
        if (this.isDbMode) {
            try {
                const queueEntry = {
                    reg_no: user.regNo,
                    queue_number: queueNum,
                    students_ahead: ahead,
                    estimated_wait_sec: ahead * 8,
                    is_my_turn: false,
                    session_expires_at: null
                };
                
                await this.db.from('queue').insert(queueEntry);
                await this.db.from('system_settings').update({ value: String(queueNum) }).eq('key', 'simulated_booking_count');

                await this.addNotification("Queue Joined", `Your queue number is #${queueNum}. Est. wait time: ${Math.ceil((ahead * 8) / 60)} mins.`, "info");
                await this.syncWithDatabase();
            } catch (err) {
                console.error("Failed to join queue in Supabase:", err);
            }
        } else {
            this.state.queue = {
                isInQueue: true,
                queueNumber: queueNum,
                studentsAhead: ahead,
                totalAheadAtStart: ahead,
                estimatedWaitSec: ahead * 8,
                isMyTurn: false,
                sessionExpiresAt: null,
                sessionTimeRemaining: null
            };
            this.state.simulatedBookingCount++;
            this.addNotification("Queue Joined", `Your queue number is #${queueNum}. Est. wait time: ${Math.ceil(this.state.queue.estimatedWaitSec / 60)} mins.`, "info");
            this.notify();
        }
    }

    async lockBed(roomId, bedId) {
        const user = this.getCurrentUserObject();
        if (!user) return { success: false, error: "Not logged in" };

        if (this.isDbMode) {
            try {
                const { data: bed, error } = await this.db.from('beds')
                    .select('*')
                    .eq('id', bedId)
                    .single();

                if (error || !bed || bed.status !== 'available') {
                    return { success: false, error: "Bed is no longer available" };
                }

                await this.releaseActiveLock();

                const now = Date.now();
                const expires = now + 3 * 60 * 1000;

                const { error: updateError } = await this.db.from('beds')
                    .update({
                        status: 'reserved',
                        locked_by: user.regNo,
                        lock_expires: expires
                    })
                    .eq('id', bedId);

                if (updateError) {
                    return { success: false, error: "Failed to lock bed" };
                }

                await this.addNotification("Bed Locked", `Bed ${bed.bed_no} in Room ${roomId.split('-')[1] || roomId} is temporarily locked for 3 minutes.`, "warning");
                await this.syncWithDatabase();
                return { success: true };
            } catch (err) {
                console.error("Lock bed database error:", err);
                return { success: false, error: "Database error locking bed" };
            }
        }

        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room) return { success: false };
        const bed = room.beds.find(b => b.id === bedId);
        if (!bed || bed.status !== 'available') return { success: false, error: "Bed is no longer available" };

        this.releaseActiveLock();

        const now = Date.now();
        const expires = now + 3 * 60 * 1000;

        bed.status = 'reserved';
        bed.lockedBy = user.regNo;
        bed.lockExpires = expires;

        this.state.activeLock = {
            roomId: roomId,
            bedId: bedId,
            lockedAt: now,
            expiresAt: expires,
            timeRemaining: 180
        };

        this.addNotification("Bed Locked", `Bed ${bed.bedNo} in Room ${room.roomNo} is temporarily locked for 3 minutes.`, "warning");
        this.notify();
        return { success: true };
    }

    async releaseActiveLock() {
        const user = this.getCurrentUserObject();
        if (!user) return;

        if (this.isDbMode) {
            try {
                await this.db.from('beds')
                    .update({
                        status: 'available',
                        locked_by: null,
                        lock_expires: null
                    })
                    .eq('locked_by', user.regNo)
                    .eq('status', 'reserved');
                await this.syncWithDatabase();
            } catch (err) {
                console.error("Release lock database error:", err);
            }
            return;
        }

        if (!this.state.activeLock.roomId) return;
        const { roomId, bedId } = this.state.activeLock;
        const room = this.state.rooms.find(r => r.id === roomId);
        if (room) {
            const bed = room.beds.find(b => b.id === bedId);
            if (bed && bed.status === 'reserved' && bed.lockedBy === this.state.currentUser.regNo) {
                bed.status = 'available';
                bed.lockedBy = null;
                bed.lockExpires = null;
            }
        }
        this.state.activeLock = { roomId: null, bedId: null, lockedAt: null, expiresAt: null, timeRemaining: null };
    }

    async confirmBooking(roomId, bedId, groupRegNos = []) {
        const user = this.getCurrentUserObject();
        if (!user || user.bookedRoom) return { success: false, error: "Already booked or not authenticated" };

        const bookingRegs = [user.regNo, ...groupRegNos].map(r => r.toUpperCase());

        if (this.isDbMode) {
            try {
                const { data: room } = await this.db.from('rooms').select('*').eq('id', roomId).single();
                const { data: beds } = await this.db.from('beds').select('*').eq('room_id', roomId);

                if (!room || !beds) return { success: false, error: "Room or beds not found" };

                const bed = beds.find(b => b.id === bedId);
                if (!bed) return { success: false, error: "Bed not found" };

                if (bed.status === 'reserved' && bed.locked_by !== user.regNo) {
                    return { success: false, error: "Bed is locked by another student" };
                }
                if (bed.status === 'booked') {
                    return { success: false, error: "Bed is already booked" };
                }

                if (groupRegNos.length > 0) {
                    const availableBeds = beds.filter(b => b.status === 'available' || (b.status === 'reserved' && b.locked_by === user.regNo));
                    if (bookingRegs.length > availableBeds.length) {
                        return { success: false, error: `Not enough available beds in Room ${room.room_no} for group size ${bookingRegs.length}` };
                    }

                    for (let friendReg of groupRegNos) {
                        const { data: friend } = await this.db.from('students').select('*').eq('reg_no', friendReg.toUpperCase()).maybeSingle();
                        if (!friend) {
                            return { success: false, error: `Student ${friendReg} not found in database.` };
                        }
                        if (friend.booked_room) {
                            return { success: false, error: `Student ${friend.name} (${friendReg}) has already booked a room.` };
                        }
                    }
                }

                const bookedBeds = [{ bedNo: bed.bed_no, regNo: user.regNo, name: user.name }];
                await this.db.from('beds')
                    .update({
                        status: 'booked',
                        locked_by: null,
                        lock_expires: null,
                        booked_by_reg_no: user.regNo,
                        booked_by_name: user.name
                    })
                    .eq('id', bedId);

                if (groupRegNos.length > 0) {
                    let friendIndex = 0;
                    for (let b of beds) {
                        if (friendIndex < groupRegNos.length && b.status === 'available' && b.id !== bedId) {
                            const friendReg = groupRegNos[friendIndex];
                            const { data: friend } = await this.db.from('students').select('*').eq('reg_no', friendReg.toUpperCase()).single();
                            
                            await this.db.from('beds')
                                .update({
                                    status: 'booked',
                                    booked_by_reg_no: friend.reg_no,
                                    booked_by_name: friend.name
                                })
                                .eq('id', b.id);

                            bookedBeds.push({ bedNo: b.bed_no, regNo: friend.reg_no, name: friend.name });
                            friendIndex++;
                        }
                    }
                }

                const mainBooking = {
                    id: `BK-${Date.now()}`,
                    room_no: room.room_no,
                    block: room.block,
                    type: room.type,
                    beds_booked: bookedBeds,
                    timestamp: new Date().toLocaleString()
                };
                await this.db.from('bookings').insert(mainBooking);

                const { data: updatedBeds } = await this.db.from('beds').select('*').eq('room_id', roomId).eq('status', 'booked');
                const roomBookings = updatedBeds.map(ub => ({
                    name: ub.booked_by_name,
                    regNo: ub.booked_by_reg_no,
                    bedNo: ub.bed_no
                }));

                for (let rb of roomBookings) {
                    const roommates = roomBookings.filter(r => r.regNo !== rb.regNo);
                    const receipt = {
                        block: room.block,
                        roomNo: room.room_no,
                        bedNo: rb.bedNo,
                        type: room.type,
                        price: room.price,
                        timestamp: new Date().toLocaleString(),
                        receiptNo: "HQ-" + Math.floor(100000 + Math.random() * 900000),
                        roommates: roommates
                    };
                    await this.db.from('students').update({ booked_room: receipt }).eq('reg_no', rb.regNo);
                }

                await this.db.from('queue').delete().eq('reg_no', user.regNo);

                await this.addNotification("Booking Confirmed", `Successfully booked Room ${room.room_no} (${room.block})!`, "success");
                await this.syncWithDatabase();

                return { success: true, booking: {
                    id: mainBooking.id,
                    roomNo: mainBooking.room_no,
                    block: mainBooking.block,
                    type: mainBooking.type,
                    bedsBooked: mainBooking.beds_booked,
                    timestamp: mainBooking.timestamp
                }};

            } catch (err) {
                console.error("Database confirm booking error:", err);
                return { success: false, error: "Database error during booking confirmation." };
            }
        }

        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room) return { success: false, error: "Room not found" };

        const bed = room.beds.find(b => b.id === bedId);
        if (!bed) return { success: false, error: "Bed not found" };

        if (bed.status === 'reserved' && bed.lockedBy !== user.regNo) {
            return { success: false, error: "Bed is locked by another student" };
        }
        if (bed.status === 'booked') {
            return { success: false, error: "Bed is already booked" };
        }

        if (groupRegNos.length > 0) {
            const availableBedsCount = room.beds.filter(b => b.status === 'available' || (b.status === 'reserved' && b.lockedBy === user.regNo)).length;
            if (bookingRegs.length > availableBedsCount) {
                return { success: false, error: `Not enough available beds in Room ${room.roomNo} for group size ${bookingRegs.length}` };
            }

            for (let friendReg of groupRegNos) {
                const friend = this.state.students.find(s => s.regNo.toUpperCase() === friendReg.toUpperCase());
                if (!friend) {
                    return { success: false, error: `Student ${friendReg} not found in database.` };
                }
                if (friend.bookedRoom) {
                    return { success: false, error: `Student ${friend.name} (${friendReg}) has already booked a room.` };
                }
            }
        }

        const bookedBeds = [];
        bed.status = 'booked';
        bed.lockedBy = null;
        bed.lockExpires = null;
        bed.bookedBy = { regNo: user.regNo, name: user.name };
        bookedBeds.push({ bedNo: bed.bedNo, regNo: user.regNo, name: user.name });

        user.bookedRoom = {
            block: room.block,
            roomNo: room.roomNo,
            bedNo: bed.bedNo,
            type: room.type,
            price: room.price,
            timestamp: new Date().toLocaleString(),
            receiptNo: "HQ-" + Math.floor(100000 + Math.random() * 900000),
            roommates: []
        };

        if (groupRegNos.length > 0) {
            let friendIndex = 0;
            room.beds.forEach(b => {
                if (friendIndex < groupRegNos.length && b.status === 'available') {
                    const friendReg = groupRegNos[friendIndex];
                    const friend = this.state.students.find(s => s.regNo.toUpperCase() === friendReg.toUpperCase());
                    
                    b.status = 'booked';
                    b.bookedBy = { regNo: friend.regNo, name: friend.name };
                    bookedBeds.push({ bedNo: b.bedNo, regNo: friend.regNo, name: friend.name });

                    friend.bookedRoom = {
                        block: room.block,
                        roomNo: room.roomNo,
                        bedNo: b.bedNo,
                        type: room.type,
                        price: room.price,
                        timestamp: new Date().toLocaleString(),
                        receiptNo: "HQ-" + Math.floor(100000 + Math.random() * 900000),
                        roommates: []
                    };
                    friendIndex++;
                }
            });
        }

        const currentRoomBookings = room.beds.filter(b => b.status === 'booked').map(b => ({
            name: b.bookedBy.name,
            regNo: b.bookedBy.regNo,
            bedNo: b.bedNo
        }));

        currentRoomBookings.forEach(rm => {
            const studentObj = this.state.students.find(s => s.regNo === rm.regNo);
            if (studentObj && studentObj.bookedRoom) {
                studentObj.bookedRoom.roommates = currentRoomBookings.filter(r => r.regNo !== rm.regNo);
            }
        });

        const mainBooking = {
            id: `BK-${Date.now()}`,
            roomNo: room.roomNo,
            block: room.block,
            type: room.type,
            bedsBooked: bookedBeds,
            timestamp: new Date().toLocaleString()
        };
        this.state.bookings.push(mainBooking);

        this.state.queue = { isInQueue: false, queueNumber: null, studentsAhead: null, totalAheadAtStart: null, estimatedWaitSec: null, isMyTurn: false, sessionExpiresAt: null, sessionTimeRemaining: null };
        this.state.activeLock = { roomId: null, bedId: null, lockedAt: null, expiresAt: null, timeRemaining: null };

        this.addNotification("Booking Confirmed", `Successfully booked Room ${room.roomNo} (${room.block})!`, "success");
        this.notify();
        return { success: true, booking: mainBooking };
    }

    addNotification(title, desc, type = "info") {
        const id = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const timestamp = new Date().toLocaleTimeString();

        this.state.notifications.unshift({
            id: id,
            title: title,
            desc: desc,
            type: type,
            timestamp: timestamp
        });
        if (this.state.notifications.length > 50) {
            this.state.notifications.pop();
        }

        if (this.isDbMode) {
            this.db.from('notifications').insert({
                id: id,
                title: title,
                desc: desc,
                type: type,
                timestamp: timestamp
            }).then(({ error }) => {
                if (error) console.error("Error inserting notification:", error);
            });
        } else {
            this.notify();
        }
    }

    async setBookingWindowStatus(status) {
        if (this.isDbMode) {
            try {
                let countdownRemaining = status === 'countdown' ? 15 : 0;
                await this.db.from('system_settings').update({ value: status }).eq('key', 'booking_window_status');
                await this.db.from('system_settings').update({ value: String(countdownRemaining) }).eq('key', 'booking_window_countdown_remaining');

                if (status === 'open') {
                    await this.addNotification("Window Opened", "The room booking window is now open! Please click Join Queue.", "success");
                } else if (status === 'countdown') {
                    await this.addNotification("Window Countdown", "The booking window countdown is active.", "info");
                } else {
                    await this.addNotification("Window Closed", "The booking window is closed by admin.", "danger");
                }
                await this.syncWithDatabase();
            } catch (err) {
                console.error("Error setting window status in database:", err);
            }
        } else {
            this.state.bookingWindow.status = status;
            if (status === 'open') {
                this.state.bookingWindow.countdownRemaining = 0;
                this.addNotification("Window Opened", "The room booking window is now open! Please click Join Queue.", "success");
            } else if (status === 'countdown') {
                this.state.bookingWindow.countdownRemaining = 15;
                this.addNotification("Window Countdown", "The booking window countdown is active.", "info");
            } else {
                this.addNotification("Window Closed", "The booking window is closed by admin.", "danger");
            }
            this.notify();
        }
    }

    async setSimulationSpeed(speed) {
        if (this.isDbMode) {
            try {
                await this.db.from('system_settings').update({ value: String(speed) }).eq('key', 'simulation_speed');
                await this.addNotification("Simulation Speed Updated", `Simulator speed set to ${speed}x.`, "info");
                await this.syncWithDatabase();
            } catch (err) {
                console.error("Error setting simulation speed in database:", err);
            }
        } else {
            this.state.simulationSpeed = Number(speed);
            this.addNotification("Simulation Speed Updated", `Simulator speed set to ${speed}x.`, "info");
            this.notify();
        }
    }

    // Bulk import students from parsed CSV data
    async importStudents(studentRows) {
        if (!this.isDbMode) {
            // Local mode fallback
            let addedCount = 0;
            let skippedCount = 0;
            for (const row of studentRows) {
                const existing = this.state.students.find(s => s.regNo.toUpperCase() === row.regNo.toUpperCase());
                if (existing) {
                    skippedCount++;
                    continue;
                }
                this.state.students.push({
                    regNo: row.regNo,
                    name: row.name,
                    password: row.password,
                    recommendedRoom: null,
                    bookedRoom: null
                });
                addedCount++;
            }
            this.addNotification("Import Complete", `Added ${addedCount} students. Skipped ${skippedCount} duplicates.`, "success");
            this.notify();
            return { addedCount, skippedCount };
        }

        let addedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const row of studentRows) {
            try {
                const insertData = {
                    reg_no: row.regNo.toUpperCase().trim(),
                    name: row.name.trim(),
                    password: row.password.trim(),
                    recommended_room: null,
                    booked_room: null
                };
                // Add optional fields if present
                if (row.department) insertData.department = row.department.trim();
                if (row.year) insertData.year = String(row.year).trim();

                const { error } = await this.db.from('students')
                    .upsert(insertData, { onConflict: 'reg_no', ignoreDuplicates: false });

                if (error) {
                    console.error(`Error importing ${row.regNo}:`, error);
                    errorCount++;
                } else {
                    addedCount++;
                }
            } catch (err) {
                console.error(`Exception importing ${row.regNo}:`, err);
                errorCount++;
            }
        }

        await this.addNotification(
            "Student Import Complete",
            `Successfully imported/updated ${addedCount} students. ${skippedCount} skipped. ${errorCount} errors.`,
            errorCount > 0 ? "warning" : "success"
        );
        await this.syncWithDatabase();
        return { addedCount, skippedCount, errorCount };
    }

    startBackgroundProcesses() {
        setInterval(async () => {
            if (this.state.simulationSpeed === 0) return;

            let stateChanged = false;
            const speed = this.state.simulationSpeed;
            const user = this.getCurrentUserObject();

            if (this.isDbMode) {
                try {
                    if (user && user.isAdmin && this.state.bookingWindow.status === 'countdown') {
                        const newCountdown = Math.max(0, this.state.bookingWindow.countdownRemaining - 1);
                        await this.db.from('system_settings').update({ value: String(newCountdown) }).eq('key', 'booking_window_countdown_remaining');
                        
                        if (newCountdown <= 0) {
                            await this.db.from('system_settings').update({ value: 'open' }).eq('key', 'booking_window_status');
                            await this.addNotification("Booking Window Open", "Official hostel room bookings have commenced! Click 'Join Queue' now.", "success");
                        }
                    }

                    if (user && !user.isAdmin && this.state.queue.isInQueue && !this.state.queue.isMyTurn) {
                        const drop = Math.floor(Math.random() * speed) + 1;
                        const newAhead = Math.max(0, this.state.queue.studentsAhead - drop);
                        const newWait = newAhead * 8;

                        if (newAhead <= 0) {
                            const sessionExpires = Date.now() + 5 * 60 * 1000;
                            await this.db.from('queue').update({
                                students_ahead: 0,
                                estimated_wait_sec: 0,
                                is_my_turn: true,
                                session_expires_at: sessionExpires
                            }).eq('reg_no', user.regNo);

                            await this.addNotification("Your Turn!", "Your session has started! You have 5 minutes to select a room.", "success");
                        } else {
                            await this.db.from('queue').update({
                                students_ahead: newAhead,
                                estimated_wait_sec: newWait
                            }).eq('reg_no', user.regNo);
                        }
                    }

                    if (user && !user.isAdmin && this.state.queue.isMyTurn && this.state.queue.sessionExpiresAt) {
                        const diff = Math.max(0, Math.ceil((this.state.queue.sessionExpiresAt - Date.now()) / 1000));
                        if (diff <= 0) {
                            await this.releaseActiveLock();
                            await this.db.from('queue').delete().eq('reg_no', user.regNo);
                            await this.addNotification("Session Expired", "Your 5-minute booking window has expired. You have been removed from the queue.", "danger");
                        }
                    }

                    if (user && !user.isAdmin && this.state.activeLock.roomId && this.state.activeLock.expiresAt) {
                        const diff = Math.max(0, Math.ceil((this.state.activeLock.expiresAt - Date.now()) / 1000));
                        if (diff <= 0) {
                            await this.releaseActiveLock();
                            await this.addNotification("Room Lock Released", "Your 3-minute temporary room lock has expired.", "danger");
                        }
                    }

                    if (user && user.isAdmin) {
                        const { data: expiredBeds } = await this.db.from('beds')
                            .select('*')
                            .eq('status', 'reserved')
                            .lt('lock_expires', Date.now());

                        if (expiredBeds && expiredBeds.length > 0) {
                            for (let eb of expiredBeds) {
                                await this.db.from('beds').update({
                                    status: 'available',
                                    locked_by: null,
                                    lock_expires: null
                                }).eq('id', eb.id);
                            }
                        }
                    }

                } catch (err) {
                    console.error("Error in background DB process:", err);
                }
            } else {
                if (this.state.bookingWindow.status === 'countdown') {
                    this.state.bookingWindow.countdownRemaining -= 1;
                    if (this.state.bookingWindow.countdownRemaining <= 0) {
                        this.state.bookingWindow.status = 'open';
                        this.state.bookingWindow.countdownRemaining = 0;
                        this.addNotification("Booking Window Open", "Official hostel room bookings have commenced! Click 'Join Queue' now.", "success");
                    }
                    stateChanged = true;
                }

                if (this.state.queue.isInQueue && !this.state.queue.isMyTurn) {
                    const drop = Math.floor(Math.random() * speed) + 1;
                    if (this.state.queue.studentsAhead > 0) {
                        this.state.queue.studentsAhead = Math.max(0, this.state.queue.studentsAhead - drop);
                        this.state.queue.estimatedWaitSec = this.state.queue.studentsAhead * 8;
                    }
                    if (this.state.queue.studentsAhead <= 0) {
                        this.state.queue.isMyTurn = true;
                        this.state.queue.studentsAhead = 0;
                        this.state.queue.estimatedWaitSec = 0;
                        
                        const expires = Date.now() + 5 * 60 * 1000;
                        this.state.queue.sessionExpiresAt = expires;
                        this.state.queue.sessionTimeRemaining = 300;
                        this.addNotification("Your Turn!", "Your session has started! You have 5 minutes to select a room.", "success");
                    }
                    stateChanged = true;
                }

                if (this.state.queue.isMyTurn && this.state.queue.sessionExpiresAt) {
                    const diff = Math.max(0, Math.ceil((this.state.queue.sessionExpiresAt - Date.now()) / 1000));
                    this.state.queue.sessionTimeRemaining = diff;
                    if (diff <= 0) {
                        this.releaseActiveLock();
                        this.state.queue = { isInQueue: false, queueNumber: null, studentsAhead: null, totalAheadAtStart: null, estimatedWaitSec: null, isMyTurn: false, sessionExpiresAt: null, sessionTimeRemaining: null };
                        this.addNotification("Session Expired", "Your 5-minute booking window has expired. You have been removed from the queue.", "danger");
                    }
                    stateChanged = true;
                }

                if (this.state.activeLock.roomId && this.state.activeLock.expiresAt) {
                    const diff = Math.max(0, Math.ceil((this.state.activeLock.expiresAt - Date.now()) / 1000));
                    this.state.activeLock.timeRemaining = diff;
                    if (diff <= 0) {
                        this.releaseActiveLock();
                        this.addNotification("Room Lock Released", "Your 3-minute temporary room lock has expired.", "danger");
                    }
                    stateChanged = true;
                }

                this.state.rooms.forEach(room => {
                    room.beds.forEach(bed => {
                        if (bed.status === 'reserved' && bed.lockedBy !== this.state.currentUser?.regNo) {
                            if (bed.lockExpires && bed.lockExpires < Date.now()) {
                                bed.status = 'available';
                                bed.lockedBy = null;
                                bed.lockExpires = null;
                                stateChanged = true;
                            }
                        }
                    });
                });

                if (stateChanged) {
                    this.notify();
                }
            }
        }, 1000);
    }
}

const store = new Store();


// =============================================================
// 3. COMPONENT VIEW RENDERING DICTIONARY
// =============================================================

const LandingPage = {
    render(state) {
        const isLoggedStudent = state.currentUser && state.currentUser.type === 'student';
        const targetStudentLink = isLoggedStudent ? '#/dashboard' : '#/login';

        return `
            <div class="landing-container">
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
                            <div class="stacked-card card-back-2">
                                <div class="card-front-header">
                                    <span style="font-weight:700">Block C - Room 301</span>
                                    <span class="badge badge-danger">10-in-1 AC</span>
                                </div>
                                <div style="display:flex; gap:10px; opacity:0.3">
                                    <div style="width:20px; height:20px; background:red; border-radius:4px"></div>
                                    <div style="width:20px; height:20px; background:red; border-radius:4px"></div>
                                </div>
                            </div>
                            <div class="stacked-card card-back-1">
                                <div class="card-front-header">
                                    <span style="font-weight:700">Block B - Room 204</span>
                                    <span class="badge badge-warning">Non AC</span>
                                </div>
                                <div style="display:flex; gap:10px; opacity:0.6">
                                    <div style="width:20px; height:20px; background:green; border-radius:4px"></div>
                                    <div style="width:20px; height:20px; background:orange; border-radius:4px"></div>
                                </div>
                            </div>
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
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

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
            </div>
        `;
    },
    afterRender(state) {}
};

const StudentLogin = {
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
                        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">Sign In</button>
                    </form>
                    <div class="demo-credentials-box">
                        <div class="demo-title">Demo Accounts (Click to login)</div>
                        <div class="demo-account-list">
                            <div class="demo-account-item">
                                <span>Alex Mercer (Block A Recommended)</span>
                                <span class="demo-badge-click" data-reg="STU001">STU001</span>
                            </div>
                            <div class="demo-account-item">
                                <span>David Chen (Block B Recommended)</span>
                                <span class="demo-badge-click" data-reg="STU002">STU002</span>
                            </div>
                            <div class="demo-account-item">
                                <span>Sophia Martinez (Block A Recommended)</span>
                                <span class="demo-badge-click" data-reg="STU003">STU003</span>
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

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            errDiv.style.display = 'none';
            const regNo = regInput.value.trim();
            const password = passInput.value;

            const res = store.loginStudent(regNo, password);
            if (res.success) {
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

        document.querySelectorAll('.demo-badge-click').forEach(badge => {
            badge.addEventListener('click', (e) => {
                const reg = e.target.getAttribute('data-reg');
                regInput.value = reg;
                passInput.value = 'password';
                form.requestSubmit();
            });
        });
    }
};

const WaitingRoom = {
    render(state) {
        const user = store.getCurrentUserObject();
        if (!user) return `<div class="loading-spinner-container"><p>Loading...</p></div>`;

        const windowState = state.bookingWindow;
        let countdownHTML = '';
        let subtitleHTML = '';
        let buttonHTML = '';

        if (windowState.status === 'closed') {
            countdownHTML = `<div class="countdown-number" style="color:var(--color-danger)">CLOSED</div>`;
            subtitleHTML = `<p style="margin-top:14px; color:var(--text-secondary)">The hostel room booking window is currently closed. Please wait for the admin to open it.</p>`;
            buttonHTML = `<button class="btn btn-secondary" disabled>Join Virtual Queue</button>`;
        } else if (windowState.status === 'countdown') {
            countdownHTML = `
                <div class="countdown-pulse"></div>
                <div class="countdown-number">${windowState.countdownRemaining}</div>
                <div class="countdown-label">Seconds</div>
            `;
            subtitleHTML = `<p style="margin-top:14px; color:var(--text-secondary)">The room booking window opens shortly. The 'Join Queue' button will activate automatically.</p>`;
            buttonHTML = `<button class="btn btn-primary" disabled>Join Virtual Queue</button>`;
        } else {
            countdownHTML = `<div class="countdown-number" style="color:var(--color-success)">OPEN</div>`;
            subtitleHTML = `<p style="margin-top:14px; color:var(--color-success); font-weight: 500;">Official room bookings have commenced! Click below to secure your spot.</p>`;
            buttonHTML = `<button class="btn btn-primary btn-lg" id="btn-join-queue-active">Join Virtual Queue Now</button>`;
        }

        return `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="glass-card queue-panel">
                    <div style="margin-bottom: 24px;">
                        <span class="badge badge-info">Waiting Room</span>
                    </div>
                    <h2 style="font-family:'Outfit', sans-serif; font-size:2rem; font-weight:700; margin-bottom:24px;">Hostel Room Allocation Lobby</h2>
                    <div class="countdown-visual">${countdownHTML}</div>
                    <div style="max-width:540px; margin: 0 auto 30px;">${subtitleHTML}</div>
                    <div id="join-btn-container">${buttonHTML}</div>
                    <div style="margin-top: 30px; font-size: 0.85rem; color: var(--text-muted);">
                        Logged in as: <strong style="color:var(--text-primary)">${user.name} (${user.regNo})</strong>
                    </div>
                </div>
            </div>
        `;
    },
    afterRender(state) {
        const joinBtn = document.getElementById('btn-join-queue-active');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                store.joinQueue();
                window.location.hash = '#/queue';
            });
        }
    }
};

const VirtualQueue = {
    render(state) {
        const user = store.getCurrentUserObject();
        if (!user) return `<div class="loading-spinner-container"><p>Loading session...</p></div>`;

        const queue = state.queue;
        if (!queue.isInQueue) {
            if (user.bookedRoom) {
                setTimeout(() => window.location.hash = '#/dashboard', 10);
            } else {
                setTimeout(() => window.location.hash = '#/waiting-room', 10);
            }
            return `<div class="loading-spinner-container"><p>Redirecting...</p></div>`;
        }

        if (queue.isMyTurn) {
            setTimeout(() => window.location.hash = '#/select-room', 10);
            return `<div class="loading-spinner-container"><p>Your turn! Redirecting...</p></div>`;
        }

        const ahead = queue.studentsAhead;
        const total = queue.totalAheadAtStart || 1;
        const progressPercent = Math.max(5, Math.round(((total - ahead) / total) * 100));
        const min = Math.floor(queue.estimatedWaitSec / 60);
        const sec = queue.estimatedWaitSec % 60;
        const waitStr = min > 0 ? `${min}m ${sec}s` : `${sec}s`;

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
                    <h2 style="font-family:'Outfit', sans-serif; font-size:2rem; font-weight:700; margin-bottom:8px;">Securing your booking session</h2>
                    <p style="color:var(--text-secondary); max-width:560px; margin: 0 auto 30px;">
                        Please do not close this tab. You will be forwarded to Room Selection when your turn arrives.
                    </p>
                    <div class="queue-dashboard-grid">
                        <div class="queue-stat-card">
                            <div class="queue-stat-num">#${queue.queueNumber}</div>
                            <div class="queue-stat-lbl">Your Queue Spot</div>
                        </div>
                        <div class="queue-stat-card" style="border-color: rgba(59, 130, 246, 0.2)">
                            <div class="queue-stat-num" style="color:var(--color-accent)">${ahead}</div>
                            <div class="queue-stat-lbl">Students Ahead</div>
                        </div>
                        <div class="queue-stat-card">
                            <div class="queue-stat-num">${waitStr}</div>
                            <div class="queue-stat-lbl">Est. Waiting Time</div>
                        </div>
                    </div>
                    <div class="live-bar-container">
                        <div class="live-bar-meta">
                            <span>Queue Progress</span>
                            <span>${progressPercent}%</span>
                        </div>
                        <div class="live-bar-bg">
                            <div class="live-bar-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                    <div class="live-ticker-container">
                        <div class="live-ticker-title">
                            <span class="live-dot"></span>
                            <span>Live Allocation Ticker</span>
                        </div>
                        <div class="ticker-list">${feedItems}</div>
                    </div>
                </div>
            </div>
        `;
    },
    afterRender(state) {}
};

const RoomSelection = {
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
        if (!user) return `<div class="loading-spinner-container"><p>Loading...</p></div>`;

        if (!state.queue.isMyTurn) {
            if (user.bookedRoom) {
                setTimeout(() => window.location.hash = '#/dashboard', 10);
            } else {
                setTimeout(() => window.location.hash = '#/waiting-room', 10);
            }
            return `<div class="loading-spinner-container"><p>Redirecting...</p></div>`;
        }

        const sessionSec = state.queue.sessionTimeRemaining || 300;
        const sMin = Math.floor(sessionSec / 60);
        const sSec = sessionSec % 60;
        const timeStr = `${String(sMin).padStart(2, '0')}:${String(sSec).padStart(2, '0')}`;
        const timerUrgent = sessionSec < 60;

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

        const filteredRooms = state.rooms.filter(room => {
            if (this.localState.selectedBlock !== "All" && room.block !== this.localState.selectedBlock) return false;
            if (!this.localState.selectedTypes[room.type]) return false;
            if (this.localState.searchQuery) {
                const query = this.localState.searchQuery.toLowerCase();
                const matchRoom = room.roomNo.toLowerCase().includes(query);
                const matchBlock = room.block.toLowerCase().includes(query);
                if (!matchRoom && !matchBlock) return false;
            }
            return true;
        });

        const blocks = ["All", "Block A", "Block B", "Block C"];
        const blockTabsHTML = blocks.map(b => `
            <button class="block-tab ${this.localState.selectedBlock === b ? 'active' : ''}" data-block="${b}">${b}</button>
        `).join('');

        let roomsHTML = '';
        if (filteredRooms.length === 0) {
            roomsHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                    <h3>No rooms match your active search filters</h3>
                </div>
            `;
        } else {
            roomsHTML = filteredRooms.map(room => {
                const totalBeds = room.beds.length;
                const availableBeds = room.beds.filter(b => b.status === 'available').length;
                let cardBorderClass = availableBeds === 0 ? 'border-danger' : (availableBeds <= 2 ? 'border-warning' : 'border-success');
                let statusBadge = availableBeds === 0 ? '<span class="badge badge-danger">Fully Booked</span>' : `<span class="badge badge-success">${availableBeds} Vacant</span>`;
                const bedDots = room.beds.map(bed => {
                    let dotClass = bed.status;
                    return `<span class="bed-dot ${dotClass}"></span>`;
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
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--color-accent);">${room.price}</div>
                        <div style="border-top:1px solid var(--border-color); padding-top:12px;">
                            <div class="room-beds-layout">${bedDots}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        let drawerHTML = '';
        if (this.localState.selectedRoomId) {
            const activeRoom = state.rooms.find(r => r.id === this.localState.selectedRoomId);
            if (activeRoom) {
                const availableBeds = activeRoom.beds.filter(b => b.status === 'available' || (b.status === 'reserved' && b.lockedBy === user.regNo));
                const currentStudentLock = state.activeLock.roomId === activeRoom.id ? state.activeLock : null;

                const bedButtonsHTML = activeRoom.beds.map(bed => {
                    let bedClass = bed.status;
                    let iconSVG = '';
                    let statusLabel = 'Available';

                    if (bed.status === 'booked') {
                        statusLabel = `Booked (${bed.bookedBy.regNo})`;
                        iconSVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`;
                    } else if (bed.status === 'reserved') {
                        if (bed.lockedBy === user.regNo) {
                            bedClass += ' selected';
                            statusLabel = 'Your Temporary Lock';
                            iconSVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>`;
                        } else {
                            statusLabel = 'Locked by student';
                            iconSVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
                        }
                    } else {
                        iconSVG = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
                    }

                    return `
                        <button class="bed-option-btn ${bedClass}" data-bed-id="${bed.id}" ${bed.status !== 'available' && bed.lockedBy !== user.regNo ? 'disabled' : ''}>
                            ${iconSVG}
                            <span class="bed-option-num">Bed ${bed.bedNo}</span>
                            <span class="bed-status-lbl">${statusLabel}</span>
                        </button>
                    `;
                }).join('');

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
                            <span class="lock-time-val">${lockTimeStr}</span>
                        </div>
                    `;

                    let groupFormHTML = '';
                    if (this.localState.groupBookingActive) {
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
                        groupFormHTML = maxFriendsAllowed <= 0 ? `<p style="font-size:0.85rem; color:var(--color-danger); margin-top:8px;">No other beds available for group booking.</p>` : `
                            <div class="group-input-list">
                                <p style="font-size:0.8rem; color:var(--text-secondary);">Friend beds will be locked and booked simultaneously.</p>
                                ${inputsHTML}
                            </div>
                        `;
                    }

                    confirmBookingHTML = `
                        <div class="group-booking-box">
                            <div class="group-toggle-wrap">
                                <span style="font-size:0.9rem; font-weight:600;">Group booking with friends</span>
                                <input type="checkbox" id="group-booking-toggle" ${this.localState.groupBookingActive ? 'checked' : ''} style="width:16px; height:16px;">
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
                            <p style="font-size:0.85rem; color:var(--text-muted);">Please select a vacant green bed above to lock it for 3 minutes.</p>
                        </div>
                    `;
                }

                drawerHTML = `
                    <div class="drawer-overlay" id="drawer-overlay">
                        <div class="drawer-panel">
                            <div class="drawer-head">
                                <div>
                                    <h3>Room ${activeRoom.roomNo}</h3>
                                    <p>${activeRoom.block} • ${activeRoom.type}</p>
                                </div>
                                <button class="btn-close" id="btn-close-drawer">&times;</button>
                            </div>
                            <div style="font-size: 1.3rem; font-weight: 800; color: var(--color-accent);">${activeRoom.price}</div>
                            <div class="bed-selector-container">
                                <span class="filter-section-title">Select Bed Slot</span>
                                <div class="bed-grid-large">${bedButtonsHTML}</div>
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
                <div class="booking-header-timer ${timerUrgent ? 'warning-pulse' : ''}">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>URGENT: Booking Session Active. Select a room before the session expires!</span>
                    </div>
                    <div class="timer-digits">${timeStr}</div>
                </div>

                ${recommendationHTML}

                <div class="selection-grid">
                    <aside class="glass-card filter-panel">
                        <div>
                            <span class="filter-section-title">Search Rooms</span>
                            <div class="search-input-wrapper" style="margin-top:8px;">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input type="text" id="room-search-input" class="input-glass" placeholder="Search Room Number" value="${this.localState.searchQuery}">
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
                    </aside>
                    <div class="rooms-container">
                        <div class="block-title-tabs">${blockTabsHTML}</div>
                        <div class="rooms-map-grid">${roomsHTML}</div>
                    </div>
                </div>
                ${drawerHTML}
            </div>
        `;
    },

    afterRender(state) {
        const self = this;
        const closeDrawer = () => {
            self.localState.selectedRoomId = null;
            self.localState.groupBookingActive = false;
            self.localState.friendRegs = ["", "", ""];
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

        document.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('click', () => {
                self.localState.selectedRoomId = card.getAttribute('data-room-id');
                window.appRender();
            });
        });

        const quickSelectBtn = document.querySelector('.btn-quick-select');
        if (quickSelectBtn) {
            quickSelectBtn.addEventListener('click', () => {
                self.localState.selectedRoomId = quickSelectBtn.getAttribute('data-room-id');
                window.appRender();
            });
        }

        document.querySelectorAll('.block-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                self.localState.selectedBlock = e.target.getAttribute('data-block');
                window.appRender();
            });
        });

        const searchInput = document.getElementById('room-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                self.localState.searchQuery = e.target.value;
                window.appRender();
                const inp = document.getElementById('room-search-input');
                if (inp) {
                    inp.focus();
                    inp.setSelectionRange(inp.value.length, inp.value.length);
                }
            });
        }

        document.querySelectorAll('.type-filter-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const type = e.target.getAttribute('data-type');
                self.localState.selectedTypes[type] = e.target.checked;
                window.appRender();
            });
        });

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

        const groupToggle = document.getElementById('group-booking-toggle');
        if (groupToggle) {
            groupToggle.addEventListener('change', (e) => {
                self.localState.groupBookingActive = e.target.checked;
                window.appRender();
            });
        }

        document.querySelectorAll('.friend-reg-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = Number(e.target.getAttribute('data-index'));
                self.localState.friendRegs[idx] = e.target.value.trim();
            });
        });

        const releaseBtn = document.querySelector('.btn-release-lock');
        if (releaseBtn) {
            releaseBtn.addEventListener('click', () => {
                store.releaseActiveLock();
                window.appRender();
            });
        }

        const confirmBtn = document.querySelector('.btn-confirm-booking');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const roomId = self.localState.selectedRoomId;
                const bedId = state.activeLock.bedId;
                let friends = [];
                if (self.localState.groupBookingActive) {
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

const Confirmation = {
    render(state) {
        const user = store.getCurrentUserObject();
        if (!user || !user.bookedRoom) {
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
                        <p>Your room booking has been recorded instantly in the database.</p>
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
                    </div>
                    <div class="receipt-actions">
                        <button class="btn btn-secondary" id="btn-print-receipt" style="flex:1;">Print Receipt</button>
                        <button class="btn btn-primary" id="btn-download-receipt" style="flex:1;">Download Receipt</button>
                    </div>
                    <div style="text-align:center; margin-top:24px;">
                        <a href="#/dashboard" class="nav-link">Go to Student Dashboard &rarr;</a>
                    </div>
                </div>
            </div>
        `;
    },
    afterRender(state) {
        const user = store.getCurrentUserObject();
        if (!user || !user.bookedRoom) return;
        const room = user.bookedRoom;

        document.getElementById('btn-print-receipt').addEventListener('click', () => {
            window.print();
        });

        document.getElementById('btn-download-receipt').addEventListener('click', () => {
            const svgContent = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650" style="background:#0F172A; font-family:'Inter', sans-serif;">
                    <style>
                        .title { font-size: 22px; fill: #FFFFFF; font-weight: 700; }
                        .subtitle { font-size: 13px; fill: #94A3B8; }
                        .lbl { font-size: 14px; fill: #94A3B8; }
                        .val { font-size: 14px; fill: #FFFFFF; font-weight: 600; text-anchor: end; }
                        .badge { fill: rgba(16, 185, 129, 0.1); stroke: #10B981; }
                        .badge-text { font-size: 12px; fill: #10B981; font-weight: 700; text-anchor: middle; }
                    </style>
                    <rect x="0" y="0" width="500" height="90" fill="#1E3A8A"/>
                    <text x="250" y="45" fill="#FFFFFF" font-size="28" font-weight="800" text-anchor="middle">HostelQ Receipt</text>
                    <text x="250" y="68" fill="#93C5FD" font-size="12" text-anchor="middle">Official E-Allocation Summary</text>
                    <circle cx="250" cy="300" r="120" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="2"/>
                    <g transform="translate(40, 140)">
                        <text class="title" x="0" y="0">Allocation Confirmed</text>
                        <text class="subtitle" x="0" y="22">Your room slot is locked and secured.</text>
                        <line x1="0" y1="45" x2="420" y2="45" stroke="#334155" stroke-dasharray="6,4" stroke-width="2"/>
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
                        </g>
                        <line x1="0" y1="365" x2="420" y2="365" stroke="#334155" stroke-width="1"/>
                        <g transform="translate(0, 395)">
                            <text class="lbl" x="0" y="15">Verification Status</text>
                            <rect class="badge" x="300" y="-5" width="120" height="28" rx="6"/>
                            <text class="badge-text" x="360" y="14">SUCCESSFUL</text>
                        </g>
                    </g>
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
            store.addNotification("Downloaded Receipt", `Downloaded receipt for Room ${room.roomNo}`, "success");
        });
    }
};

const StudentDashboard = {
    render(state) {
        const user = store.getCurrentUserObject();
        if (!user) {
            setTimeout(() => window.location.hash = '#/login', 10);
            return `<div class="loading-spinner-container"><p>Redirecting...</p></div>`;
        }

        if (!user.bookedRoom) {
            const hasQueueActive = state.queue.isInQueue;
            const targetHash = hasQueueActive ? '#/queue' : (state.bookingWindow.status === 'open' ? '#/queue' : '#/waiting-room');
            const buttonText = hasQueueActive ? 'Resume Queue Position' : (state.bookingWindow.status === 'open' ? 'Enter Room Booking Portal' : 'Enter Waiting Room');

            return `
                <div style="max-width: 800px; margin: 40px auto 0; text-align: center;">
                    <div class="glass-card queue-panel" style="padding: 50px 40px;">
                        <h2 style="font-family:'Outfit', sans-serif; font-size:2rem; font-weight:700; margin-bottom:16px;">No Active Room Allocation</h2>
                        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 30px;">
                            You have not booked a room for the 2026-2027 academic year yet. Join the virtual queue when the booking window opens.
                        </p>
                        <a href="${targetHash}" class="btn btn-primary btn-lg">${buttonText}</a>
                    </div>
                </div>
            `;
        }

        const room = user.bookedRoom;
        let roommatesHTML = '';
        const roomObj = state.rooms.find(r => r.block === room.block && r.roomNo === room.roomNo);
        const otherBeds = roomObj ? roomObj.beds.filter(b => b.status === 'booked' && b.bookedBy.regNo !== user.regNo) : [];
        
        if (otherBeds.length > 0) {
            roommatesHTML = otherBeds.map(b => `
                <div class="roommate-card glass-card">
                    <div class="roommate-avatar">${b.bookedBy.name.split(' ').map(n=>n[0]).join('') || 'ST'}</div>
                    <div class="roommate-name">${b.bookedBy.name || 'Student'}</div>
                    <div class="roommate-reg">${b.bookedBy.regNo} (Bed #${b.bedNo})</div>
                    <span class="badge badge-success" style="font-size:0.65rem;">Roommate</span>
                </div>
            `).join('');
        } else {
            roommatesHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">No roommates assigned yet. Slots are still vacant!</div>`;
        }

        return `
            <div class="dashboard-wrapper">
                <div class="dashboard-banner">
                    <div class="dashboard-banner-text">
                        <h2>Welcome back, ${user.name}!</h2>
                        <p>Your room slot is locked and confirmed in <strong>${room.block}</strong>.</p>
                    </div>
                </div>
                <div class="dashboard-grid">
                    <div class="dash-main">
                        <div class="glass-card" style="padding: 24px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
                                <span class="filter-section-title">Your Room Details</span>
                                <span class="badge badge-success">BOOKED</span>
                            </div>
                            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
                                <div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">Block / Room Number</div>
                                    <div style="font-size:1.4rem; font-weight:700; color:var(--text-primary); margin-top:4px;">${room.block} • ${room.roomNo}</div>
                                </div>
                                <div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">Bed Slot</div>
                                    <div style="font-size:1.4rem; font-weight:700; color:var(--color-accent); margin-top:4px;">Bed #${room.bedNo}</div>
                                </div>
                                <div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">Room Type</div>
                                    <div style="font-size:1.4rem; font-weight:700; color:var(--text-primary); margin-top:4px;">${room.type}</div>
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-top:20px; padding-top:16px; border-top:1px solid var(--border-color); font-size:0.85rem;">
                                <span>Receipt: <strong style="font-family:monospace;">${room.receiptNo}</strong></span>
                                <span>Allocated: <strong>${room.timestamp}</strong></span>
                            </div>
                            <div style="margin-top:20px;">
                                <a href="#/confirmation" class="btn btn-secondary btn-sm">View Printable Receipt</a>
                            </div>
                        </div>
                        <div>
                            <h3 style="margin-bottom:16px;">Room Occupants</h3>
                            <div class="roommates-grid">${roommatesHTML}</div>
                        </div>
                    </div>
                    <aside class="glass-card guidelines-card">
                        <span class="filter-section-title">Hostel Guidelines</span>
                        <div class="guidelines-list">
                            <div class="guidelines-item"><span><strong>Reporting:</strong> Check-in starts on August 15, 2026.</span></div>
                            <div class="guidelines-item"><span><strong>Documents:</strong> Bring medical form, booking receipt, and photos.</span></div>
                            <div class="guidelines-item"><span><strong>Curfew:</strong> Gate locks at 9:30 PM.</span></div>
                        </div>
                    </aside>
                </div>
            </div>
        `;
    },
    afterRender(state) {}
};

const AdminDashboard = {
    localState: {
        reportSearchQuery: ""
    },

    render(state) {
        const user = store.getCurrentUserObject();
        
        if (!user || !user.isAdmin) {
            return `
                <div class="auth-container">
                    <div class="glass-card auth-card">
                        <div class="auth-header">
                            <h2>Admin Dashboard</h2>
                            <p>Authentication required</p>
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
                            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">Authenticate</button>
                        </form>
                    </div>
                </div>
            `;
        }

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

        const simulatedQueueSize = Math.max(0, Math.floor(Math.random() * 5) + (state.bookingWindow.status === 'open' ? 14 : 0));
        const logItemsHTML = state.notifications.slice(0, 10).map(log => {
            let badgeClass = log.type === 'success' ? 'badge-success' : (log.type === 'danger' ? 'badge-danger' : (log.type === 'warning' ? 'badge-warning' : 'badge-info'));
            return `
                <div style="font-size:0.8rem; display:flex; gap:10px; border-bottom:1px solid var(--border-color); padding: 8px 0; align-items:center;">
                    <span style="color:var(--text-muted); font-family:monospace;">${log.timestamp}</span>
                    <span class="badge ${badgeClass}" style="font-size:0.6rem; padding: 2px 6px;">${log.type.toUpperCase()}</span>
                    <span style="color:var(--text-secondary); flex:1;">${log.desc}</span>
                </div>
            `;
        }).join('');

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
                    receiptNo: stud.bookedRoom.receiptNo,
                    timestamp: stud.bookedRoom.timestamp
                });
            }
        });

        const filteredReportBookings = allBookings.filter(b => {
            const query = this.localState.reportSearchQuery.toLowerCase();
            return b.name.toLowerCase().includes(query) || b.regNo.toLowerCase().includes(query) || b.roomNo.toLowerCase().includes(query);
        });

        const tableRowsHTML = filteredReportBookings.map(b => `
            <tr>
                <td style="font-weight:600; color:var(--text-primary);">${b.name}</td>
                <td>${b.regNo}</td>
                <td>${b.block} - ${b.roomNo}</td>
                <td>Bed #${b.bedNo}</td>
                <td>${b.type}</td>
                <td style="font-family:monospace;">${b.receiptNo}</td>
                <td>${b.timestamp}</td>
            </tr>
        `).join('');

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
                        <h1 style="font-family:'Outfit', sans-serif; font-size:2rem; font-weight:700;">Admin Console</h1>
                        <p style="color:var(--text-secondary);">Manage booking portal window constraints.</p>
                    </div>
                    <button class="btn btn-secondary btn-sm btn-logout" style="font-size:0.85rem;">Logout</button>
                </div>
                <div class="admin-grid">
                    <div class="glass-card analytics-card">
                        <div class="analytics-lbl">Occupancy Rate</div>
                        <div class="analytics-num">${occupancyRatePercent}%</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${occupiedBeds} occupied / ${totalBeds} total</div>
                    </div>
                    <div class="glass-card analytics-card">
                        <div class="analytics-lbl">Available Beds</div>
                        <div class="analytics-num" style="color:var(--color-success)">${vacantBeds}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Vacant slots remaining</div>
                    </div>
                    <div class="glass-card analytics-card">
                        <div class="analytics-lbl">Simulated Queue</div>
                        <div class="analytics-num" style="color:var(--color-warning)">${simulatedQueueSize}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Active waiting count</div>
                    </div>
                    <div class="glass-card analytics-card">
                        <div class="analytics-lbl">Booking Window</div>
                        <div class="analytics-num" style="color: ${state.bookingWindow.status === 'open' ? 'var(--color-success)' : 'var(--color-danger)'}">${state.bookingWindow.status.toUpperCase()}</div>
                    </div>
                </div>
                <div class="admin-sections-grid" style="margin-bottom:40px;">
                    <div class="glass-card admin-panel-control">
                        <div><span class="filter-section-title">Window Control</span></div>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <div class="flex-btn-row">
                                <button class="btn btn-secondary btn-set-window" data-status="closed">Close Portal</button>
                                <button class="btn btn-warning btn-set-window" data-status="countdown">Start 15s Countdown</button>
                                <button class="btn btn-success btn-set-window" data-status="open">Open Portal</button>
                            </div>
                        </div>
                        <div class="simulation-control-box" style="border-top:1px solid var(--border-color); padding-top:16px;">
                            <span style="font-size:0.85rem;">Sim Speed: <span class="speed-indicator">${state.simulationSpeed}x</span></span>
                            <div class="flex-btn-row">
                                <button class="btn btn-secondary btn-set-speed" data-speed="0">Pause</button>
                                <button class="btn btn-secondary btn-set-speed" data-speed="1">1x</button>
                                <button class="btn btn-secondary btn-set-speed" data-speed="2">2x</button>
                                <button class="btn btn-secondary btn-set-speed" data-speed="5">5x</button>
                            </div>
                        </div>
                        <div style="border-top:1px solid var(--border-color); padding-top:16px;">
                            <button class="btn btn-danger btn-reset-system">Reset Database</button>
                        </div>
                    </div>
                    <div class="glass-card" style="padding:24px;">
                        <span class="filter-section-title">Hostel Block Occupancy</span>
                        <div class="chart-bar-list">${chartsHTML}</div>
                    </div>
                </div>
                <div class="admin-sections-grid" style="grid-template-columns: 0.8fr 1.2fr;">
                    <div class="glass-card" style="padding:24px; max-height: 400px; overflow-y: auto;">
                        <span class="filter-section-title">System Activity Logs</span>
                        <div style="margin-top:16px;">${logItemsHTML}</div>
                    </div>
                    <div class="glass-card" style="padding:24px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                            <span class="filter-section-title">Bookings Registry</span>
                            <button class="btn btn-success btn-sm btn-export-csv">Export CSV</button>
                        </div>
                        <div class="search-input-wrapper" style="margin-bottom:14px;">
                            <input type="text" id="report-search-input" class="input-glass" placeholder="Search by Student or Room..." value="${this.localState.reportSearchQuery}">
                        </div>
                        <div class="table-container">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Reg No</th>
                                        <th>Room</th>
                                        <th>Bed</th>
                                        <th>Type</th>
                                        <th>Receipt ID</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRowsHTML.length > 0 ? tableRowsHTML : '<tr><td colspan="7">No bookings match search.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Student Import Panel -->
                <div class="glass-card" style="padding:28px; margin-top:30px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
                        <div>
                            <span class="filter-section-title">Student Credential Import</span>
                            <p style="font-size:0.82rem; color:var(--text-muted); margin-top:6px; max-width:600px;">
                                Import student login credentials from a CSV or Excel (.xlsx) file.
                                Required columns: <code style="background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">reg_no, name, password</code> &mdash;
                                Optional: <code style="background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">department, year</code>
                            </p>
                        </div>
                        <a href="#" id="btn-download-template" class="btn btn-secondary btn-sm" style="white-space:nowrap; margin-left:16px;">⬇ Download Template</a>
                    </div>

                    <div id="import-drop-zone" style="
                        border: 2px dashed var(--border-color);
                        border-radius: 12px;
                        padding: 40px 20px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.2s;
                        position: relative;
                    ">
                        <div id="import-drop-icon" style="font-size:2.5rem; margin-bottom:12px;">📂</div>
                        <p style="color:var(--text-secondary); font-size:0.95rem; margin:0 0 8px;"><strong>Drag & Drop</strong> your CSV or Excel file here</p>
                        <p style="color:var(--text-muted); font-size:0.8rem; margin:0 0 16px;">or click to browse</p>
                        <input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display:none;">
                        <button class="btn btn-primary btn-sm" id="btn-browse-import">Browse File</button>
                    </div>

                    <div id="import-preview-section" style="display:none; margin-top:24px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <span style="font-weight:600; color:var(--text-primary);" id="import-preview-title">Preview (first 5 rows)</span>
                            <div style="display:flex; gap:10px;">
                                <button class="btn btn-secondary btn-sm" id="btn-import-cancel">Cancel</button>
                                <button class="btn btn-success" id="btn-import-confirm">Import All Students</button>
                            </div>
                        </div>
                        <div class="table-container" style="max-height:260px; overflow-y:auto;">
                            <table class="admin-table" id="import-preview-table">
                                <thead><tr>
                                    <th>Reg No</th><th>Name</th><th>Password</th><th>Department</th><th>Year</th>
                                </tr></thead>
                                <tbody id="import-preview-body"></tbody>
                            </table>
                        </div>
                        <div id="import-status-msg" style="margin-top:12px; font-size:0.85rem;"></div>
                    </div>
                </div>
            </div>
        `;
    },

    afterRender(state) {
        const self = this;
        const user = store.getCurrentUserObject();

        if (!user || !user.isAdmin) {
            const loginForm = document.getElementById('admin-login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const err = document.getElementById('admin-login-error');
                    err.style.display = 'none';
                    const submitBtn = loginForm.querySelector('button[type=submit]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Authenticating...';
                    const u = document.getElementById('admin-user').value.trim();
                    const p = document.getElementById('admin-pass').value;
                    const res = await store.loginAdmin(u, p);
                    if (res.success) {
                        window.appRender();
                    } else {
                        err.textContent = res.error;
                        err.style.display = 'block';
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Authenticate';
                    }
                });
            }
            return;
        }

        document.querySelector('.btn-logout').addEventListener('click', () => {
            store.logout();
            window.location.hash = '#/';
        });

        document.querySelectorAll('.btn-set-window').forEach(btn => {
            btn.addEventListener('click', (e) => {
                store.setBookingWindowStatus(e.target.getAttribute('data-status'));
            });
        });

        document.querySelectorAll('.btn-set-speed').forEach(btn => {
            btn.addEventListener('click', (e) => {
                store.setSimulationSpeed(e.target.getAttribute('data-speed'));
            });
        });

        document.querySelector('.btn-reset-system').addEventListener('click', () => {
            if (confirm("Reset database? All records will be cleared.")) {
                store.resetState();
                window.location.reload();
            }
        });

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

        document.querySelector('.btn-export-csv').addEventListener('click', () => {
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
                alert("No bookings to export.");
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Student Name,Register Number,Allocated Room,Bed Number,Configuration,Fee,Receipt ID,Timestamp\n";

            bookingsExport.forEach(row => {
                csvContent += `"${row.name}","${row.regNo}","${row.room}","${row.bed}","${row.type}","${row.price}","${row.receipt}","${row.timestamp}"\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `HostelQ-Report-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            store.addNotification("Report Exported", "Booking reports registry exported to CSV.", "success");
        });

        // ---- Student Import Logic ----
        let parsedStudentRows = [];

        // Download CSV template
        const dlTemplate = document.getElementById('btn-download-template');
        if (dlTemplate) {
            dlTemplate.addEventListener('click', (e) => {
                e.preventDefault();
                const template = 'reg_no,name,password,department,year\nSTU101,John Doe,Password@123,Computer Science,1\nSTU102,Jane Smith,Pass@456,Mechanical,2';
                const blob = new Blob([template], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'hostelq_student_import_template.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            });
        }

        function parseCSVText(text) {
            const lines = text.trim().split(/\r?\n/);
            if (lines.length < 2) return [];
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
            const rows = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                // Handle quoted CSV values
                const values = lines[i].match(/(?:"([^"]*(?:""[^"]*)*)"|([^,]*))(?:,|$)/g)
                    .map(v => v.replace(/^"?|,?"?$/g, '').replace(/""/g, '"').trim());
                const row = {};
                headers.forEach((h, idx) => row[h] = values[idx] || '');
                if (row['reg_no'] && row['name'] && row['password']) {
                    rows.push({
                        regNo: row['reg_no'],
                        name: row['name'],
                        password: row['password'],
                        department: row['department'] || '',
                        year: row['year'] || ''
                    });
                }
            }
            return rows;
        }

        function showImportPreview(rows) {
            parsedStudentRows = rows;
            const previewSection = document.getElementById('import-preview-section');
            const previewTitle = document.getElementById('import-preview-title');
            const previewBody = document.getElementById('import-preview-body');
            const statusMsg = document.getElementById('import-status-msg');

            previewTitle.textContent = `Preview — ${rows.length} students found (showing first 5)`;
            previewBody.innerHTML = rows.slice(0, 5).map(r => `
                <tr>
                    <td style="font-family:monospace; font-weight:600;">${r.regNo}</td>
                    <td>${r.name}</td>
                    <td style="color:var(--text-muted); font-family:monospace;">••••••</td>
                    <td>${r.department || '—'}</td>
                    <td>${r.year || '—'}</td>
                </tr>
            `).join('');

            statusMsg.innerHTML = `<span style="color:var(--color-success);">✓ File parsed successfully. Ready to import <strong>${rows.length}</strong> students into Supabase.</span>`;
            previewSection.style.display = 'block';

            const confirmBtn = document.getElementById('btn-import-confirm');
            const cancelBtn = document.getElementById('btn-import-cancel');

            confirmBtn.onclick = async () => {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Importing...';
                statusMsg.innerHTML = `<span style="color:var(--text-muted);">⏳ Importing ${parsedStudentRows.length} students, please wait...</span>`;
                const result = await store.importStudents(parsedStudentRows);
                statusMsg.innerHTML = `<span style="color:var(--color-success);">✅ Import complete! Added/Updated: <strong>${result.addedCount}</strong> | Errors: <strong>${result.errorCount || 0}</strong></span>`;
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Import All Students';
                parsedStudentRows = [];
            };

            cancelBtn.onclick = () => {
                previewSection.style.display = 'none';
                parsedStudentRows = [];
                document.getElementById('import-file-input').value = '';
            };
        }

        function handleImportFile(file) {
            if (!file) return;
            const ext = file.name.split('.').pop().toLowerCase();
            const statusMsg = document.getElementById('import-status-msg');
            const previewSection = document.getElementById('import-preview-section');
            previewSection.style.display = 'block';
            statusMsg.innerHTML = `<span style="color:var(--text-muted);">⏳ Reading file...</span>`;

            if (ext === 'csv') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const rows = parseCSVText(e.target.result);
                    if (rows.length === 0) {
                        statusMsg.innerHTML = `<span style="color:var(--color-danger);">❌ No valid rows found. Check that your file has reg_no, name, password columns.</span>`;
                    } else {
                        showImportPreview(rows);
                    }
                };
                reader.readAsText(file);
            } else if (ext === 'xlsx' || ext === 'xls') {
                // For Excel: use SheetJS (CDN loaded) if available, else prompt to use CSV
                if (window.XLSX) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
                        const rows = jsonData
                            .filter(r => r['reg_no'] && r['name'] && r['password'])
                            .map(r => ({
                                regNo: String(r['reg_no']).trim(),
                                name: String(r['name']).trim(),
                                password: String(r['password']).trim(),
                                department: String(r['department'] || '').trim(),
                                year: String(r['year'] || '').trim()
                            }));

                        if (rows.length === 0) {
                            statusMsg.innerHTML = `<span style="color:var(--color-danger);">❌ No valid rows found. Check that your Excel has reg_no, name, password columns in row 1.</span>`;
                        } else {
                            showImportPreview(rows);
                        }
                    };
                    reader.readAsArrayBuffer(file);
                } else {
                    statusMsg.innerHTML = `<span style="color:var(--color-warning);">⚠️ Excel support requires SheetJS library. Please convert to CSV format and re-upload.</span>`;
                }
            } else {
                statusMsg.innerHTML = `<span style="color:var(--color-danger);">❌ Unsupported file type. Please use .csv or .xlsx files.</span>`;
            }
        }

        const dropZone = document.getElementById('import-drop-zone');
        const fileInput = document.getElementById('import-file-input');
        const browseBtn = document.getElementById('btn-browse-import');

        if (dropZone && fileInput && browseBtn) {
            browseBtn.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('click', (e) => { if (e.target !== browseBtn) fileInput.click(); });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) handleImportFile(e.target.files[0]);
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--color-accent)';
                dropZone.style.background = 'rgba(59,130,246,0.05)';
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.style.borderColor = '';
                dropZone.style.background = '';
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '';
                dropZone.style.background = '';
                const file = e.dataTransfer.files[0];
                if (file) handleImportFile(file);
            });
        }
    }
};



// =============================================================
// 4. ROUTER & DYNAMIC UI CONTROLLER
// =============================================================

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

const ICONS = {
    sun: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    moon: `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
    success: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    warning: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    danger: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    info: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
};

let lastSeenToastId = null;

function initApp() {
    setupTheme();
    setupRouting();
    setupMobileMenu();
    
    store.subscribe((state) => {
        handleStateUpdate(state);
    });

    handleStateUpdate(store.state);
}

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

let currentRenderedRoute = null;

function setupRouting() {
    window.addEventListener('hashchange', () => {
        currentRenderedRoute = null; // Reset to force re-render on manual navigation
        routeView(parseRoute());
    });
}

function parseRoute() {
    return window.location.hash.slice(1) || '/';
}

function routeView(route) {
    const view = ROUTES[route] || LandingPage;
    const root = document.getElementById('app-root');

    const currentUser = store.state.currentUser;
    const isLoggedStudent = currentUser && currentUser.type === 'student';

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

    // Prevent re-rendering static/input forms if already showing to avoid resetting input fields & losing focus
    const isStaticRoute = (
        route === '/' || 
        route === '/login' || 
        route === '/confirmation' || 
        (route === '/admin' && (!currentUser || !currentUser.isAdmin))
    );
    if (isStaticRoute && currentRenderedRoute === route) {
        return;
    }
    currentRenderedRoute = route;

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

    root.innerHTML = view.render(store.state);
    view.afterRender(store.state);
}

function setupMobileMenu() {
    const mobileBtn = document.getElementById('mobile-toggle');
    const menu = document.getElementById('nav-menu');

    mobileBtn.addEventListener('click', () => {
        menu.classList.toggle('open');
        mobileBtn.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('open');
            mobileBtn.classList.remove('active');
        });
    });
}

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

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 4500);
}

function handleStateUpdate(state) {
    const user = store.getCurrentUserObject();
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
            studentDashLink.classList.remove('hidden');
            authNavContainer.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.85rem; color:var(--text-secondary)">Hi, ${user.name.split(' ')[0]}</span>
                    <button class="btn btn-secondary btn-sm" id="btn-nav-logout" style="padding: 6px 14px; font-size: 0.85rem;">Sign Out</button>
                </div>
            `;
        }
        
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

    if (state.notifications.length > 0) {
        const latest = state.notifications[0];
        if (latest.id !== lastSeenToastId) {
            lastSeenToastId = latest.id;
            spawnToast(latest.title, latest.desc, latest.type);
        }
    }

    const currentRoute = parseRoute();
    if (currentRoute === '/queue' && state.queue.isMyTurn) {
        window.location.hash = '#/select-room';
        return;
    }

    routeView(currentRoute);
}

window.appRender = () => {
    routeView(parseRoute());
};

window.addEventListener('DOMContentLoaded', initApp);
