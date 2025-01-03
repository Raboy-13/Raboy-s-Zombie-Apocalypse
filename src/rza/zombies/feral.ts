import { Entity, EntityComponentTypes, EntityTypeFamilyComponent } from "@minecraft/server";

export function ferralLeap(entity: Entity) {
    const feral = entity;
    const jumpPowerMin = 1;
    const jumpPowerMax = 2;
    const jumpPowerVal = Math.random() * (jumpPowerMax - jumpPowerMin) + jumpPowerMin;
    const jumpPower = Number(jumpPowerVal.toFixed(3));
    const direction = feral.getViewDirection();
    const targets = feral.dimension.getEntitiesFromRay(feral.getHeadLocation(), direction, { maxDistance: 2 });

    for (const entity of targets) {
        const target = entity.entity;
        const excludedEntity = target.hasComponent(EntityComponentTypes.TypeFamily) && (target.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).getTypeFamilies().some(family => family == 'zombie' || family == 'turret' || family == 'inanimate');
        if (!excludedEntity) {
            try { target.applyKnockback(direction.x, direction.z, 4, 1); } catch (error) { }

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