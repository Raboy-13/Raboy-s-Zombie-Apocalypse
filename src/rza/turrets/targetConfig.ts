import { Entity, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

/**
 * Configures targeting settings for a turret entity through a UI form.
 * @param player - The player interacting with the turret configuration
 * @param turret - The turret entity being configured
 * @param turretName - Display name of the turret for UI and messages
 * 
 * @description
 * Opens a modal form that allows players to:
 * - Toggle prioritization of mutated zombies
 * - Select specific zombie types to target (All, Walkers, Miners, Ferals, Spitters, Alphas)
 * 
 * The function maintains the last selected configuration and updates the turret's properties:
 * - 'rza:prioritize_mutants' (boolean)
 * - 'rza:target_zombies' (string)
 * 
 * After configuration, it triggers appropriate events on the turret entity and
 * sends confirmation messages to the player.
 */
export function turretConfigurator(player: Player, turret: Entity, turretName: string) {
    //Get the last configuration on the entity properties and apply it into the selections
    let zombieSelection = ['Walkers', 'Miners', 'Ferals', 'Spitters', 'Alphas'];
    const selectedZombieType = turret.getProperty('rza:target_zombies') as string;

    // Remove the selectedZombieType from the array
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);

    // Add the selectedZombieType as the first element in the array
    zombieSelection.unshift(selectedZombieType);

    new ModalFormData()
        .title(`${turretName}`)
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants') as boolean)
        .dropdown('§cPriority Target', zombieSelection)
        .show(player)
        .then((result) => {
            if (!result || !result.formValues) return;
            const [toggle, dropdown] = result.formValues;
            const selectedZombieType = zombieSelection[dropdown as number];
            if (toggle !== undefined) {
                turret.setProperty('rza:prioritize_mutants', toggle);
            }
            if (selectedZombieType !== undefined) {
                turret.setProperty('rza:target_zombies', selectedZombieType);
            }

            //All Zombies: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'All') {
                player.sendMessage(`[${turretName}] Targeting §cAll Zombies§r: Not Prioritizing Mutants`);
                turret.triggerEvent('rza:target_all_zombies');
            }

            //All Zombies: Prioritize Mutants
            if (toggle && selectedZombieType === 'All') {
                player.sendMessage(`[${turretName}] Targeting §cAll Zombies§r: Prioritizing Mutants`);
                turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
            }

            //Walkers: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Walkers') {
                player.sendMessage(`[${turretName}] Targeting §cWalkers§r: Not Prioritizing Mutants`);
                turret.triggerEvent('rza:target_walkers');
            }

            //Walkers: Prioritize Mutants
            if (toggle && selectedZombieType === 'Walkers') {
                player.sendMessage(`[${turretName}] Targeting §cWalkers§r: Prioritizing Mutants`);
                turret.triggerEvent('rza:target_walkers_prioritize_mutants');
            }

            //Miners: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Miners') {
                player.sendMessage(`[${turretName}] Targeting §cMiners§r: Not Prioritizing Mutants`);
                turret.triggerEvent('rza:target_miners');
            }

            //Miners: Prioritize Mutants
            if (toggle && selectedZombieType === 'Miners') {
                player.sendMessage(`[${turretName}] Targeting §cMiners§r: Prioritizing Mutants`);
                turret.triggerEvent('rza:target_miners_prioritize_mutants');
            }

            //Ferals: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Ferals') {
                player.sendMessage(`[${turretName}] Targeting §cFerals§r: Not Prioritizing Mutants`);
                turret.triggerEvent('rza:target_ferals');
            }

            //Ferals: Prioritize Mutants
            if (toggle && selectedZombieType === 'Ferals') {
                player.sendMessage(`[${turretName}] Targeting §cFerals§r: Prioritizing Mutants`);
                turret.triggerEvent('rza:target_ferals_prioritize_mutants');
            }

            //Spitters: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Spitters') {
                player.sendMessage(`[${turretName}] Targeting §cSpitters§r: Not Prioritizing Mutants`);
                turret.triggerEvent('rza:target_spitters');
            }

            //Spitters: Prioritize Mutants
            if (toggle && selectedZombieType === 'Spitters') {
                player.sendMessage(`[${turretName}] Targeting §cSpitters§r: Prioritizing Mutants`);
                turret.triggerEvent('rza:target_spitters_prioritize_mutants');
            }

            //Alphas: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Alphas') {
                player.sendMessage(`[${turretName}] Targeting §cAlphas§r: Not Prioritizing Mutants`);
                turret.triggerEvent('rza:target_alphas');
            }

            //Alphas: Prioritize Mutants
            if (toggle && selectedZombieType === 'Alphas') {
                player.sendMessage(`[${turretName}] Targeting §cAlphas§r: Prioritizing Mutants`);
                turret.triggerEvent('rza:target_alphas_prioritize_mutants');
            }
        }).catch(() => {
            player.sendMessage(`[SYSTEM] §cConfiguration Canceled§r: Resetting to previous configuration.`);
        }
        );
    return;
}

/**
 * Configures a Pulsar System turret's item conversion settings through a UI form.
 * @param player - The player interacting with the Pulsar System
 * @param turret - The Pulsar System turret entity being configured
 * 
 * @description
 * Opens a modal form that allows players to:
 * - Toggle the system's active state
 * - Select the type of conversion (Charcoal or XP)
 * 
 * The function maintains the last selected configuration and updates the turret's properties:
 * - 'rza:active_state' (boolean)
 * - 'rza:convert_items_to' (string)
 * 
 * Configuration changes are immediately applied and reflected in:
 * - Visual feedback through player messages
 * - Turret entity properties
 * 
 * If the configuration is cancelled, the system retains its previous settings
 * and notifies the player.
 */
export function pulsarSystemConfigurator(player: Player, turret: Entity) {
    //Get the last configuration on the entity properties and apply it into the selections
    let convertTo = ['Charcoal', 'XP'];
    const selectedConvertType = turret.getProperty('rza:convert_items_to') as string;

    // Remove the selectedConvertType from the array
    convertTo = convertTo.filter(convertType => convertType !== selectedConvertType);

    // Add the selectedConvertType as the first element in the array
    convertTo.unshift(selectedConvertType);

    new ModalFormData()
        .title("§cPulsar System§r")
        .toggle('Active', turret.getProperty('rza:active_state') as boolean)
        .dropdown('Convert Items to', convertTo)
        .show(player)
        .then((result) => {
            if (!result || !result.formValues) return;
            const [toggle, dropdown] = result.formValues;
            const selectedConvertType = convertTo[dropdown as number];

            //Active: Convert Items to Charcoal
            if (toggle && selectedConvertType === 'Charcoal') {
                player.sendMessage('[§cPulsar System§r] §2Active§r: Converting items to Charcoal');
            }

            //Active: Convert Items to XP Orbs
            if (toggle && selectedConvertType === 'XP') {
                player.sendMessage('[§cPulsar System§r] §2Active§r: Converting items to XP Orbs');
            }

            //Inactive: Convert Items to Charcoal
            if (!toggle && selectedConvertType === 'Charcoal') {
                player.sendMessage('[§cPulsar System§r] §4Inactive§r: Converting items to Charcoal');
            }

            //Inactive: Convert Items to XP Orbs
            if (!toggle && selectedConvertType === 'XP') {
                player.sendMessage('[§cPulsar System§r] §4Inactive§r: Converting items to XP Orbs');
            }

            if (toggle !== undefined) {
                turret.setProperty('rza:active_state', toggle);
            }
            if (selectedConvertType !== undefined) {
                turret.setProperty('rza:convert_items_to', selectedConvertType);
            }
        }).catch(() => {
            player.sendMessage(`[SYSTEM] §cConfiguration Canceled§r: Resetting to previous configuration.`);
        }
        );
    return;
}