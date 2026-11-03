/**
 * Geometry helpers.
 *
 * Two reasons these exist. The first is V13 in `docs/art-direction.md`: every edge in the old room
 * was a mathematically sharp 90° corner, which is the strongest "primitive" tell there is and also
 * why nothing caught a highlight. `box()` gives an object a bevelled edge for a few extra triangles.
 *
 * The second is cost. A web page pays for draw calls and geometry uploads, not for triangles, so
 * every geometry built here is cached by its dimensions and shared between meshes — four desk legs
 * are one geometry, referenced four times.
 */

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const boxCache = new Map()
const planeCache = new Map()
const uvCache = new Map()

/**
 * A box, optionally with softened edges. `bevel` is silently dropped when it would eat the whole
 * face, because a bevel larger than half the thinnest dimension produces a collapsed mesh.
 */
export function box(width, height, depth, bevel = 0) {
  const radius = Math.min(bevel, Math.min(width, height, depth) / 2.6)
  const key = `b${width}|${height}|${depth}|${radius}`
  if (!boxCache.has(key)) {
    boxCache.set(key, radius > 0.0008
      ? new RoundedBoxGeometry(width, height, depth, 1, radius)
      : new THREE.BoxGeometry(width, height, depth))
  }
  return boxCache.get(key)
}

export function plane(width, height) {
  const key = `p${width}|${height}`
  if (!planeCache.has(key)) planeCache.set(key, new THREE.PlaneGeometry(width, height))
  return planeCache.get(key)
}

/** A flat disc: the two reels of a cassette, the head of a nail. */
export function circle(radius, segments = 16) {
  const key = `o${radius}|${segments}`
  if (!planeCache.has(key)) planeCache.set(key, new THREE.CircleGeometry(radius, segments))
  return planeCache.get(key)
}

export function cylinder(radiusTop, radiusBottom, height, segments = 16) {
  const key = `c${radiusTop}|${radiusBottom}|${height}|${segments}`
  if (!boxCache.has(key)) boxCache.set(key, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments))
  return boxCache.get(key)
}

export function torus(radius, thickness, segments = 24) {
  const key = `t${radius}|${thickness}|${segments}`
  if (!boxCache.has(key)) boxCache.set(key, new THREE.TorusGeometry(radius, thickness, 8, segments))
  return boxCache.get(key)
}

export function sphere(radius, widthSegments = 16, heightSegments = 12) {
  const key = `s${radius}|${widthSegments}|${heightSegments}`
  if (!boxCache.has(key)) {
    boxCache.set(key, new THREE.SphereGeometry(radius, widthSegments, heightSegments))
  }
  return boxCache.get(key)
}

/** A cone, optionally open at the base so something can be seen inside it — a lamp shade. */
export function cone(radius, height, segments = 16, openEnded = false) {
  const key = `k${radius}|${height}|${segments}|${openEnded}`
  if (!boxCache.has(key)) boxCache.set(key, new THREE.ConeGeometry(radius, height, segments, 1, openEnded))
  return boxCache.get(key)
}

/** A slack cable: a spline through a few world points, drawn as a thin tube. */
export function tube(points, radius = 0.006, segments = 20) {
  const key = `u${points.flat().join()}|${radius}`
  if (!boxCache.has(key)) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    boxCache.set(key, new THREE.TubeGeometry(curve, segments, radius, 5, false))
  }
  return boxCache.get(key)
}

/**
 * Returns a copy of `geometry` with its UVs multiplied, so a texture can stay at `repeat [1,1]` and
 * still get a per-surface grain scale. This exists because the alternative is worse: setting
 * `texture.repeat` per object means cloning the material *and* the texture for every size of surface,
 * which is a GPU upload each time. A 7 m wall and a 0.3 m shelf board can then share one material and
 * one texture while the wood grain stays the same physical width on both.
 *
 * The clone is cached by source geometry and scale, so the cost is one small vertex buffer per unique
 * combination rather than per mesh.
 */
export function scaleUv(geometry, su, sv) {
  const key = `${geometry.uuid}|${su}|${sv}`
  if (!uvCache.has(key)) {
    const clone = geometry.clone()
    const uv = clone.attributes.uv
    if (uv) {
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv)
      uv.needsUpdate = true
    }
    uvCache.set(key, clone)
  }
  return uvCache.get(key)
}

/**
 * A box whose UVs are scaled so one texture tile covers `tile` metres, with the tile laid out across
 * the face the viewer actually sees. `face` names that face: 'top' (a horizontal board, viewed from
 * above), 'front' (facing ±z) or 'side' (facing ±x). BoxGeometry gives every face its own 0..1 UV
 * span, so a single scale factor cannot be right on all six at once — getting the visible one right
 * is what stops a 150 mm floorboard becoming a 20 mm floorboard on a shelf edge.
 */
const UV_AXES = { top: [0, 2], front: [0, 1], side: [1, 2] }

export function tiledBox(width, height, depth, face, tile, bevel = 0) {
  const axes = UV_AXES[face]
  const dims = [width, height, depth]
  return scaleUv(box(width, height, depth, bevel), dims[axes[0]] / tile, dims[axes[1]] / tile)
}

/** The same for a flat plane, whose UVs already run across its width and height. */
export function tiledPlane(width, height, tile) {
  return scaleUv(plane(width, height), width / tile, height / tile)
}

/**
 * Adds a mesh at a centre point. `cast`/`receive` are explicit per object because shadow cost is the
 * thing this milestone has to be able to name: only surfaces large enough to read, or close enough
 * to something lit, are allowed to cast.
 */
export function part(group, geometry, material, position, options = {}) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  if (options.rotation) mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2])
  if (options.name) mesh.name = options.name
  mesh.castShadow = options.cast ?? false
  mesh.receiveShadow = options.receive ?? true
  group.add(mesh)
  return mesh
}

/** Frees the cached geometry when the room is torn down; the next room rebuilds it. */
export function disposeCaches() {
  for (const cache of [boxCache, planeCache, uvCache]) {
    for (const geometry of cache.values()) geometry.dispose()
    cache.clear()
  }
}
