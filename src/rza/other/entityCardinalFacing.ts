import { Entity } from "@minecraft/server";

/**
 * Snaps an entity's rotation to the nearest cardinal direction (North, South, East, West)
 * Used for entities that should face fixed directions, like turrets or static structures
 * 
 * Cardinal Direction Reference:
 * - East  (0°)   : -45° to 45°
 * - South (90°)  : 45° to 135° 
 * - North (-90°) : -135° to -45°
 * - West  (180°) : 135° to -135°
 * 
 * @param entity - The entity whose rotation should be adjusted
 * @returns void
 * 
 * @example
 * // Snap a turret to face a cardinal direction
 * setEntityToCardinalDirection(turretEntity);
 */
export function setEntityToCardinalDirection(entity: Entity) {
    const xRotation = entity.getRotation().x;
    const yRotation = entity.getRotation().y;

    let newYRotation: number;
    if (yRotation >= -45 && yRotation < 45) {
        newYRotation = 0; // East
    } else if (yRotation >= 45 && yRotation < 135) {
        newYRotation = 90; // South
    } else if (yRotation >= -135 && yRotation < -45) {
        newYRotation = -90; // North
    } else {
        newYRotation = 180; // West
    }

    entity.setRotation({ x: xRotation, y: newYRotation });
}