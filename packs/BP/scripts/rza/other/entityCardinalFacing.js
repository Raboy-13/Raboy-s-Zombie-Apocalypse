// Function to set entity rotation to the nearest cardinal direction (For non-rotating, stationary entities)
export function setEntityToCardinalDirection(entity) {
    const xRotation = entity.getRotation().x;
    const yRotation = entity.getRotation().y;
    let newYRotation;
    if (yRotation >= -45 && yRotation < 45) {
        newYRotation = 0; // East
    }
    else if (yRotation >= 45 && yRotation < 135) {
        newYRotation = 90; // South
    }
    else if (yRotation >= -135 && yRotation < -45) {
        newYRotation = -90; // North
    }
    else {
        newYRotation = 180; // West
    }
    entity.setRotation({ x: xRotation, y: newYRotation });
}
