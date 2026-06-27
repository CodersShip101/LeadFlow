import { createHash } from 'crypto'

export function generateFingerprint(source: string, externalId: string): string {
  return createHash('sha256').update(`${source}:${externalId}`).digest('hex')
}
