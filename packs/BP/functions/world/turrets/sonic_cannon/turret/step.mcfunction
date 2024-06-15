execute if score @s sonic_range matches 1.. run scoreboard players remove @s sonic_range 1
execute if score @s sonic_range matches 1.. run damage @e[family=zombie, r=5] 10 entity_attack entity @s
execute if score @s sonic_range matches 1.. positioned ^^^2 run function world/turrets/sonic_cannon/turret/step

particle rza:sonic_charge