/**
 * profiles.js — Static character profiles.
 * Bundled with the client — no server fetch needed.
 */

export const PROFILES = [
    {
        id: "setsu",
        name: "Setsu",
        description: "Quiet. Observant. Trusts no one by default.",
        color: "#a8d8ff",
    },
    {
        id: "sq",
        name: "SQ",
        description: "An AI unit. Processes facts. Immune to persuasion.",
        color: "#00f5ff",
    },
    {
        id: "raqio",
        name: "Reze",
        description: "Charismatic. Suspiciously good at deflection.",
        color: "#ff9ef5",
    },
    {
        id: "comet",
        name: "Femboy",
        description: "Nervous energy. Talks too much when scared.",
        color: "#ffe066",
    },
    {
        id: "stella",
        name: "Akane",
        description: "Calm under pressure. Reads people well.",
        color: "#b0ffb8",
    },
    {
        id: "kornaros",
        name: "Aqua",
        description: "Veteran crew member. Seen it all before.",
        color: "#ffb347",
    },
    {
        id: "ruby",
        name: "Ruby",
        description: "A fiery girl with a sharp tongue.",
        color: "#f530b3",
    },
    {
        id: "yuriko",
        name: "Yuriko",
        description: "Sweet exterior. Ruthless interior.",
        color: "#ffaec0",
    },
    {
        id: "jonas",
        name: "ishowspeed",
        description: "The engineer type. Methodical. Skeptical.",
        color: "#c8b8ff",
    },
    {
        id: "parallax",
        name: "L",
        description: "Says nothing for hours, then drops a bombshell.",
        color: "#ff6b6b",
    },
    {
        id: "nyx",
        name: "Kira",
        description: "AHHAHAHHA Souda... boku ga KIRA DA.",
        color: "#66e0ff",
    },
    {
        id: "voss",
        name: "Yuri",
        description: "No memory? Not really.",
        color: "#ffd700",
    },
    {
        id: "echo",
        name: "Columbina",
        description: "Whoever plays me, is without a doubt, a hardcore simp.",
        color: "#d0ffe8",
    },
    {
        id: "chisa",
        name: "Chisa",
        description: "absolute peak",
        color: "#ff1c1c",
    },
    {
        id: "maomao",
        name: "Maomao",
        description: "doctor",
        color: "#4eff33",
    },
    {
        id: "phrolova",
        name: "Phrolova",
        description: "requested by rinz",
        color: "#f80000",
    },
    {
        id: "miyu",
        name: "Miyu",
        description: "requested by seth",
        color: "#ff26db",
    },
    {
        id: "alya",
        name: "Alya",
        description: "requested by seth",
        color: "#ffffff",
    },
    {
        id: "mountain",
        name: "Mountain",
        description: "A towering figure with a stoic demeanor.",
        color: "#8b4513",
    },
    {
        id: "superman",
        name: "Superman",
        description: "The last son of Krypton",
        color: "#00bfff",
    }, 
    {
        id: "batman",
        name: "Batman",
        description: "The Dark Knight",
        color: "#323232",
    }, 
    {   
        id: "wonderwomen",
        name: "Wonder Woman",
        description: "Amazonian warrior princess",
        color: "#ff69b4",
    },
    {
        id: "osaragi",
        name: "Osaragi",
        description: "A mysterious figure with a penchant for riddles.",
        color: "#7fffd4",
    },
    {
        id: "demigod",
        name: "Demi god",
        description: "A demigod with godly powers.",
        color: "#ffffff",
    },
    {
        id: "gnosia",
        name: "404",
        description: "Unknown",
        color: "#ffffff",
    },
    {
        id: "king",
        name: "King",
        description: "Luckiest Man",
        color: "#f23e0c"
    },
    {
        id: "ayanokoji",
        name: "Ayanokoji",
        description: "Manipulative",
        color: "#e30000",
    },
    {
        id: "mitsuri",
        name: "Mitsuri",
        description: "A cheerful and energetic girl.",
        color: "#f82fff",
    },
    {
        id: "aizen",
        name: "Aizen",
        description: "Aizen Sosuke",
        color: "#89008d",
    },
    {
        id: "fatcat",
        name: "Fat Cat",
        description: "A chubby cat with a round body.",
        color: "#ffffff",
    },
];

/** Color lookup by profile ID */
export const AVATAR_COLORS = Object.fromEntries(PROFILES.map(p => [p.id, p.color]));

/** Set of valid profile IDs */
export const VALID_PROFILE_IDS = new Set(PROFILES.map(p => p.id));
