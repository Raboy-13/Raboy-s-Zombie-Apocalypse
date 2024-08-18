export function setEntityToCardinalDirection(entity) {
    const xRotation = entity.getRotation().x;
    const yRotation = entity.getRotation().y;
    let newYRotation;
    if (yRotation >= -45 && yRotation < 45) {
        newYRotation = 0;
    }
    else if (yRotation >= 45 && yRotation < 135) {
        newYRotation = 90;
    }
    else if (yRotation >= -135 && yRotation < -45) {
        newYRotation = -90;
    }
    else {
        newYRotation = 180;
    }
    entity.setRotation({ x: xRotation, y: newYRotation });
}
