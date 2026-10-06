import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import mongoose from 'mongoose'
import { ActivityAttempt } from '../../src/models/ActivityAttempt'
import { Student } from '../../src/models/Student'
import { CurriculumClass } from '../../src/models/CurriculumClass'
import { Level } from '../../src/models/Level'
import { Progress } from '../../src/models/Progress'
import { AnalyticsService } from '../../src/services/analytics.service'
import { StudentService } from '../../src/services/student.service'
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from './dbTestUtils'

describe('Educator grade reports', () => {
  beforeAll(connectTestDatabase)
  afterAll(disconnectTestDatabase)
  beforeEach(clearTestDatabase)

  it('shows no attempts separately from a low score and scopes teacher data', async () => {
    const schoolId = new mongoose.Types.ObjectId()
    const teacherId = new mongoose.Types.ObjectId()
    const [attempted] = await Student.create([
      { schoolId, teacherId, fullName: 'Sana', rollNumber: '1', passwordHash: 'hash', grade: 4, avatarType: 'GIRL' },
      { schoolId, fullName: 'Saad', rollNumber: '2', passwordHash: 'hash', grade: 4, avatarType: 'BOY' },
      { schoolId, fullName: 'Ali', rollNumber: '3', passwordHash: 'hash', grade: 5, avatarType: 'BOY' },
    ])
    const now = new Date()
    await ActivityAttempt.create({
      studentId: attempted._id,
      activityId: new mongoose.Types.ObjectId(),
      lessonId: new mongoose.Types.ObjectId(),
      levelId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      answer: 'I like cricket.',
      normalizedAnswer: 'i like cricket',
      correct: true,
      score: 80,
      attemptNumber: 1,
      startedAt: new Date(now.getTime() - 1000),
      submittedAt: now,
      timeTakenMs: 1000,
      hintsUsed: 0,
    })

    const school = await AnalyticsService.analyticsOverview(schoolId.toString())
    expect(school.totalAttempts).toBe(1)
    expect(school.gradeBreakdown).toEqual([
      expect.objectContaining({ grade: 4, studentCount: 2, attemptedStudentCount: 1, avgAccuracy: 80 }),
      expect.objectContaining({ grade: 5, studentCount: 1, attemptedStudentCount: 0, avgAccuracy: 0 }),
    ])

    const teacher = await AnalyticsService.analyticsOverview(schoolId.toString(), teacherId.toString())
    expect(teacher.gradeBreakdown).toEqual([
      expect.objectContaining({ grade: 4, studentCount: 1, attemptedStudentCount: 1, avgAccuracy: 80 }),
    ])
  })

  it('calculates overview progress from the grade curriculum length', async () => {
    const schoolId = new mongoose.Types.ObjectId()
    const student = await Student.create({ schoolId, fullName: 'Sam', rollNumber: '1', passwordHash: 'hash', grade: 4, avatarType: 'BOY' })
    const klass = await CurriculumClass.create({ grade: 4, name: 'Class 4', order: 1 })
    const [first] = await Level.create([
      { classId: klass._id, number: 1, order: 1, title: 'First', place: 'School', status: 'active' },
      { classId: klass._id, number: 2, order: 2, title: 'Second', place: 'School', status: 'active' },
    ])
    await Progress.create({ studentId: student._id, classId: klass._id, levels: [{ levelId: first._id, status: 'completed', lessons: [] }] })

    const overview = await AnalyticsService.schoolOverview(schoolId.toString())
    expect(overview.averageProgress).toBe(50)
    const detail = await AnalyticsService.studentDetail(schoolId.toString(), student._id.toString())
    expect(detail?.progress.totalLevels).toBe(2)
    const listing = await StudentService.list({ schoolId: schoolId.toString(), page: 1, limit: 10 })
    expect(listing.students[0].progress.totalLevels).toBe(2)
  })
})
