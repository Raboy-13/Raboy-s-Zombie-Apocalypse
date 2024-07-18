import { Dimension, Vector3 } from "@minecraft/server"

// Helper function to calculate the distance between the repair array and repairable locations
export function calculateDistance(loc1: Vector3, loc2: Vector3): number {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    const dz = loc1.z - loc2.z;

    //Distance calculation will be 1-block step
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function raycast(dimension: Dimension, from: Vector3, to: Vector3, distance: number, particle: string) {
    // Step size is 0.5 blocks
    const step = 0.5;

    for (let i = 0; i <= distance; i += step) {
        const t = i / distance; // Normalized interpolation factor
        const particleLoc: Vector3 = {
            x: from.x + t * (to.x - from.x),
            y: from.y + t * (to.y - from.y),
            z: from.z + t * (to.z - from.z)
        }
        try {
            dimension.spawnParticle(particle, particleLoc);
        } catch (e) { }
    }
}