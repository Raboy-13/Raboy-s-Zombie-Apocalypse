import { Entity } from "@minecraft/server";
export function pyroChargerFireball(pyroFireball: Entity) {
    try {
        if (pyroFireball && pyroFireball.isValid()) pyroFireball.dimension.getEntities({ families: ['zombie'], location: pyroFireball.location, maxDistance: 2 }).forEach(zombie => {
            zombie.setOnFire(20, true);
        });
    } catch (error) { }

    return;
}