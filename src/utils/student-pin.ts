import { createHmac, randomInt } from 'crypto'
import { env } from '../config/env'
import { Student } from '../models/Student'

// Deterministic keyed lookup; the actual PIN is separately bcrypt-hashed.
// Keep JWT_SECRET stable across deployments or provision a dedicated stable PIN_LOOKUP_SECRET.
export const pinLookup = (pin: string) => createHmac('sha256', process.env.PIN_LOOKUP_SECRET || env.jwtSecret).update(`talkora-student-pin:v1:${pin}`).digest('hex')

export async function newUniquePin(excludeId?: string): Promise<{ pin: string; digest: string }> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const pin = String(randomInt(0, 100000)).padStart(5, '0')
    const digest = pinLookup(pin)
    if (!(await Student.exists({ pinLookup: digest, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }))) return { pin, digest }
  }
  throw new Error('Could not allocate a unique student PIN')
}
