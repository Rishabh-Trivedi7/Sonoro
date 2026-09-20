/**
 * Singleton IO instance.
 * Allows controllers to emit socket events without circular dependencies.
 * Set once in index.js after io is created; read by any module that needs it.
 */
let _io = null

export const setIO = (io) => {
  _io = io
}

export const getIO = () => _io
