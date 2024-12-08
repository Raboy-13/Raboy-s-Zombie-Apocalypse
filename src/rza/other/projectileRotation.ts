import { Entity, Vector3 } from "@minecraft/server";

/**
 * Rotates a projectile entity to face a target location in 3D space
 * 
 * @param projectile - The projectile entity to rotate
 * @param projectileLocation - The current {x,y,z} position of the projectile
 * @param targetLocation - The {x,y,z} position the projectile should face
 * 
 * Mathematical process:
 * 1. Calculate distance deltas between projectile and target for each axis
 * 2. Get horizontal distance using Pythagorean theorem
 * 3. Calculate yaw (horizontal rotation) using arctangent of Z/X deltas
 * 4. Calculate pitch (vertical rotation) using arctangent of Y/horizontal distance
 * 5. Convert radians to degrees and adjust for Minecraft's coordinate system
 * 
 * Properties set:
 * - Entity rotation is updated directly
 * - rza:rotation_x - Stores pitch angle
 * - rza:rotation_y - Stores yaw angle
 */
export function faceDirection(projectile: Entity, projectileLocation: Vector3, targetLocation: Vector3) {
    // Calculate distance differences
    const deltaX = targetLocation.x - projectileLocation.x;
    const deltaY = targetLocation.y - projectileLocation.y; 
    const deltaZ = targetLocation.z - projectileLocation.z;

    // Get horizontal distance for pitch calculation
    const horizontalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

    // Calculate rotation angles
    const yaw = ((Math.atan2(deltaZ, deltaX)) * (180 / Math.PI)) - 90;  // -90 adjusts for Minecraft's coordinate system
    const pitch = ((Math.atan2(deltaY, horizontalDistance)) * (-180 / Math.PI));

    // Apply rotation to entity
    const newRotation = { x: pitch, y: yaw };
    projectile.setRotation(newRotation);
    
    // Store rotation values as properties for other systems to reference
    projectile.setProperty('rza:rotation_x', pitch);
    projectile.setProperty('rza:rotation_y', yaw);
    return;
}