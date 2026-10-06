export function areRequiredActivitiesComplete(
  requiredActivityIds: readonly string[],
  completedActivityIds: ReadonlySet<string>,
): boolean {
  return (
    requiredActivityIds.length > 0 &&
    requiredActivityIds.every((activityId) =>
      completedActivityIds.has(activityId),
    )
  )
}
