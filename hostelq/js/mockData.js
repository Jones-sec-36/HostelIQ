/* -------------------------------------------------------------
 * HostelQ - Mock Data Definition
 * Contains mock students, admins, blocks, and initial room configs
 * ------------------------------------------------------------- */

export const INITIAL_STUDENTS = [
    { regNo: "STU001", name: "Alex Mercer", password: "password", recommendedRoom: { block: "Block A", roomNo: "102" }, bookedRoom: null },
    { regNo: "STU002", name: "David Chen", password: "password", recommendedRoom: { block: "Block B", roomNo: "204" }, bookedRoom: null },
    { regNo: "STU003", name: "Sophia Martinez", password: "password", recommendedRoom: { block: "Block A", roomNo: "105" }, bookedRoom: null },
    { regNo: "STU004", name: "Emily Watson", password: "password", recommendedRoom: null, bookedRoom: null },
    { regNo: "STU005", name: "Liam O'Connor", password: "password", recommendedRoom: { block: "Block C", roomNo: "302" }, bookedRoom: null },
    { regNo: "STU006", name: "Priya Sharma", password: "password", recommendedRoom: { block: "Block B", roomNo: "201" }, bookedRoom: null },
    { regNo: "STU007", name: "James Anderson", password: "password", recommendedRoom: null, bookedRoom: null },
    { regNo: "STU008", name: "Chloe Dupont", password: "password", recommendedRoom: null, bookedRoom: null },
    { regNo: "STU009", name: "Rohan Verma", password: "password", recommendedRoom: null, bookedRoom: null },
    { regNo: "STU010", name: "Zara Khan", password: "password", recommendedRoom: null, bookedRoom: null }
];

export const INITIAL_ADMINS = [
    { username: "admin", password: "password" }
];

export const ROOM_TYPES = {
    "4-in-1 AC": { name: "4-in-1 AC Room", beds: 4, ac: true, price: "$2,400 / yr" },
    "8-in-1 AC": { name: "8-in-1 AC Room", beds: 8, ac: true, price: "$1,800 / yr" },
    "10-in-1 AC": { name: "10-in-1 AC Room", beds: 10, ac: true, price: "$1,400 / yr" },
    "Non AC": { name: "Standard Non-AC Room", beds: 4, ac: false, price: "$1,100 / yr" }
};

// Generate initial room configurations for Block A, B, and C
export function generateInitialRooms() {
    const blocks = ["Block A", "Block B", "Block C"];
    const rooms = [];

    blocks.forEach(block => {
        let roomConfigs = [];
        
        if (block === "Block A") {
            // Block A: Premium AC blocks
            roomConfigs = [
                { roomNo: "101", type: "4-in-1 AC" },
                { roomNo: "102", type: "4-in-1 AC" },
                { roomNo: "103", type: "4-in-1 AC" },
                { roomNo: "104", type: "8-in-1 AC" },
                { roomNo: "105", type: "8-in-1 AC" },
                { roomNo: "106", type: "8-in-1 AC" }
            ];
        } else if (block === "Block B") {
            // Block B: Mixed blocks
            roomConfigs = [
                { roomNo: "201", type: "8-in-1 AC" },
                { roomNo: "202", type: "8-in-1 AC" },
                { roomNo: "203", type: "Non AC" },
                { roomNo: "204", type: "Non AC" },
                { roomNo: "205", type: "Non AC" },
                { roomNo: "206", type: "Non AC" }
            ];
        } else {
            // Block C: Large and Non AC blocks
            roomConfigs = [
                { roomNo: "301", type: "10-in-1 AC" },
                { roomNo: "302", type: "10-in-1 AC" },
                { roomNo: "303", type: "10-in-1 AC" },
                { roomNo: "304", type: "Non AC" },
                { roomNo: "305", type: "Non AC" },
                { roomNo: "306", type: "Non AC" }
            ];
        }

        roomConfigs.forEach(cfg => {
            const typeInfo = ROOM_TYPES[cfg.type];
            const beds = [];
            
            for (let i = 1; i <= typeInfo.beds; i++) {
                // Pre-book some beds to make the interface look realistic
                let status = "available";
                let bookedBy = null;
                
                // Let's seed a few booked beds for other simulated students
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
