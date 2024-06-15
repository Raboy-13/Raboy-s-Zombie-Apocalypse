execute if score @s sonic_range matches 1.. run scoreboard players remove @s sonic_range 1
execute if score @s sonic_range matches 1.. run damage @e[family=zombie, r=4] 8 entity_attack entity @s
execute if score @s sonic_range matches 1.. positioned ^^^2 run function world/turrets/sonic_cannon/attachment/step

particle rza:sonic_charge_for_attachment ~~~