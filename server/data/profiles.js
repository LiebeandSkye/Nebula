/**
 * profiles.js — Server-side profile validation.
 * Only stores IDs and names needed for validation and lobby display.
 * Full profile data (descriptions, colors, images) lives on the client.
 */
// Id | Name 

const PROFILE_MAP = new Map([
    ["setsu", "Setsu"],
    ["sq", "SQ"],
    ["raqio", "Reze"],
    ["comet", "Femboy"],
    ["stella", "Akane"],
    ["kornaros", "Aqua"],
    ["yuriko", "Yuriko"],
    ["jonas", "ishowspeed"],
    ["parallax", "L"],
    ["nyx", "Kira"],
    ["voss", "Yuri"],
    ["echo", "Columbina"],
    ["chisa", "Chisa"],
    ["maomao", "Maomao"],
    ["phrolova", "Phrolova"],
    ["miyu", "Miyu"],
    ["alya", "Alya"],
    ["mountain", "Mountain"],
    ["superman", "Superman"],
    ["batman", "Batman"],
    ["wonderwomen", "Wonder Woman"],
    ["osaragi", "Osaragi"],
]);

function isValidProfileId(id) {
    return PROFILE_MAP.has(id);
}

function getProfileById(id) {
    const name = PROFILE_MAP.get(id);
    return name ? { id, name } : null;
}

module.exports = { isValidProfileId, getProfileById };
