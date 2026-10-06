export function finalizeConversationTeacherResponse<T extends { message: string; followUpQuestion?: string | null; activityComplete?: boolean }>(response: T, finalTurn: boolean): T {
  if (!finalTurn) return response
  return {
    ...response,
    message: response.message.trim() || 'You shared your ideas clearly. Let us continue.',
    followUpQuestion: null,
    activityComplete: true,
  }
}
