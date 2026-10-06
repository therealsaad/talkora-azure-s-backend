import { unitTeachingGuidance } from '../../src/providers/ai/AIProvider'
import { unit1FavouriteThingsActivities } from '../../src/seed/data/unit1FavouriteThings'
import { unit2PartnerActivities } from '../../src/seed/data/term1Units'

describe('Class 4 Unit 1 and Unit 2 boundaries', () => {
  it('keeps Unit 2 in its own stable activity identity and syllabus page range', () => {
    expect(unit2PartnerActivities).toHaveLength(11)
    expect(new Set(unit2PartnerActivities.map((activity) => activity.activityKey)).size).toBe(11)
    expect(unit2PartnerActivities.every((activity) => activity.activityKey?.startsWith('class4-unit2-partner-v2-'))).toBe(true)
    expect(unit2PartnerActivities.every((activity) => activity.source?.pageStart === 27 && activity.source.pageEnd === 42)).toBe(true)
  })

  it('teaches the Unit 2 progression from interview through verified poster and presentation', () => {
    expect(unit2PartnerActivities.some((activity) => activity.stage === 'WARM_UP')).toBe(false)
    const activityTitles = unit2PartnerActivities.map((activity) => activity.title)
    expect(activityTitles).toEqual([
      'A Kind First Question',
      'Listen to a Partner Interview',
      'Practise an Interview Question',
      'Check What You Heard',
      'Interview Your Practice Partner',
      'Verify a Partner Fact',
      'Build a True Poster Sentence',
      'Add More Partner Details',
      'Ready to Present',
      'Partner Presenter Challenge',
      'Present Your Partner',
    ])

    const interview = unit2PartnerActivities.find((activity) => activity.order === 5)
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
