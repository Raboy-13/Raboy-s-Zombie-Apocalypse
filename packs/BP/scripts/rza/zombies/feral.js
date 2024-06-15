export function ferralLeap(entity) {
    const feral = entity;
        const jumpPowerMin = 1;
        const jumpPowerMax = 2;
        const jumpPowerVal = Math.random() * (jumpPowerMax - jumpPowerMin) + jumpPowerMin;
        const jumpPower = Number(jumpPowerVal.toFixed(3));
        const direction = feral.getViewDirection();
        const targets = feral.dimension.getEntitiesFromRay(feral.getHeadLocation(), direction, { maxDistance: 2 });

        for (const entity of targets) {
            const target = entity.entity;
            if (target.matches({ excludeFamilies: ['zombie', 'turret'] })) {
                target.applyKnockback(direction.x, direction.z, 4, 1);
            }
        }

        feral.applyImpulse(
            {
                x: direction.x * jumpPower,
                y: direction.y * jumpPower,
                z: direction.z * jumpPower
            }
        );
}