import { MolangVariableMap } from "@minecraft/server";
import { particleDirection } from "rza/turrets/pyroCharger";
export const vmap = new MolangVariableMap();
vmap.setVector3('direction', particleDirection);
