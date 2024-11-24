import { Dimension, Entity, Vector3, world } from "@minecraft/server";
import { system } from "@minecraft/server";

/**
 * Represents a node in the pathfinding graph
 * @property pos - The position in 3D space
 * @property g - Cost from start to current node
 * @property h - Estimated cost from current node to goal (heuristic)
 * @property f - Total cost (g + h)
 * @property parent - Reference to the previous node in the path
 */
interface Node {
    pos: Vector3;
    g: number;
    h: number;
    f: number;
    parent?: Node;
}

/**
 * A* Pathfinding implementation for Minecraft Bedrock
 * Handles 3D pathfinding with obstacle avoidance and optimization
 */
class PathFinder {
    /**
     * Set of block types that entities can pass through
     * Includes air, water, and various vegetation
     */
    private static readonly PASSABLE_BLOCKS = new Set([
        'minecraft:air',
        'minecraft:water',
        'minecraft:short_grass',
        'minecraft:tall_grass',
        'minecraft:fern',
        'minecraft:large_fern',
        'minecraft:dandelion',
        'minecraft:poppy',
        'minecraft:blue_orchid',
        'minecraft:allium',
        'minecraft:azure_bluet',
        'minecraft:red_tulip',
        'minecraft:orange_tulip',
        'minecraft:white_tulip',
        'minecraft:pink_tulip',
        'minecraft:oxeye_daisy',
        'minecraft:cornflower',
        'minecraft:lily_of_the_valley',
        'minecraft:wither_rose',
        'minecraft:sunflower',
        'minecraft:lilac',
        'minecraft:rose_bush',
        'minecraft:peony'
    ]);

    /**
     * Class properties:
     * @property dimension - The Minecraft dimension to pathfind in
     * @property goal - Target destination Vector3
     * @property openSet - Nodes to be evaluated
     * @property closedSet - Already evaluated nodes
     * @property failedChecks - Tracks positions that failed validation
     * @property blockCache - Caches block passability results
     */
    private dimension: Dimension;
    private goal: Vector3;
    private openSet: Node[] = [];
    private closedSet = new Set<string>();
    private failedChecks = new Map<string, number>(); // Track failed checks per position
    private blockCache = new Map<string, boolean>(); // Cache block check results
    private lastFailedPos: string | null = null; // Track last failed position
    private spreadLevel = 1; // Track current spread level
    private readonly POINT_SPACING = 1; // Distance between points in blocks
    private readonly CORNER_SMOOTHNESS = 5; // Higher = smoother corners (1-5 recommended)

    /**
     * Calculates the heuristic distance between two points using Manhattan distance
     * @param start Starting position
     * @param end End position
     * @returns Estimated distance between points
     */
    private heuristic(start: Vector3, end: Vector3): number {
        return Math.abs(start.x - end.x) + 
               Math.abs(start.y - end.y) + 
               Math.abs(start.z - end.z);
    }

    constructor(dimension: Dimension, goal: Vector3) {
        this.dimension = dimension;
        this.goal = goal;
    }

    /**
     * Initiates pathfinding from start to goal position
     * Implements A* algorithm with optimizations for Minecraft's world
     * @param start Starting position
     * @returns Array of positions forming the path, or empty array if no path found
     */
    async findPath(start: Vector3): Promise<Vector3[]> {
        // Debug start

        this.openSet = [];
        this.closedSet.clear();
        this.failedChecks.clear(); // Reset failed checks at start of new path
        this.blockCache.clear(); // Clear cache at start of new path

        const startNode: Node = {
            pos: start,
            g: 0,
            h: this.heuristic(start, this.goal),
            f: 0
        };
        startNode.f = startNode.g + startNode.h;
        this.openSet.push(startNode);

        let iterations = 0;
        const maxIterations = 1000; // Prevent infinite loops

        while (this.openSet.length > 0 && iterations < maxIterations) {
            iterations++;

            // this.dimension.runCommand(`title @a actionbar §eIteration: ${iterations}`);

            if (iterations > 300 && iterations % 50 === 0) await system.waitTicks(1); // Throttle loop
            // Get node with lowest f score
            const current = this.openSet.reduce((min, node) => 
                (node.f < min?.f || !min) ? node : min);

            this.dimension.spawnParticle('rza:ignite_red', current.pos);

            // Check if we reached the goal
            if (this.heuristic(current.pos, this.goal) < 1) {
                world.sendMessage(`§aPath found in ${iterations} iterations`);
                return this.reconstructPath(current);
            }

            // Remove current from openSet
            this.openSet = this.openSet.filter(node => node !== current);
            this.closedSet.add(this.posToString(current.pos));

            // Process neighbors
            const neighbors = await this.getNeighbors(current.pos);
            for (const neighborPos of neighbors) {
                if (this.closedSet.has(this.posToString(neighborPos))) {
                    continue;
                }

                const g = current.g + this.heuristic(current.pos, neighborPos);
                const h = this.heuristic(neighborPos, this.goal);
                const f = g + h;

                const neighborNode: Node = {
                    pos: neighborPos,
                    g: g,
                    h: h,
                    f: f,
                    parent: current
                };

                const existingNode = this.openSet.find(n =>
                    n.pos.x === neighborPos.x &&
                    n.pos.y === neighborPos.y &&
                    n.pos.z === neighborPos.z
                );

                if (!existingNode) {
                    this.openSet.push(neighborNode);
                } else if (g < existingNode.g) {
                    existingNode.g = g;
                    existingNode.f = f;
                    existingNode.parent = current;
                }
            }

            if (iterations % 100 === 0) {
                this.cleanupFailedChecks(); // Periodically cleanup failed checks
            }
        }

        world.sendMessage(`§cNo path found after ${iterations} iterations`);
        return [];
    }

    /**
     * Generates valid neighboring positions for pathfinding
     * Implements smart neighbor selection based on goal direction
     * Uses expanding search pattern when direct path is blocked
     * @param pos Current position
     * @returns Array of valid neighbor positions
     */
    private async getNeighbors(pos: Vector3): Promise<Vector3[]> {
        const neighbors: Vector3[] = [];
        const posKey = this.posToString(pos);

        // Calculate direction to goal
        const dx = this.goal.x - pos.x;
        const dy = this.goal.y - pos.y;
        const dz = this.goal.z - pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const dirToGoal = {
            x: dx / dist,
            y: dy / dist,
            z: dz / dist
        };

        // Check if path is clear in direction of goal
        const isPathClear = await this.checkAreaClear(pos, dirToGoal);

        if (isPathClear) {
            const primaryStep = {
                x: Math.floor(pos.x + Math.sign(dirToGoal.x)),
                y: Math.floor(pos.y + Math.sign(dirToGoal.y)),
                z: Math.floor(pos.z + Math.sign(dirToGoal.z))
            };

            if (await this.isValidPosition(primaryStep)) {
                neighbors.push(primaryStep);
                this.lastFailedPos = null; // Reset failed tracking on success
                this.spreadLevel = 1; // Reset spread level
                return neighbors;
            }
        }

        // Increase spread if we're still at the same failed position
        if (this.lastFailedPos === posKey) {
            this.spreadLevel = Math.min(this.spreadLevel + 1, 3);
        } else {
            this.lastFailedPos = posKey;
            this.spreadLevel = 1;
        }

        const searchSpread = this.spreadLevel;
        const upwardBias = 2;

        // Generate neighbors with upward bias
        for (let x = -searchSpread; x <= searchSpread; x++) {
            for (let y = -1; y <= searchSpread + upwardBias; y++) {
                for (let z = -searchSpread; z <= searchSpread; z++) {
                    if (x === 0 && y === 0 && z === 0) continue;

                    const distance = Math.abs(x) + Math.abs(y) + Math.abs(z);
                    if (distance > searchSpread * 2) continue;

                    const newPos = {
                        x: Math.floor(pos.x + x),
                        y: Math.floor(pos.y + y),
                        z: Math.floor(pos.z + z)
                    };

                    if (await this.isValidPosition(newPos)) {
                        neighbors.push(newPos);
                    }
                }
            }
        }

        // Sort neighbors with preference for upward movement when blocked
        return neighbors.sort((a, b) => {
            const scoreA = this.getDirectionalScore(a, dirToGoal, !isPathClear);
            const scoreB = this.getDirectionalScore(b, dirToGoal, !isPathClear);
            return scoreA - scoreB;
        });
    }

    /**
     * Checks if a 3x3x3 area in the movement direction is clear
     * Used to optimize pathfinding by allowing straight paths when possible
     * @param pos Current position
     * @param dir Direction vector towards goal
     * @returns boolean indicating if path is clear
     */
    private async checkAreaClear(pos: Vector3, dir: Vector3): Promise<boolean> {
        // Check immediate 3x3x3 area in direction of goal
        const checkSize = 1;
        const stepX = Math.sign(dir.x);
        const stepY = Math.sign(dir.y);
        const stepZ = Math.sign(dir.z);

        for (let x = -checkSize; x <= checkSize; x++) {
            for (let y = -checkSize; y <= checkSize; y++) {
                for (let z = -checkSize; z <= checkSize; z++) {
                    const checkPos = {
                        x: Math.floor(pos.x + stepX + x),
                        y: Math.floor(pos.y + stepY + y),
                        z: Math.floor(pos.z + stepZ + z)
                    };

                    const posKey = this.posToString(checkPos);
                    if (this.blockCache.has(posKey)) {
                        if (!this.blockCache.get(posKey)) return false;
                        continue;
                    }

                    try {
                        const block = this.dimension.getBlock(checkPos);
                        if (!block?.isValid) return false;

                        const isPassable = PathFinder.PASSABLE_BLOCKS.has(block.type.id);

                        this.blockCache.set(posKey, isPassable);
                        if (!isPassable) {
                            return false;
                        }
                    } catch {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Scores positions based on alignment with goal direction
     * Used to prioritize neighbors that move towards the goal
     * @param pos Position to evaluate
     * @param dirToGoal Normalized direction vector to goal
     * @param prioritizeUpward boolean indicating if upward movement should be prioritized
     * @returns Directional score (lower is better)
     */
    private getDirectionalScore(pos: Vector3, dirToGoal: Vector3, prioritizeUpward: boolean): number {
        const dx = pos.x - this.goal.x;
        const dy = pos.y - this.goal.y;
        const dz = pos.z - this.goal.z;

        // Basic dot product calculation
        let score = -(dx * dirToGoal.x + dy * dirToGoal.y + dz * dirToGoal.z);

        // Apply upward bias when path is blocked
        if (prioritizeUpward) {
            // Bonus for positions above current height (negative dy means upward)
            const upwardBonus = dy < 0 ? -2 : 0;
            score += upwardBonus;
        }

        return score;
    }

    /**
     * Validates if a position is safe for entity movement
     * Checks for passable blocks at body and head height
     * Uses caching to improve performance
     * @param pos Position to check
     * @returns boolean indicating if position is valid
     */
    private async isValidPosition(pos: Vector3): Promise<boolean> {
        const posKey = this.posToString(pos);
        // Check cache first
        if (this.blockCache.has(posKey)) {
            return this.blockCache.get(posKey) ?? false;
        }

        try {
            const checkPos = {
                x: Math.floor(pos.x),
                y: Math.floor(pos.y),
                z: Math.floor(pos.z)
            };

            const current = this.dimension.getBlock(checkPos);
            const above = this.dimension.getBlock({ ...checkPos, y: checkPos.y + 1 });

            if (!current || !above) {
                this.blockCache.set(posKey, false);
                return false;
            }

            // Only check for passable space
            const hasSpace = PathFinder.PASSABLE_BLOCKS.has(current.type.id);
            const hasHeadSpace = PathFinder.PASSABLE_BLOCKS.has(above.type.id);

            // Special case for goal position
            const isGoal = Math.abs(checkPos.x - this.goal.x) < 1 &&
                Math.abs(checkPos.y - this.goal.y) < 1 &&
                Math.abs(checkPos.z - this.goal.z) < 1;

            const isValid = isGoal ? (hasSpace && hasHeadSpace) : (hasSpace && hasHeadSpace);
            this.blockCache.set(posKey, isValid);
            return isValid;
        } catch (error) {
            console.warn(`Block check failed at ${JSON.stringify(pos)}: ${error}`);
            this.blockCache.set(posKey, false);
            return false;
        }
    }

    /**
     * Converts Vector3 position to string for use as map keys
     * @param pos Position to convert
     * @returns String representation of position
     */
    private posToString(pos: Vector3): string {
        return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
    }

    /**
     * Reconstructs the path from goal node back to start with smooth corners
     * @param node Goal node with parent references
     * @returns Array of positions forming the complete path with smooth corners
     */
    private async reconstructPath(node: Node): Promise<Vector3[]> {
        // First get raw path points
        const rawPath: Vector3[] = [];
        let current = node;
        while (current) {
            rawPath.unshift(current.pos);
            if (!current.parent) break;
            current = current.parent;
        }

        if (rawPath.length <= 2) return rawPath;

        const smoothPath: Vector3[] = [];
        if (rawPath[0]) {
            smoothPath.push(rawPath[0]); // Always include start point
        }

        // Process each segment
        for (let i = 1; i < rawPath.length - 1; i++) {
            const prev = rawPath[i - 1];
            const current = rawPath[i];
            const next = rawPath[i + 1];

            // Check if this is a corner (direction changes)
            if (!prev || !current || !next) continue;
            const isCorner = this.isCornerPoint(prev, current, next);

            if (isCorner) {
                // Generate smooth corner points
                const cornerPoints = this.generateSmoothCorner(prev, current, next);
                for (const point of cornerPoints) {
                    if (await this.isValidPosition(point)) {
                        smoothPath.push(point);
                    }
                }
            } else {
                // For straight paths, interpolate points at fixed intervals
                const lastPoint = smoothPath[smoothPath.length - 1];
                if (!lastPoint) continue;
                const straightPoints = this.interpolateStraightPath(
                    lastPoint,
                    current
                );
                for (const point of straightPoints) {
                    if (await this.isValidPosition(point)) {
                        smoothPath.push(point);
                    }
                }
            }
        }

        // Add final point
        const lastPoint = rawPath[rawPath.length - 1];
        if (lastPoint) {
            smoothPath.push(lastPoint);
        }

        return smoothPath;
    }

    /**
     * Checks if a point forms a corner in the path
     */
    private isCornerPoint(prev: Vector3, current: Vector3, next: Vector3): boolean {
        const dirFromPrev = {
            x: Math.sign(current.x - prev.x),
            y: Math.sign(current.y - prev.y),
            z: Math.sign(current.z - prev.z)
        };
        
        const dirToNext = {
            x: Math.sign(next.x - current.x),
            y: Math.sign(next.y - current.y),
            z: Math.sign(next.z - current.z)
        };

        return dirFromPrev.x !== dirToNext.x || 
               dirFromPrev.y !== dirToNext.y || 
               dirFromPrev.z !== dirToNext.z;
    }

    /**
     * Generates smooth corner points using bezier curve interpolation
     */
    private generateSmoothCorner(prev: Vector3, corner: Vector3, next: Vector3): Vector3[] {
        const points: Vector3[] = [];
        const segments = this.CORNER_SMOOTHNESS * 2;

        // Generate control points for bezier curve
        const control1 = {
            x: corner.x + (prev.x - corner.x) / 3,
            y: corner.y + (prev.y - corner.y) / 3,
            z: corner.z + (prev.z - corner.z) / 3
        };

        const control2 = {
            x: corner.x + (next.x - corner.x) / 3,
            y: corner.y + (next.y - corner.y) / 3,
            z: corner.z + (next.z - corner.z) / 3
        };

        // Generate points along bezier curve
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.bezierInterpolate(prev, control1, control2, next, t);
            points.push(point);
        }

        return this.enforcePointSpacing(points);
    }

    /**
     * Interpolates points along a straight path segment
     */
    private interpolateStraightPath(start: Vector3, end: Vector3): Vector3[] {
        const points: Vector3[] = [];
        const distance = Math.sqrt(
            Math.pow(end.x - start.x, 2) + 
            Math.pow(end.y - start.y, 2) + 
            Math.pow(end.z - start.z, 2)
        );
        
        const segments = Math.floor(distance / this.POINT_SPACING);

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            points.push({
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t,
                z: start.z + (end.z - start.z) * t
            });
        }

        return points;
    }

    /**
     * Enforces minimum spacing between points
     */
    private enforcePointSpacing(points: Vector3[]): Vector3[] {
        if (points.length === 0 || !points[0]) return [];
        const spacedPoints: Vector3[] = [points[0]];
        
        for (let i = 1; i < points.length; i++) {
            const lastPoint = spacedPoints[spacedPoints.length - 1];
            const currentPoint = points[i];
            if (!currentPoint || !lastPoint) continue;
            
            const distance = Math.sqrt(
                Math.pow(currentPoint.x - lastPoint.x, 2) + 
                Math.pow(currentPoint.y - lastPoint.y, 2) + 
                Math.pow(currentPoint.z - lastPoint.z, 2)
            );
            
            if (distance >= this.POINT_SPACING) {
                spacedPoints.push(currentPoint);
            }
        }
        
        return spacedPoints;
    }

    /**
     * Performs cubic bezier interpolation between points
     */
    private bezierInterpolate(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3 {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;

        return {
            x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
            y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
            z: mt2 * mt * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t2 * t * p3.z
        };
    }

    // Add cleanup method for failed checks
    private cleanupFailedChecks() {
        // Only clear block cache periodically
        if (this.blockCache.size > 1000) {
            this.blockCache.clear();
        }
    }
}

/**
 * Relocates an entity towards a target position with vertical displacement
 * Used when the pathfinder needs to move an entity over obstacles
 * 
 * @param target - The destination Vector3 position the entity should move towards
 * @param currentLoc - The entity's current Vector3 position
 * @param pathingEntity - The entity that needs to be relocated
 */
function relocate(target: Vector3, currentLoc: Vector3, pathingEntity: Entity) {
    // Calculate the direction vector to move towards target
    // Uses Math.sign() to get -1, 0, or 1 for each axis
    const dirToTarget: Vector3 = {
        x: Math.sign(target.x - currentLoc.x) * 2,  // Horizontal X movement direction (2 blocks)
        y: Math.sign((target.y - currentLoc.y) + 3) * 2,  // Always move up 3 blocks to clear obstacles
        z: Math.sign(target.z - currentLoc.z) * 2   // Horizontal Z movement direction (2 blocks)
    };

    // Teleport the entity to the new position
    // Adds the direction vector to current position:
    // - Moves two blocks in calculated X direction
    // - Moves up by 3 blocks
    // - Moves two blocks in calculated Z direction
    const newPos: Vector3 = {
        x: currentLoc.x + dirToTarget.x,
        y: currentLoc.y + dirToTarget.y,
        z: currentLoc.z + dirToTarget.z
    };
    pathingEntity.teleport(newPos);
}

/**
 * Main pathfinding function for entity movement
 * Handles path visualization and entity movement along the path
 * @param pathingEntity Entity to move
 * @param start Starting position
 * @param target Goal position
 * @returns Promise<boolean> indicating success/failure
 */
export async function pathfind(pathingEntity: Entity, start: Vector3, target: Vector3) {
    try {
        const startPos = {
            x: Math.floor(start.x),
            y: Math.floor(start.y),
            z: Math.floor(start.z)
        };

        const targetPos = {
            x: Math.floor(target.x),
            y: Math.floor(target.y + 2),
            z: Math.floor(target.z)
        };

        world.sendMessage(`§ePathfinding started from ${JSON.stringify(startPos)} to ${JSON.stringify(targetPos)}`);

        if (!pathingEntity.dimension.getBlock(startPos) || !pathingEntity.dimension.getBlock(targetPos)) {
            world.sendMessage(`§cOne or both positions are in unloaded chunks`);
            return false;
        }

        const pathFinder = new PathFinder(pathingEntity.dimension, targetPos);
        const path = await pathFinder.findPath(startPos);

        if (path.length > 0) {
            world.sendMessage(`§aPath found with ${path.length} steps`);
            // Visualize the path with particles
            for (const point of path) {
                pathingEntity.dimension.spawnParticle('rza:ignite_green', point);
            }
            let currentIndex = 0;

            const intervalId = system.runInterval(() => {
                if (!pathingEntity.isValid() || currentIndex >= path.length) {
                    system.clearRun(intervalId);
                    return;
                }

                try {
                    const currentPoint = path[currentIndex];
                    if (!currentPoint) {
                        system.clearRun(intervalId);
                        return;
                    }
                    pathingEntity.teleport(currentPoint);
                    currentIndex++;
                } catch (error) {
                    world.sendMessage(`§cPathfinding error: ${error}`);
                    system.clearRun(intervalId);
                }
            }, 1);

            return true;
        } else {
            const currentLoc = pathingEntity.location;
            relocate(target, currentLoc, pathingEntity);
            return false; // Make sure we explicitly return false here
        }
    } catch (error) {
        world.sendMessage(`§cPathfinding error: ${error}`);
        return false; // Also return false on any errors
    }
}