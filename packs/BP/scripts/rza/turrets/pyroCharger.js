import { world } from "@minecraft/server";

export function pyroChargerFireball() {
    world.getDimension('overworld').getEntities({ type: 'rza:pyro_charger_fireball' }).forEach(pyroFireball => {
        pyroFireball.dimension.getEntities({ families: ['zombie'], location: pyroFireball.location, maxDistance: 2 }).forEach(zombie => {
            zombie.setOnFire(20, true);
        });
    });

    world.getDimension('nether').getEntities({ type: 'rza:pyro_charger_fireball' }).forEach(pyroFireball => {
        pyroFireball.dimension.getEntities({ families: ['zombie'], location: pyroFireball.location, maxDistance: 2 }).forEach(zombie => {
            zombie.setOnFire(20, true);
        });
    });

    world.getDimension('the_end').getEntities({ type: 'rza:pyro_charger_fireball' }).forEach(pyroFireball => {
        pyroFireball.dimension.getEntities({ families: ['zombie'], location: pyroFireball.location, maxDistance: 2 }).forEach(zombie => {
            zombie.setOnFire(20, true);
        });
    });
    return;
}