execute if score @s repair_distance matches 1.. run scoreboard players remove @s repair_distance 1
execute if score @s repair_distance matches 1.. positioned ^^^0.5 run function world/turrets/repair_array/repair_beam

particle rza:repair_array_beam