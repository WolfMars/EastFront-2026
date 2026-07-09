/**
 * Hex coordinate system using axial coordinates (q, r)
 * Based on Red Blob Games hex guide
 */

export interface AxialCoord {
    q: number;
    r: number;
}

export interface CubeCoord {
    x: number;
    y: number;
    z: number;
}

export interface PixelCoord {
    x: number;
    y: number;
}

/**
 * Convert axial to cube coordinates
 */
export function axialToCube(q: number, r: number): CubeCoord {
    return {
        x: q,
        y: -q - r,
        z: r,
    };
}

/**
 * Convert cube to axial coordinates
 */
export function cubeToAxial(x: number, _y: number, z: number): AxialCoord {
    return {
        q: x,
        r: z,
    };
}

/**
 * Calculate distance between two hex tiles (in cube coordinates)
 */
export function hexDistance(a: CubeCoord, b: CubeCoord): number {
    return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)) / 2;
}

/**
 * Get all hexes within a certain distance
 */
export function hexesInRange(center: AxialCoord, range: number): AxialCoord[] {
    const results: AxialCoord[] = [];
    const centerCube = axialToCube(center.q, center.r);

    for (let q = center.q - range; q <= center.q + range; q++) {
        for (let r = center.r - range; r <= center.r + range; r++) {
            const coord = axialToCube(q, r);
            if (hexDistance(centerCube, coord) <= range) {
                results.push({ q, r });
            }
        }
    }

    return results;
}

/**
 * Pixel coordinates for a hex (pointy-top orientation)
 * size: radius of the hex (distance from center to vertex)
 */
export function hexToPixel(coord: AxialCoord, size: number): PixelCoord {
    // r-axis horizontal: swap q and r roles from previous flat-top layout
    //const x = size * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r);
    const x = size * (Math.sqrt(3) * coord.q + Math.sqrt(3) / 2 * coord.r);
    const y = size * (3 / 2 * coord.r);
    return { x, y };
}

/**
 * Convert pixel coordinates to nearest hex (pointy-top orientation)
 */
export function pixelToHex(px: number, py: number, size: number): AxialCoord {
    // Correct inverse matrix for pointy-top orientation
    const q = (Math.sqrt(3) / 3 * px - 1 / 3 * py) / size;
    const r = (2 / 3 * py) / size; // Fixed: Pointy-top r maps strictly to vertical pixel py

    return roundHex({ q, r });
}
/**
 * Round fractional hex coordinates to nearest hex
 */
export function roundHex(coord: AxialCoord): AxialCoord {
    let cube = axialToCube(coord.q, coord.r);

    let rx = Math.round(cube.x);
    let ry = Math.round(cube.y);
    let rz = Math.round(cube.z);

    const xDiff = Math.abs(rx - cube.x);
    const yDiff = Math.abs(ry - cube.y);
    const zDiff = Math.abs(rz - cube.z); // Fixed: This must be cube.z, not the broken multiplication from before

    if (xDiff > yDiff && xDiff > zDiff) {
        rx = -ry - rz;
    } else if (yDiff > zDiff) {
        ry = -rx - rz;
    } 
    // Note: You do not need the 'else { rz = -rx - ry; }' block because 
    // cubeToAxial only reads rx and ry (q and r). Modifying rz changes nothing.

    return cubeToAxial(rx, ry, rz);
}

/**
 * Check if two hex coordinates are equal
 */
export function hexEqual(a: AxialCoord, b: AxialCoord): boolean {
    return a.q === b.q && a.r === b.r;
}

/**
 * Convert hex coordinate to a string key for use in maps/sets
 */
export function hexKey(coord: AxialCoord): string {
    return `${coord.q},${coord.r}`;
}
