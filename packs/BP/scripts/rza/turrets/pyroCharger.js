export function pyroChargerFireball(pyroFireball) {
    if (pyroFireball?.isValid)
        pyroFireball.dimension.getEntities({ families: ['zombie'], location: pyroFireball.location, maxDistance: 2 }).forEach(zombie => {
            zombie.setOnFire(20, true);
        });
    return;
}
