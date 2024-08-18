import { Entity, Vector3 } from "@minecraft/server";

export function faceDirection(projectile: Entity, projectileLocation: Vector3, targetLocation: Vector3) {
    // Rotate the projectile to face the target direction
    const deltaX = targetLocation.x - projectileLocation.x;
    const deltaY = targetLocation.y - projectileLocation.y;
    const deltaZ = targetLocation.z - projectileLocation.z;
    const horizontalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    const yaw = ((Math.atan2(deltaZ, deltaX)) * (180 / Math.PI)) - 90;
    const pitch = ((Math.atan2(deltaY, horizontalDistance)) * (-180 / Math.PI));
    const newRotation = { x: pitch, y: yaw };
    projectile.setRotation(newRotation);
    projectile.setProperty('ptd:rotation_x', pitch);
    projectile.setProperty('ptd:rotation_y', yaw);
    return;
}