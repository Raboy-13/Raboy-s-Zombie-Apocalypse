export function pyroChargerFireball(pyroFireball) {
    try {
        if (pyroFireball && pyroFireball.isValid()) {
            pyroFireball.dimension.getEntities({
                families: ['zombie'],
                location: pyroFireball.location,
                maxDistance: 2
            }).forEach(zombie => {
                zombie.setOnFire(20, true);
            });
        }
    }
    catch (error) {
        console.warn(`Error in pyroChargerFireball: ${error}`);
    }
    return;
}
