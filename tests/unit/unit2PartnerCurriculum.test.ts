import { unitTeachingGuidance } from '../../src/providers/ai/AIProvider'
import { unit1FavouriteThingsActivities } from '../../src/seed/data/unit1FavouriteThings'
import { unit2PartnerActivities } from '../../src/seed/data/term1Units'

describe('Class 4 Unit 1 and Unit 2 boundaries', () => {
  it('keeps Unit 2 in its own stable activity identity and syllabus page range', () => {
    expect(unit2PartnerActivities).toHaveLength(17)
    expect(new Set(unit2PartnerActivities.map((activity) => activity.activityKey)).size).toBe(17)
    expect(unit2PartnerActivities.every((activity) => activity.activityKey?.startsWith('class4-unit2-partner-v3-'))).toBe(true)
    expect(unit2PartnerActivities.every((activity) => activity.source?.pageStart === 27 && activity.source.pageEnd === 42)).toBe(true)
    expect(unit2PartnerActivities.map((activity) => activity.order)).toEqual(
      Array.from({ length: 17 }, (_, index) => index + 1),
    )
    expect(unit2PartnerActivities.some((activity) =>
      `${activity.title} ${activity.prompt} ${activity.target}`.toLowerCase().includes('eating cake'),
    )).toBe(false)
  })

  it('follows the syllabus from partner warm-up through final presentation', () => {
    expect(unit2PartnerActivities[0]?.stage).toBe('WARM_UP')
    const activityTitles = unit2PartnerActivities.map((activity) => activity.title)
    expect(activityTitles).toEqual([
      'Turn and Talk with Your Partner',
      'Listen to a Partner Interview',
      'A Kind First Question',
      'Practise an Interview Question',
      'Practise Interview Questions and Answers',
      'Interview Your Partner',
      'Describe Your Partner',
      'Check What You Heard',
      'Verify a Partner Fact',
      'Build a True Poster Sentence',
      'Add More Partner Details',
      'Listen to a Partner Presentation',
      'Ready to Present',
      'Present Your Poster with Support',
      'Practise with a Small Group',
      'Partner Presenter Challenge',
      'Present Your Partner',
    ])

    const interview = unit2PartnerActivities.find((activity) => activity.title === 'Interview Your Partner')
    expect(interview?.conversationGoal?.requiredConcepts).toEqual([
      'partner_name',
      'partner_age',
      'partner_favourite_food',
      'partner_after_school_activity',
      'partner_hobby',
      'partner_best_friend',
      'ask_follow_up_question',
    ])
    expect(interview?.metadata?.julieProfile).toEqual({
      name: 'Maya',
      age: '9',
      favouriteFood: 'dosa',
      afterSchoolActivity: 'playing with her dog',
      hobby: 'drawing',
      bestFriend: 'Anaya',
    })

    const checkInformation = unit2PartnerActivities.find((activity) => activity.title === 'Check What You Heard')
    const poster = unit2PartnerActivities.find((activity) => activity.title === 'Build a True Poster Sentence')
    expect(checkInformation?.order).toBeLessThan(poster?.order ?? 0)
    expect(unit2PartnerActivities.find((activity) => activity.title === 'Listen to a Partner Presentation')?.order)
      .toBeLessThan(unit2PartnerActivities.find((activity) => activity.title === 'Present Your Poster with Support')?.order ?? 0)
  })

  it('keeps the Unit 1 personal-favourites objective separate from partner presentation', () => {
    expect(unit1FavouriteThingsActivities.some((activity) => activity.title.toLowerCase().includes('favourites'))).toBe(true)
    expect(unit2PartnerActivities.some((activity) => activity.title.toLowerCase().includes('poster'))).toBe(true)
    expect(unit2PartnerActivities.some((activity) => activity.title.toLowerCase().includes('present'))).toBe(true)
  })

  it('gives AI different Grade 4 teaching boundaries for Unit 1 and Unit 2', () => {
    const unit1Guidance = unitTeachingGuidance({ grade: 4, unitNumber: 1 })
    const unit2Guidance = unitTeachingGuidance({ grade: 4, unitNumber: 2 })

    expect(unit1Guidance).toContain('own favourites')
    expect(unit1Guidance).toContain('Do not switch this lesson')
    expect(unit2Guidance).toContain('interviewing a partner')
    expect(unit2Guidance).toContain('Never invent a real partner’s details')
    expect(unitTeachingGuidance({ grade: 5, unitNumber: 2 })).toBeUndefined()
  })
})
