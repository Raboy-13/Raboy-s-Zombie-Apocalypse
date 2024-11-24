import { system } from "@minecraft/server";
class PathFinder {
    static PASSABLE_BLOCKS = new Set([
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
    dimension;
    goal;
    openSet = [];
    closedSet = new Set();
    blockCache = new Map();
    lastFailedPos = null;
    spreadLevel = 1;
    POINT_SPACING = 1;
    CORNER_SMOOTHNESS = 5;
    heuristic(start, end) {
        return Math.abs(start.x - end.x) +
            Math.abs(start.y - end.y) +
            Math.abs(start.z - end.z);
    }
    constructor(dimension, goal) {
        this.dimension = dimension;
        this.goal = goal;
    }
    async findPath(start) {
        const startNode = {
            pos: start,
            g: 0,
            h: this.heuristic(start, this.goal),
            f: 0
        };
        startNode.f = startNode.g + startNode.h;
        this.openSet.push(startNode);
        let iterations = 0;
        const maxIterations = 1000;
        while (this.openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            if (iterations > 300 && iterations % 50 === 0)
                await system.waitTicks(1);
            const current = this.openSet.reduce((min, node) => (node.f < min?.f || !min) ? node : min);
            if (this.heuristic(current.pos, this.goal) < 1) {
                return this.reconstructPath(current);
            }
            this.openSet = this.openSet.filter(node => node !== current);
            this.closedSet.add(this.posToString(current.pos));
            const neighbors = await this.getNeighbors(current.pos);
            for (const neighborPos of neighbors) {
                if (this.closedSet.has(this.posToString(neighborPos))) {
                    continue;
                }
                const g = current.g + this.heuristic(current.pos, neighborPos);
                const h = this.heuristic(neighborPos, this.goal);
                const f = g + h;
                const neighborNode = {
                    pos: neighborPos,
                    g: g,
                    h: h,
                    f: f,
                    parent: current
                };
                const existingNode = this.openSet.find(n => n.pos.x === neighborPos.x &&
                    n.pos.y === neighborPos.y &&
                    n.pos.z === neighborPos.z);
                if (!existingNode) {
                    this.openSet.push(neighborNode);
                }
                else if (g < existingNode.g) {
                    existingNode.g = g;
                    existingNode.f = f;
                    existingNode.parent = current;
                }
            }
            if (iterations % 100 === 0) {
                this.cleanupFailedChecks();
            }
        }
        return [];
    }
    async getNeighbors(pos) {
        const neighbors = [];
        const posKey = this.posToString(pos);
        const dx = this.goal.x - pos.x;
        const dy = this.goal.y - pos.y;
        const dz = this.goal.z - pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const dirToGoal = {
            x: dx / dist,
            y: dy / dist,
            z: dz / dist
        };
        const isPathClear = await this.checkAreaClear(pos, dirToGoal);
        if (isPathClear) {
            const primaryStep = {
                x: Math.floor(pos.x + Math.sign(dirToGoal.x)),
                y: Math.floor(pos.y + Math.sign(dirToGoal.y)),
                z: Math.floor(pos.z + Math.sign(dirToGoal.z))
            };
            if (await this.isValidPosition(primaryStep)) {
                neighbors.push(primaryStep);
                this.lastFailedPos = null;
                this.spreadLevel = 1;
                return neighbors;
            }
        }
        if (this.lastFailedPos === posKey) {
            this.spreadLevel = Math.min(this.spreadLevel + 1, 3);
        }
        else {
            this.lastFailedPos = posKey;
            this.spreadLevel = 1;
        }
        const searchSpread = this.spreadLevel;
        const upwardBias = 2;
        for (let x = -searchSpread; x <= searchSpread; x++) {
            for (let y = -1; y <= searchSpread + upwardBias; y++) {
                for (let z = -searchSpread; z <= searchSpread; z++) {
                    if (x === 0 && y === 0 && z === 0)
                        continue;
                    const distance = Math.abs(x) + Math.abs(y) + Math.abs(z);
                    if (distance > searchSpread * 2)
                        continue;
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
        return neighbors.sort((a, b) => {
            const scoreA = this.getDirectionalScore(a, dirToGoal, !isPathClear);
            const scoreB = this.getDirectionalScore(b, dirToGoal, !isPathClear);
            return scoreA - scoreB;
        });
    }
    async checkAreaClear(pos, dir) {
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
                        if (!this.blockCache.get(posKey))
                            return false;
                        continue;
                    }
                    try {
                        const block = this.dimension.getBlock(checkPos);
                        if (!block?.isValid)
                            return false;
                        const isPassable = PathFinder.PASSABLE_BLOCKS.has(block.type.id);
                        this.blockCache.set(posKey, isPassable);
                        if (!isPassable) {
                            return false;
                        }
                    }
                    catch {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    getDirectionalScore(pos, dirToGoal, prioritizeUpward) {
        const dx = pos.x - this.goal.x;
        const dy = pos.y - this.goal.y;
        const dz = pos.z - this.goal.z;
        let score = -(dx * dirToGoal.x + dy * dirToGoal.y + dz * dirToGoal.z);
        if (prioritizeUpward) {
            const upwardBonus = dy < 0 ? -2 : 0;
            score += upwardBonus;
        }
        return score;
    }
    async isValidPosition(pos) {
        const posKey = this.posToString(pos);
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
            const hasSpace = PathFinder.PASSABLE_BLOCKS.has(current.type.id);
            const hasHeadSpace = PathFinder.PASSABLE_BLOCKS.has(above.type.id);
            const isGoal = Math.abs(checkPos.x - this.goal.x) < 1 &&
                Math.abs(checkPos.y - this.goal.y) < 1 &&
                Math.abs(checkPos.z - this.goal.z) < 1;
            const isValid = isGoal ? (hasSpace && hasHeadSpace) : (hasSpace && hasHeadSpace);
            this.blockCache.set(posKey, isValid);
            return isValid;
        }
        catch (error) {
            console.warn(`Block check failed at ${JSON.stringify(pos)}: ${error}`);
            this.blockCache.set(posKey, false);
            return false;
        }
    }
    posToString(pos) {
        return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
    }
    async reconstructPath(node) {
        const rawPath = [];
        let current = node;
        while (current) {
            rawPath.unshift(current.pos);
            if (!current.parent)
                break;
            current = current.parent;
        }
        if (rawPath.length <= 2)
            return rawPath;
        const smoothPath = [];
        if (rawPath[0]) {
            smoothPath.push(rawPath[0]);
        }
        for (let i = 1; i < rawPath.length - 1; i++) {
            const prev = rawPath[i - 1];
            const current = rawPath[i];
            const next = rawPath[i + 1];
            if (!prev || !current || !next)
                continue;
            const isCorner = this.isCornerPoint(prev, current, next);
            if (isCorner) {
                const cornerPoints = this.generateSmoothCorner(prev, current, next);
                for (const point of cornerPoints) {
                    if (await this.isValidPosition(point)) {
                        smoothPath.push(point);
                    }
                }
            }
            else {
                const lastPoint = smoothPath[smoothPath.length - 1];
                if (!lastPoint)
                    continue;
                const straightPoints = this.interpolateStraightPath(lastPoint, current);
                for (const point of straightPoints) {
                    if (await this.isValidPosition(point)) {
                        smoothPath.push(point);
                    }
                }
            }
        }
        const lastPoint = rawPath[rawPath.length - 1];
        if (lastPoint) {
            smoothPath.push(lastPoint);
        }
        return smoothPath;
    }
    isCornerPoint(prev, current, next) {
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
    generateSmoothCorner(prev, corner, next) {
        const points = [];
        const segments = this.CORNER_SMOOTHNESS * 2;
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
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.bezierInterpolate(prev, control1, control2, next, t);
            points.push(point);
        }
        return this.enforcePointSpacing(points);
    }
    interpolateStraightPath(start, end) {
        const points = [];
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) +
            Math.pow(end.y - start.y, 2) +
            Math.pow(end.z - start.z, 2));
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
    enforcePointSpacing(points) {
        if (points.length === 0 || !points[0])
            return [];
        const spacedPoints = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const lastPoint = spacedPoints[spacedPoints.length - 1];
            const currentPoint = points[i];
            if (!currentPoint || !lastPoint)
                continue;
            const distance = Math.sqrt(Math.pow(currentPoint.x - lastPoint.x, 2) +
                Math.pow(currentPoint.y - lastPoint.y, 2) +
                Math.pow(currentPoint.z - lastPoint.z, 2));
            if (distance >= this.POINT_SPACING) {
                spacedPoints.push(currentPoint);
            }
        }
        return spacedPoints;
    }
    bezierInterpolate(p0, p1, p2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        return {
            x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
            y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
            z: mt2 * mt * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t2 * t * p3.z
        };
    }
    cleanupFailedChecks() {
        if (this.blockCache.size > 1000) {
            this.blockCache.clear();
        }
    }
}
function relocate(target, currentLoc, pathingEntity) {
    const dirToTarget = {
        x: Math.sign(target.x - currentLoc.x) * 2,
        y: Math.sign((target.y - currentLoc.y) + 3) * 2,
        z: Math.sign(target.z - currentLoc.z) * 2
    };
    const newPos = {
        x: currentLoc.x + dirToTarget.x,
        y: currentLoc.y + dirToTarget.y,
        z: currentLoc.z + dirToTarget.z
    };
    pathingEntity.teleport(newPos);
}
export async function pathfind(pathingEntity, start, target) {
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
        if (!pathingEntity.dimension.getBlock(startPos) || !pathingEntity.dimension.getBlock(targetPos)) {
            return false;
        }
        const pathFinder = new PathFinder(pathingEntity.dimension, targetPos);
        const path = await pathFinder.findPath(startPos);
        if (path.length > 0) {
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
                }
                catch (error) {
                    system.clearRun(intervalId);
                }
            }, 1);
            return true;
        }
        else {
            const currentLoc = pathingEntity.location;
            relocate(target, currentLoc, pathingEntity);
            return false;
        }
    }
    catch (error) {
        return false;
    }
}
