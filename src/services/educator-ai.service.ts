import { AnalyticsService } from './analytics.service'
import { askEducatorGemini } from '../providers/ai/EducatorGeminiProvider'
import { ApiError } from '../utils/ApiError'

export const EducatorAIService = {
  async chat(input: { schoolId: string; role: 'SCHOOL_ADMIN' | 'TEACHER'; educatorId: string; message: string; contextType: 'DASHBOARD' | 'CLASS' | 'STUDENT'; contextId?: string }) {
    const teacherId = input.role === 'TEACHER' ? input.educatorId : undefined
    let context: unknown
    if (input.contextType === 'STUDENT') {
      if (!input.contextId) throw ApiError.badRequest('A student context is required')
      const detail = await AnalyticsService.studentDetail(input.schoolId, input.contextId, teacherId)
      if (!detail) throw ApiError.notFound('Student not found')
      context = { scope: 'student', student: { name: detail.student.fullName, grade: detail.student.grade, className: detail.student.className }, progress: detail.progress, recentAttempts: detail.recentAttempts.slice(0, 10).map(({ answer: _answer, ...attempt }) => attempt) }
    } else {
      const [summary, analytics, skills] = await Promise.all([AnalyticsService.schoolOverview(input.schoolId, teacherId), AnalyticsService.analyticsOverview(input.schoolId, teacherId), AnalyticsService.weakestSkillsForSchool(input.schoolId, 5, teacherId)])
      context = { scope: input.role === 'TEACHER' ? 'assigned students' : 'school', period: 'all-time with active learners defined as activity in last 7 days', summary, gradeBreakdown: analytics.gradeBreakdown, attention: analytics.studentsNeedingAttention, weakestSkills: skills }
    }
    return askEducatorGemini(input.message, context)
  },
}
