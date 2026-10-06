import { createStudentSchema, updateStudentSchema } from '../../src/schemas/student.schema'

describe('student avatarType contract', () => {
  const base = { fullName: 'Test Learner', rollNumber: '42', grade: 4, className: '4A' }

  test.each(['BOY', 'GIRL'] as const)('accepts %s on student creation', (avatarType) => {
    expect(createStudentSchema.safeParse({ body: { ...base, avatarType } }).success).toBe(true)
  })

  test('requires a learner character when creating a student', () => {
    expect(createStudentSchema.safeParse({ body: base }).success).toBe(false)
  })

  test('allows changing the character but rejects unrelated values', () => {
    expect(updateStudentSchema.safeParse({ params: { id: 'student-id' }, body: { avatarType: 'GIRL' } }).success).toBe(true)
    expect(updateStudentSchema.safeParse({ params: { id: 'student-id' }, body: { avatarType: 'ROBOT' } }).success).toBe(false)
  })
})
