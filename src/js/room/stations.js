/**
 * The camera stations.
 *
 * Stations remain the named viewpoints after free movement landed: they are the keyboard
 * shortcuts, the reduced-motion alternative to walking, and where `exitWalk()` drops the
 * viewer. `target` is the point the camera faces, which is all the controller needs.
 *
 * Room coordinates: floor at y=0, x from -3.5 to 3.5, z from -3 to 3. Walking bounds and
 * furniture colliders live in `collision.js` and use the same space.
 */

export const STATIONS = [
  {
    id: 'shelf',
    label: 'Cassette shelf',
    hint: 'Look at the tapes',
    position: { x: -2.2, y: 1.28, z: -0.75 },
    target: { x: -2.45, y: 1.09, z: -2.72 },
  },
  {
    id: 'desk',
    label: 'The computer',
    hint: 'Read the screen',
    position: { x: 1.6, y: 1.18, z: -1.62 },
    target: { x: 1.6, y: 1.05, z: -2.585 },
  },
]

export const stationById = (id) => STATIONS.find((station) => station.id === id) ?? null
