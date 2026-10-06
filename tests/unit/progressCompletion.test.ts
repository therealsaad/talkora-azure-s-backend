import { areRequiredActivitiesComplete } from '../../src/services/progress-completion'

describe('curriculum progress completion', () => {
  it('requires every currently required activity, not just a matching completion count', () => {
    expect(
      areRequiredActivitiesComplete(
        ['active-a', 'active-b'],
        new Set(['active-a', 'archived-c']),
      ),
    ).toBe(false)
    expect(
      areRequiredActivitiesComplete(
        ['active-a', 'active-b'],
        new Set(['active-a', 'active-b', 'archived-c']),
      ),
    ).toBe(true)
  })

  it('does not mark a lesson complete when it has no required activities', () => {
    expect(areRequiredActivitiesComplete([], new Set(['optional-a']))).toBe(false)
  })
})
