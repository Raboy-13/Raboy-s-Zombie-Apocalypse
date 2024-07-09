export function sonicCannonHit(entity, source) {
    const cannonDir = source.getViewDirection();
    entity.applyImpulse({
        x: cannonDir.x * 3,
        y: cannonDir.y * 8,
        z: cannonDir.z * 3
    });
    return;
}
export function sonicCannonAttachmentHit(entity, source) {
    const cannonDir = source.getViewDirection();
    entity.applyImpulse({
        x: cannonDir.x * 3,
        y: cannonDir.y * 4,
        z: cannonDir.z * 3
    });
    return;
}
