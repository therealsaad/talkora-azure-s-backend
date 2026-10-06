import { planUnit1Migration } from '../../src/scripts/plan-unit1-migration'

describe('Level 1 syllabus migration plan', () => {
  it('keeps existing activity IDs for completed students and adds only missing episodes', () => {
    const old = [
      'VISUAL_WARM_UP', 'PERSONAL_NAME', 'MODEL_CONVERSATION', 'READ_REPEAT',
      'PERSONAL_FAVOURITES', 'FILL_BLANK_PRACTICE', 'CHILD_INTERVIEWS_JULIE',
      'FOLLOW_UP_INTERVIEW', 'POLITE_DIFFERENCES', 'FINAL_CONVERSATION',
    ].map((digitalType, index) => ({ id: `old-${index + 1}`, digitalType }))
    const newTypes = [
      'VISUAL_WARM_UP', 'PERSONAL_NAME', 'MODEL_CONVERSATION', 'READ_REPEAT', 'EXACT_LINE_ROLE_SWAP',
      'PERSONAL_FAVOURITES', 'FILL_BLANK_PRACTICE', 'CHILD_INTERVIEWS_JULIE',
      'EXPANDED_FAVOURITES', 'FOLLOW_UP_INTERVIEW', 'POLITE_DIFFERENCES',
      'FINAL_CONVERSATION', 'BADGE_REWARD',
    ]
    const plan = planUnit1Migration(old, newTypes)
    expect(plan.map((step) => step.existingId).filter(Boolean)).toHaveLength(10)
    expect(plan[3]).toMatchObject({ digitalType: 'READ_REPEAT', existingId: 'old-4' })
    expect(plan[4]).toMatchObject({ digitalType: 'EXACT_LINE_ROLE_SWAP', existingId: undefined })
    expect(plan[8]).toMatchObject({ digitalType: 'EXPANDED_FAVOURITES', existingId: undefined })
    expect(plan[12]).toMatchObject({ digitalType: 'BADGE_REWARD', existingId: undefined })
  })
})
