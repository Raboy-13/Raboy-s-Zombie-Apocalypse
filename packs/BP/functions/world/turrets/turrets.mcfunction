##Arrow Turret
execute as @e[type=zom:arrow_turret, tag=!active] at @s if block ~ ~-0.5 ~ zom:turret_base run event entity @s zom:activate
execute as @e[type=zom:arrow_turret, tag=!active] at @s if block ~ ~-0.5 ~ zom:turret_base run tag @s add active
execute as @e[type=zom:arrow_turret, tag=active] at @s unless block ~ ~-0.5 ~ zom:turret_base run event entity @s zom:deactivate
execute as @e[type=zom:arrow_turret, tag=active] at @s unless block ~ ~-0.5 ~ zom:turret_base run tag @s remove active

##Pyro Charger
execute as @e[type=zom:pyro_charger, tag=!active] at @s if block ~ ~-0.5 ~ zom:turret_base run event entity @s zom:activate
execute as @e[type=zom:pyro_charger, tag=!active] at @s if block ~ ~-0.5 ~ zom:turret_base run tag @s add active
execute as @e[type=zom:pyro_charger, tag=active] at @s unless block ~ ~-0.5 ~ zom:turret_base run event entity @s zom:deactivate
execute as @e[type=zom:pyro_charger, tag=active] at @s unless block ~ ~-0.5 ~ zom:turret_base run tag @s remove active

##Sonic Cannon
execute as @e[type=zom:sonic_cannon, tag=!active] at @s if block ~ ~-0.5 ~ zom:turret_base run event entity @s zom:activate
execute as @e[type=zom:sonic_cannon, tag=!active] at @s if block ~ ~-0.5 ~ zom:turret_base run tag @s add active
execute as @e[type=zom:sonic_cannon, tag=active] at @s unless block ~ ~-0.5 ~ zom:turret_base run event entity @s zom:deactivate
execute as @e[type=zom:sonic_cannon, tag=active] at @s unless block ~ ~-0.5 ~ zom:turret_base run tag @s remove active