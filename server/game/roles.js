/**
 * roles.js - Role assignment with optional host-controlled Gnosia count.
 */

const GNOSIA_ROLES = new Set(["gnosia", "illusionist"]);

function isGnosiaRole(role) {
    return GNOSIA_ROLES.has(role);
}

function countGnosiaPlayers(gameState) {
    return gameState.players.filter((player) => isGnosiaRole(player.role)).length;
}

function appearsGnosiaToEngineer(player) {
    return !!player && isGnosiaRole(player.role);
}

function getDoctorRevealRole(player) {
    if (!player) return null;
    if (player.role === "traitor") return "human";
    if (player.role === "illusionist") return "gnosia";
    return player.role;
}

function assignRoles(gameState) {
    const { players, settings } = gameState;
    const total = players.length;
    if (total < 2) throw new Error("Need at least 2 players.");

    const rolePool = [];

    let gnosiaCount;
    if (settings.gnosiaCount && settings.gnosiaCount >= 1) {
        gnosiaCount = Math.min(settings.gnosiaCount, total - 1);
    } else {
        gnosiaCount = Math.max(1, Math.floor(total / 3));
    }

    if (settings.hasIllusionist && gnosiaCount >= 1) {
        rolePool.push("illusionist");
        for (let i = 1; i < gnosiaCount; i++) rolePool.push("gnosia");
    } else {
        for (let i = 0; i < gnosiaCount; i++) rolePool.push("gnosia");
    }

    const specials = [];
    if (settings.hasEngineer) specials.push("engineer");
    if (settings.hasDoctor) specials.push("doctor");
    if (settings.hasGuardian) specials.push("guardian");
    if (settings.hasLawyer) specials.push("lawyer");
    if (settings.hasTraitor && Math.random() < 0.5) specials.push("traitor");

    const maxSpecials = Math.max(0, total - gnosiaCount);
    rolePool.push(...specials.slice(0, maxSpecials));

    while (rolePool.length < total) rolePool.push("human");

    for (let i = rolePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
    }

    for (let i = 0; i < players.length; i++) {
        players[i].role = rolePool[i];
    }

    console.log(`[Roles] ${gameState.roomId}:`, players.map((player) => `${player.username}=${player.role}`));
}

function getGnosiaIds(gameState) {
    return gameState.players.filter((player) => isGnosiaRole(player.role)).map((player) => player.id);
}

function buildRolePayload(player, gameState) {
    const payload = {
        role: player.role,
        description: ROLE_DESCRIPTIONS[player.role] || "",
    };

    if (isGnosiaRole(player.role)) {
        payload.gnosiaAllies = gameState.players
            .filter((ally) => isGnosiaRole(ally.role) && ally.id !== player.id)
            .map((ally) => ({
                id: ally.id,
                username: ally.username,
                profileId: ally.profileId,
                profileName: ally.profileName || null,
            }));
    }

    return payload;
}

const ROLE_DESCRIPTIONS = {
    gnosia: "You are Gnosia. Deceive the crew. Each night, coordinate with your allies to eliminate one human. You win when Gnosia outnumber humans.",
    illusionist: "You are the Illusionist. Before the mission begins, infect one crew member to turn them into Gnosia. After that, you act exactly like Gnosia and appear as Gnosia to all checks.",
    human: "You are Human. Identify and vote out all Gnosia before they take over the ship.",
    engineer: "You are the Engineer. Each night, scan one player to learn if they are Gnosia. If they are, they receive a warning - not your identity.",
    doctor: "You are the Doctor. Each night, inspect one player in Cold Sleep to reveal their true role.",
    guardian: "You are the Guardian Angel. Each night, protect one other player. If the Gnosia target them, the kill is blocked.",
    lawyer: "You are the Lawyer. Once per game, you may dismiss the vote during any voting round - cancelling it entirely so no one is eliminated.",
    traitor: "You are the Traitor. You have no special ability, but you appear human to all scans and inspections. You win with the Gnosia.",
};

module.exports = {
    assignRoles,
    getGnosiaIds,
    buildRolePayload,
    ROLE_DESCRIPTIONS,
    isGnosiaRole,
    countGnosiaPlayers,
    appearsGnosiaToEngineer,
    getDoctorRevealRole,
};
