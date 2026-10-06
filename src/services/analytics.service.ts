import { Student } from '../models/Student'
import { Teacher } from '../models/Teacher'
import { Progress } from '../models/Progress'
import { ActivityAttempt } from '../models/ActivityAttempt'
import { MistakeRecord } from '../models/MistakeRecord'
import { activeLevelCountsByGrade } from './curriculum-level-counts'
import { HomePractice } from '../models/HomePractice'

async function dataFor(schoolId: string, teacherId?: string) {
  const students = await Student.find({ schoolId, status: 'active', ...(teacherId ? { teacherId } : {}) }).select('_id fullName grade className').lean()
  const ids = students.map((s) => s._id)
  const [progress, attempts] = await Promise.all([Progress.find({ studentId: { $in: ids } }).lean(), ActivityAttempt.find({ studentId: { $in: ids } }).select('studentId score timeTakenMs createdAt').lean()])
  const progressByStudent = new Map<string, typeof progress>(); for (const row of progress) { const key = row.studentId.toString(); progressByStudent.set(key, [...(progressByStudent.get(key) || []), row]) }
  const attemptsByStudent = new Map<string, typeof attempts>(); for (const row of attempts) { const key = row.studentId.toString(); attemptsByStudent.set(key, [...(attemptsByStudent.get(key) || []), row]) }
  const rows = students.map((student) => { const docs = progressByStudent.get(student._id.toString()) || []; const studentAttempts = attemptsByStudent.get(student._id.toString()) || []; const completedLevels = docs.reduce((sum, doc) => sum + doc.levels.filter((level) => level.status === 'completed').length, 0); const scores = studentAttempts.map((attempt) => attempt.score); const dates = docs.map((doc) => doc.lastActivityAt).filter(Boolean).sort((a, b) => +new Date(b!) - +new Date(a!)); return { studentId: student._id.toString(), fullName: student.fullName, grade: student.grade, className: student.className, xp: docs.reduce((sum, doc) => sum + doc.xp, 0), completedLevels, accuracy: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0, attempts: studentAttempts.length, learningTimeMinutes: Math.round(studentAttempts.reduce((sum, attempt) => sum + attempt.timeTakenMs, 0) / 60000), lastActivityAt: dates[0] } })
  return { rows, attempts }
}

export const AnalyticsService = {
  async studentDetail(schoolId: string, studentId: string, teacherId?: string) {
    const student = await Student.findOne({ _id: studentId, schoolId, ...(teacherId ? { teacherId } : {}) }).lean()
    if (!student) return null
    const [progress, attempts, recentAttempts, levelCounts, homePractice] = await Promise.all([
      Progress.find({ studentId }).lean(),
      ActivityAttempt.find({ studentId }).lean(),
      ActivityAttempt.find({ studentId }).sort('-createdAt').limit(20).lean(),
      activeLevelCountsByGrade([student.grade]),
      HomePractice.findOne({ studentId, unitKey: 'UNIT1_FAVOURITES' }).select('reflection submittedAt audioSizeBytes').lean(),
    ])
    const scores = attempts.map((attempt) => attempt.score)
    return {
      student: { ...student, id: student._id.toString() },
      progress: {
        accuracy: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
        completedLevels: progress.reduce((sum, row) => sum + row.levels.filter((level) => level.status === 'completed').length, 0),
        totalLevels: levelCounts.get(student.grade) || 0,
        totalXp: progress.reduce((sum, row) => sum + row.xp, 0),
        learningTimeMinutes: Math.round(attempts.reduce((sum, attempt) => sum + attempt.timeTakenMs, 0) / 60000),
        streak: Math.max(0, ...progress.map((row) => row.streak)),
      },
      recentAttempts: recentAttempts.map((attempt) => ({ activityId: attempt.activityId.toString(), answer: attempt.answer, correct: attempt.correct, score: attempt.score, timeTakenSeconds: Math.round(attempt.timeTakenMs / 1000), createdAt: attempt.createdAt })),
      homePractice: homePractice ? { reflection: homePractice.reflection, submittedAt: homePractice.submittedAt, hasAudio: Boolean(homePractice.audioSizeBytes) } : null,
    }
  },
  async schoolOverview(schoolId: string, teacherId?: string) {
    const { rows } = await dataFor(schoolId, teacherId)
    const levelCounts = await activeLevelCountsByGrade(rows.map((row) => row.grade))
    const cutoff = Date.now() - 7 * 86400000
    return {
      studentCount: rows.length,
      activeStudentCount: rows.filter((row) => row.lastActivityAt && +new Date(row.lastActivityAt) >= cutoff).length,
      teacherCount: teacherId ? 1 : await Teacher.countDocuments({ schoolId, status: 'active' }),
      averageProgress: rows.length ? Math.round(rows.reduce((sum, row) => {
        const totalLevels = levelCounts.get(row.grade) || 0
        return sum + (totalLevels ? Math.min(100, row.completedLevels / totalLevels * 100) : 0)
      }, 0) / rows.length) : 0,
      totalLearningMinutes: rows.reduce((sum, row) => sum + row.learningTimeMinutes, 0),
      totalXp: rows.reduce((sum, row) => sum + row.xp, 0),
    }
  },
  async analyticsOverview(schoolId: string, teacherId?: string) {
    const { rows, attempts } = await dataFor(schoolId, teacherId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const grades = [...new Set(rows.map((row) => row.grade))].sort((a, b) => a - b)
    return {
      totalAttempts: attempts.length,
      avgAccuracy: attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) : 0,
      totalLearningTimeMinutes: Math.round(attempts.reduce((sum, attempt) => sum + attempt.timeTakenMs, 0) / 60000),
      activeTodayCount: new Set(attempts.filter((attempt) => attempt.createdAt >= today).map((attempt) => attempt.studentId.toString())).size,
      gradeBreakdown: grades.map((grade) => {
        const group = rows.filter((row) => row.grade === grade)
        const attempted = group.filter((row) => row.attempts > 0)
        return {
          grade,
          studentCount: group.length,
          attemptedStudentCount: attempted.length,
          avgAccuracy: attempted.length ? Math.round(attempted.reduce((sum, row) => sum + row.accuracy, 0) / attempted.length) : 0,
          avgLevelsCompleted: group.length ? Number((group.reduce((sum, row) => sum + row.completedLevels, 0) / group.length).toFixed(1)) : 0,
        }
      }),
      studentsNeedingAttention: rows.filter((row) => row.attempts >= 2 && row.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, 6),
    }
  },
  async weakestSkillsForSchool(schoolId: string, limit = 5, teacherId?: string) { const students = await Student.find({ schoolId, ...(teacherId ? { teacherId } : {}) }).select('_id').lean(); return MistakeRecord.aggregate([{ $match: { studentId: { $in: students.map((s) => s._id) }, resolved: false } }, { $group: { _id: '$skill', occurrences: { $sum: '$attemptCount' }, students: { $addToSet: '$studentId' } } }, { $project: { skill: '$_id', occurrences: 1, studentCount: { $size: '$students' }, _id: 0 } }, { $sort: { occurrences: -1 } }, { $limit: limit }]) },
}
