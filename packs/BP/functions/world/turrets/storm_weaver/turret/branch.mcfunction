execute if score @s lightning_branch matches 1.. run scoreboard players remove @s lightning_branch 1
execute if score @s lightning_branch matches 1.. if entity @e[family=zombie, r=2, c=1, tag=!chainer] run scoreboard players set @s lightning_branch 0
execute if score @s lightning_branch matches 1.. as @e[family=zombie, r=2, c=1, tag=!chainer] as @s run tag @s add chainer
execute if score @s lightning_branch matches 0 if score @s lightning_branch_length matches 1.. positioned ~~~ run function world/turrets/storm_weaver/turret/connect_branch
execute if score @s lightning_chain_length matches 0 run scoreboard players set @s remove_chainer_tag_delay 20

damage @e[family=zombie, r=2, c=1] 8 entity_attack
execute if score @s lightning_branch matches 1.. positioned ^^^0.5 run function world/turrets/storm_weaver/turret/branch

particle rza:lightning ~~~