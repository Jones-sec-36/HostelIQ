/* -------------------------------------------------------------
 * HostelQ - State Management & Simulation Engine (Pub-Sub)
 * Handles LocalStorage sync, room locks, and active background queue simulator.
 * ------------------------------------------------------------- */

import { INITIAL_STUDENTS, INITIAL_ADMINS, generateInitialRooms } from './mockData.js';

class Store {
    constructor() {
        this.listeners = [];
        this.loadState();
        this.startBackgroundProcesses();
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // Trigger UI updates
    notify() {
        this.saveState();
        this.listeners.forEach(listener => listener(this.state));
    }

    // LocalStorage sync
    loadState() {
        const saved = localStorage.getItem('hostelq_state');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
                // Re-establish any necessary runtime variables
                return;
            } catch (e) {
                console.error("Failed to load state, resetting.", e);
            }
        }

        // Default State Configuration
        this.state = {
            students: [...INITIAL_STUDENTS],
            admins: [...INITIAL_ADMINS],
            rooms: generateInitialRooms(),
            currentUser: null, // { type: 'student' | 'admin', data: Object }
            
            // Queue & Timing
            bookingWindow: {
                status: 'countdown', // 'closed', 'countdown', 'open'
                countdownRemaining: 15, // 15 seconds default for quick demo
                totalCountdown: 15
            },
            
            queue: {
                isInQueue: false,
                queueNumber: null,
                studentsAhead: null,
                totalAheadAtStart: null,
                estimatedWaitSec: null,
                isMyTurn: false,
                sessionExpiresAt: null, // 5 min session
                sessionTimeRemaining: null
            },
            
            activeLock: {
                roomId: null,
                bedId: null,
                lockedAt: null,
                expiresAt: null, // 3 min lock
                timeRemaining: null
            },
            
            bookings: [], // list of completed bookings
            notifications: [
                { id: 1, title: "Welcome to HostelQ", desc: "The booking window starts in 15 seconds. Be ready to join the queue!", type: "info", timestamp: new Date().toLocaleTimeString() }
            ],
            
            // Simulator Settings
            simulationSpeed: 1, // 0 = paused, 1 = 1x, 2 = 2x, 5 = 5x
            simulatedBookingCount: 124
        };
        this.saveState();
    }

    saveState() {
        localStorage.setItem('hostelq_state', JSON.stringify(this.state));
    }

    resetState() {
        localStorage.removeItem('hostelq_state');
        this.loadState();
        this.addNotification("System Reset", "The system state has been successfully reset by admin.", "info");
        this.notify();
    }

    // Authentication Actions
    loginStudent(regNo, password) {
        const student = this.state.students.find(s => s.regNo.toUpperCase() === regNo.toUpperCase() && s.password === password);
        if (student) {
            this.state.currentUser = { type: 'student', regNo: student.regNo };
            this.addNotification("Login Successful", `Welcome back, ${student.name}!`, "success");
            
            // If the student already has a booked room, bypass queue
            if (student.bookedRoom) {
                this.state.queue.isMyTurn = false;
                this.state.queue.isInQueue = false;
            }
            
            this.notify();
            return { success: true };
        }
        return { success: false, error: "Invalid Register Number or Password" };
    }

    loginAdmin(username, password) {
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

    // Queue Actions
    joinQueue() {
        const user = this.getCurrentUserObject();
        if (!user || user.bookedRoom) return;

        if (this.state.bookingWindow.status !== 'open') {
            return { success: false, error: "Booking window is not open yet." };
        }

        if (this.state.queue.isInQueue) return;

        // Generate queue number
        const queueNum = this.state.simulatedBookingCount + 1;
        const ahead = Math.floor(10 + Math.random() * 15); // Let's put 10 to 25 people ahead of them
        
        this.state.queue = {
            isInQueue: true,
            queueNumber: queueNum,
            studentsAhead: ahead,
            totalAheadAtStart: ahead,
            estimatedWaitSec: ahead * 10, // 10 seconds per student in simulation
            isMyTurn: false,
            sessionExpiresAt: null,
            sessionTimeRemaining: null
        };
        
        this.state.simulatedBookingCount++;
        this.addNotification("Queue Joined", `Your queue number is #${queueNum}. Est. wait time: ${Math.ceil(this.state.queue.estimatedWaitSec / 60)} mins.`, "info");
        this.notify();
    }

    // Room Booking & Locking Logic
    lockBed(roomId, bedId) {
        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room) return { success: false };
        const bed = room.beds.find(b => b.id === bedId);
        if (!bed || bed.status !== 'available') return { success: false, error: "Bed is no longer available" };

        // Release any existing lock by this student first
        this.releaseActiveLock();

        const now = Date.now();
        const expires = now + 3 * 60 * 1000; // 3 minutes lock

        bed.status = 'reserved';
        bed.lockedBy = this.state.currentUser.regNo;
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

    releaseActiveLock() {
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

    confirmBooking(roomId, bedId, groupRegNos = []) {
        const user = this.getCurrentUserObject();
        if (!user || user.bookedRoom) return { success: false, error: "Already booked or not authenticated" };

        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room) return { success: false, error: "Room not found" };

        const bed = room.beds.find(b => b.id === bedId);
        if (!bed) return { success: false, error: "Bed not found" };

        // Check if group booking is requested
        const bookingRegs = [user.regNo, ...groupRegNos].map(r => r.toUpperCase());
        
        // Validate if they are locking the bed or if it is available
        if (bed.status === 'reserved' && bed.lockedBy !== user.regNo) {
            return { success: false, error: "Bed is locked by another user" };
        }
        if (bed.status === 'booked') {
            return { success: false, error: "Bed is already booked" };
        }

        // Validate group students if specified
        if (groupRegNos.length > 0) {
            // Check if group exceeds capacity of the room
            const availableBedsCount = room.beds.filter(b => b.status === 'available' || (b.status === 'reserved' && b.lockedBy === user.regNo)).length;
            if (bookingRegs.length > availableBedsCount) {
                return { success: false, error: `Not enough available beds in Room ${room.roomNo} for a group of ${bookingRegs.length}` };
            }

            // Verify if friends exist and haven't booked yet
            for (let friendReg of groupRegNos) {
                const friend = this.state.students.find(s => s.regNo.toUpperCase() === friendReg.toUpperCase());
                if (!friend) {
                    return { success: false, error: `Student with Register Number ${friendReg} not found` };
                }
                if (friend.bookedRoom) {
                    return { success: false, error: `Student ${friend.name} (${friendReg}) has already booked a room` };
                }
            }
        }

        // Process booking for student(s)
        const bookedBeds = [];
        
        // Book the selected bed for current user
        bed.status = 'booked';
        bed.lockedBy = null;
        bed.lockExpires = null;
        bed.bookedBy = { regNo: user.regNo, name: user.name };
        bookedBeds.push({ bedNo: bed.bedNo, regNo: user.regNo, name: user.name });

        // Update student record
        user.bookedRoom = {
            block: room.block,
            roomNo: room.roomNo,
            bedNo: bed.bedNo,
            type: room.type,
            price: room.price,
            timestamp: new Date().toLocaleString(),
            receiptNo: "HQ-" + Math.floor(100000 + Math.random() * 900000),
            roommates: [] // Will fill dynamically
        };

        // Book other beds for friends if group booking
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

        // Fill roommates information for all booked students in this room
        const currentRoomBookings = room.beds.filter(b => b.status === 'booked').map(b => ({
            name: b.bookedBy.name,
            regNo: b.bookedBy.regNo,
            bedNo: b.bedNo
        }));

        // Update room details in each booked student's profile
        currentRoomBookings.forEach(rm => {
            const studentObj = this.state.students.find(s => s.regNo === rm.regNo);
            if (studentObj && studentObj.bookedRoom) {
                studentObj.bookedRoom.roommates = currentRoomBookings.filter(r => r.regNo !== rm.regNo);
            }
        });

        // Add to main booking list
        const mainBooking = {
            id: `BK-${Date.now()}`,
            roomNo: room.roomNo,
            block: room.block,
            type: room.type,
            bedsBooked: bookedBeds,
            timestamp: new Date().toLocaleString()
        };
        this.state.bookings.push(mainBooking);

        // Reset user's active queue lock
        this.state.queue = { isInQueue: false, queueNumber: null, studentsAhead: null, totalAheadAtStart: null, estimatedWaitSec: null, isMyTurn: false, sessionExpiresAt: null, sessionTimeRemaining: null };
        this.state.activeLock = { roomId: null, bedId: null, lockedAt: null, expiresAt: null, timeRemaining: null };

        this.addNotification("Booking Confirmed", `Successfully booked Room ${room.roomNo} (${room.block})!`, "success");
        this.notify();
        return { success: true, booking: mainBooking };
    }

    addNotification(title, desc, type = "info") {
        const id = Date.now() + Math.random();
        this.state.notifications.unshift({
            id: id,
            title: title,
            desc: desc,
            type: type,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // Keep logs capped at 50 elements
        if (this.state.notifications.length > 50) {
            this.state.notifications.pop();
        }
    }

    setBookingWindowStatus(status) {
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

    setSimulationSpeed(speed) {
        this.state.simulationSpeed = Number(speed);
        this.addNotification("Simulation Speed Updated", `Simulator speed set to ${speed}x.`, "info");
        this.notify();
    }

    // -------------------------------------------------------------
    // SIMULATED QUEUE & LIVE BOOKING ENGINE
    // -------------------------------------------------------------
    startBackgroundProcesses() {
        setInterval(() => {
            if (this.state.simulationSpeed === 0) return; // Paused

            let stateChanged = false;
            const speed = this.state.simulationSpeed;

            // 1. Tick Booking Window Countdown
            if (this.state.bookingWindow.status === 'countdown') {
                this.state.bookingWindow.countdownRemaining -= 1;
                if (this.state.bookingWindow.countdownRemaining <= 0) {
                    this.state.bookingWindow.status = 'open';
                    this.state.bookingWindow.countdownRemaining = 0;
                    this.addNotification("Booking Window Open", "Official hostel room bookings have commenced! Click 'Join Queue' now.", "success");
                }
                stateChanged = true;
            }

            // 2. Process Queue progress for logged-in user
            if (this.state.queue.isInQueue && !this.state.queue.isMyTurn) {
                // Decrement students ahead
                // Move faster if speed is high
                const drop = Math.floor(Math.random() * speed) + 1;
                
                if (this.state.queue.studentsAhead > 0) {
                    this.state.queue.studentsAhead = Math.max(0, this.state.queue.studentsAhead - drop);
                    this.state.queue.estimatedWaitSec = this.state.queue.studentsAhead * 10;
                }

                if (this.state.queue.studentsAhead <= 0) {
                    this.state.queue.isMyTurn = true;
                    this.state.queue.studentsAhead = 0;
                    this.state.queue.estimatedWaitSec = 0;
                    
                    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes booking session
                    this.state.queue.sessionExpiresAt = expires;
                    this.state.queue.sessionTimeRemaining = 300;
                    
                    this.addNotification("Your Turn!", "Your session has started! You have 5 minutes to select a room.", "success");
                }
                stateChanged = true;
            }

            // 3. Tick active booking session timer
            if (this.state.queue.isMyTurn && this.state.queue.sessionExpiresAt) {
                const diff = Math.max(0, Math.ceil((this.state.queue.sessionExpiresAt - Date.now()) / 1000));
                this.state.queue.sessionTimeRemaining = diff;
                
                if (diff <= 0) {
                    // Session expired! Expel student from queue
                    this.releaseActiveLock();
                    this.state.queue = { isInQueue: false, queueNumber: null, studentsAhead: null, totalAheadAtStart: null, estimatedWaitSec: null, isMyTurn: false, sessionExpiresAt: null, sessionTimeRemaining: null };
                    this.addNotification("Session Expired", "Your 5-minute booking window has expired. You have been removed from the queue.", "danger");
                }
                stateChanged = true;
            }

            // 4. Tick Bed Lock timer (3 minutes)
            if (this.state.activeLock.roomId && this.state.activeLock.expiresAt) {
                const diff = Math.max(0, Math.ceil((this.state.activeLock.expiresAt - Date.now()) / 1000));
                this.state.activeLock.timeRemaining = diff;

                if (diff <= 0) {
                    this.releaseActiveLock();
                    this.addNotification("Room Lock Released", "Your 3-minute temporary room lock has expired.", "danger");
                }
                stateChanged = true;
            }

            // 5. Release expired locks for other simulated students
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

            // 6. Simulate other students booking & locking rooms
            if (this.state.bookingWindow.status === 'open') {
                const randomTrigger = Math.random();
                // Speed scales simulated actions
                const triggerThreshold = 0.15 * speed; 
                
                if (randomTrigger < triggerThreshold) {
                    // Select a random room that has available beds
                    const availableRooms = this.state.rooms.filter(r => r.beds.some(b => b.status === 'available'));
                    
                    if (availableRooms.length > 0) {
                        const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
                        const availableBeds = randomRoom.beds.filter(b => b.status === 'available');
                        const randomBed = availableBeds[Math.floor(Math.random() * availableBeds.length)];

                        const simulatedRegNo = `STU${100 + Math.floor(Math.random() * 500)}`;
                        const isLock = Math.random() < 0.4; // 40% lock, 60% direct book

                        if (isLock) {
                            // Lock bed
                            randomBed.status = 'reserved';
                            randomBed.lockedBy = simulatedRegNo;
                            randomBed.lockExpires = Date.now() + 30 * 1000; // Simulated shorter lock for faster feedback
                            this.addNotification("Live Lock", `Someone temporarily reserved Room ${randomRoom.roomNo} (${randomRoom.block}) - Bed ${randomBed.bedNo}.`, "info");
                        } else {
                            // Book bed
                            randomBed.status = 'booked';
                            randomBed.bookedBy = { regNo: simulatedRegNo, name: `Student ${simulatedRegNo}` };
                            this.state.simulatedBookingCount++;
                            this.addNotification("Live Booking", `Room ${randomRoom.roomNo} (${randomRoom.block}) Bed ${randomBed.bedNo} is now FULLY BOOKED.`, "danger");
                        }
                        stateChanged = true;
                    }
                }
            }

            if (stateChanged) {
                this.notify();
            }
        }, 1000);
    }
}

// Single instance exports
export const store = new Store();
