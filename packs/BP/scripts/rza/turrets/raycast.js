export function calculateDistance(loc1, loc2) {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    const dz = loc1.z - loc2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function raycast(dimension, from, to, distance, particle) {
    const step = 0.5;
    for (let i = 0; i <= distance; i += step) {
        const t = i / distance;
        const particleLoc = {
            x: from.x + t * (to.x - from.x),
            y: from.y + t * (to.y - from.y),
            z: from.z + t * (to.z - from.z)
        };
        try {
            dimension.spawnParticle(particle, particleLoc);
        }
        catch (e) { }
    }
}
