import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'

export async function activeLevelCountsByGrade(grades: number[]): Promise<Map<number, number>> {
  const uniqueGrades = [...new Set(grades)]
  if (!uniqueGrades.length) return new Map()

  const classes = await CurriculumClass.find({ grade: { $in: uniqueGrades }, status: 'active' }).select('_id grade').lean()
  if (!classes.length) return new Map()

  const levels = await Level.find({ classId: { $in: classes.map((klass) => klass._id) }, status: 'active' }).select('classId').lean()
  const countsByClass = new Map<string, number>()
  for (const level of levels) {
    const id = level.classId.toString()
    countsByClass.set(id, (countsByClass.get(id) || 0) + 1)
  }

  const countsByGrade = new Map<number, number>()
  for (const klass of classes) {
    countsByGrade.set(klass.grade, (countsByGrade.get(klass.grade) || 0) + (countsByClass.get(klass._id.toString()) || 0))
  }
  return countsByGrade
}
