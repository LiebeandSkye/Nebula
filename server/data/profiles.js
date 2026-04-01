/**
 * profiles.js
 * Server-controlled character profiles.
 * Clients NEVER define or modify these — they only pick an ID.
 * Inspired by Gnosia cast. Minimum 12 profiles enforced.
 */

const PROFILES = [
    {
        id: "setsu",
        name: "Setsu",
        description: "Quiet. Observant. Trusts no one by default.",
        avatar: "./profiles/setsu.jpg",
        color: "#a8d8ff",
    },
    {
        id: "sq",
        name: "SQ",
        description: "An AI unit. Processes facts. Immune to persuasion.",
        avatar: "/profiles/sq.jpg",
        color: "#00f5ff",
    },
    {
        id: "raqio",
        name: "Reze",
        description: "Charismatic. Suspiciously good at deflection.",
        avatar: "/profiles/raqio.jpg",
        color: "#ff9ef5",
    },
    {
        id: "comet",
        name: "Femboy",
        description: "Nervous energy. Talks too much when scared.",
        avatar: "/profiles/comet.jpg",
        color: "#ffe066",
    },
    {
        id: "stella",
        name: "Akane",
        description: "Calm under pressure. Reads people well.",
        avatar: "/profiles/stella.jpg",
        color: "#b0ffb8",
    },
    {
        id: "kornaros",
        name: "Aqua",
        description: "Veteran crew member. Seen it all before.",
        avatar: "/profiles/kornaros.jpg",
        color: "#ffb347",
    },
    {
        id: "yuriko",
        name: "Yuriko",
        description: "Sweet exterior. Ruthless interior.",
        avatar: "/profiles/yuriko.jpg",
        color: "#ffaec0",
    },
    {
        id: "jonas",
        name: "ishowspeed",
        description: "The engineer type. Methodical. Skeptical.",
        avatar: "/profiles/jonas.jpg",
        color: "#c8b8ff",
    },
    {
        id: "nyx",
        name: "L",
        description: "Says nothing for hours, then drops a bombshell.",
        avatar: "/profiles/nyx.jpg",
        color: "#ff6b6b",
    },
    {
        id: "parallax",
        name: "Kira",
        description: "AHHAHAHHA Souda... boku ga KIRA DA.",
        avatar: "/profiles/parallax.jpg",
        color: "#66e0ff",
    },
    {
        id: "voss",
        name: "Yuri",
        description: "No memory? Not really.",
        avatar: "/profiles/voss.jpg",
        color: "#ffd700",
    },
    {
        id: "echo",
        name: "Columbina",
        description: "Whoever plays me, is without a doubt, a hardcore simp.",
        avatar: "/profiles/echo.jpg",
        color: "#d0ffe8",
    },
    {
        id: 'chisa',
        name: 'Chisa',
        description: "absolute peak",
        avatar: "/profiles/chisa.webp",
        color: "#ff1c1c"
    },
    {
        id: 'maomao',
        name: 'Maomao',
        description: "doctor",
        avatar: "/profiles/maomao.webp",
        color: "#4eff33"
    },
    {
        id: 'phrolova',
        name: 'Phrolova',
        description: "requested by rinz",
        avatar: "/profiles/phrolova.webp",
        color: "#f80000"
    },
    {
        id: 'miyu',
        name: 'Miyu',
        description: "requested by seth",
        avatar: "/profiles/miyu.webp",
        color: "#ff26db"
    },
    {
        id: 'alya',
        name: 'Alya',
        description: "requested by seth",
        avatar: "/profiles/alya.jpg",
        color: "#ffffff"
    }
];

/**
 * Returns all profiles (safe to send to clients — no sensitive data here).
 */
function getAllProfiles() {
    return PROFILES;
}

/**
 * Returns a single profile by ID, or null if not found.
 * @param {string} id
 */
function getProfileById(id) {
    return PROFILES.find((p) => p.id === id) || null;
}

/**
 * Validates that a profile ID exists.
 * @param {string} id
 * @returns {boolean}
 */
function isValidProfileId(id) {
    return PROFILES.some((p) => p.id === id);
}

module.exports = { getAllProfiles, getProfileById, isValidProfileId, PROFILES };