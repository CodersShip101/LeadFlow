// Clears the Turbopack/Next build cache before `npm run dev`.
//
// Why: Next 16's Turbopack persists CSS chunks in `.next` across server
// restarts. With our large single globals.css, a stale chunk from a previous
// session sometimes survives a restart and the browser renders old CSS against
// new markup — collapsing layouts (the "stale-CSS" bug). Wiping `.next` on
// every dev start guarantees a fresh CSS build. Cold start is sub-second here,
// so the cost is negligible. Use `npm run dev:fast` to skip this and keep the
// warm cache when you know nothing structural changed.
import { rmSync } from 'node:fs'

try {
  rmSync('.next', { recursive: true, force: true })
  console.log('✓ cleared .next cache — fresh CSS build')
} catch (e) {
  console.warn('could not clear .next:', e.message)
}
