export function sonicCannonHit(entity, source) {
    const cannonDir = source.getViewDirection();
    entity.applyImpulse({
        x: cannonDir.x * 3,
        y: cannonDir.y * 8,
        z: cannonDir.z * 3
    });
    return;
}
