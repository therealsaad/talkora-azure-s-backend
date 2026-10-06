describe('SarvamVoiceProvider', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.resetModules()
    process.env.SARVAM_API_KEY = 'test-key'
    process.env.SARVAM_TTS_MODEL = 'bulbul:v3'
    process.env.SARVAM_TTS_SPEAKER = 'ishita'
    process.env.SARVAM_TTS_LANGUAGE = 'en-IN'
    process.env.SARVAM_TTS_PACE = '0.92'
    process.env.SARVAM_TTS_TEMPERATURE = '0.6'
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.SARVAM_API_KEY
  })

  it('sends server-controlled Bulbul settings and exposes an audio stream', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.close()
      },
    })
    global.fetch = jest.fn().mockResolvedValue(new Response(body, { status: 200, headers: { 'content-type': 'audio/wav' } }))
    const { SarvamVoiceProvider } = await import('../../src/providers/voice/SarvamVoiceProvider')
    const provider = new SarvamVoiceProvider()

    const result = await provider.synthesizeStream('Hello from Miss Julie')
    expect(result.contentType).toBe('audio/wav')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.sarvam.ai/text-to-speech/streaming',
      expect.objectContaining({
        headers: expect.objectContaining({ 'api-subscription-key': 'test-key' }),
        body: expect.stringContaining('"speaker":"ishita"'),
      }),
    )
  })

  it('rejects empty text before calling Sarvam', async () => {
    global.fetch = jest.fn()
    const { SarvamVoiceProvider } = await import('../../src/providers/voice/SarvamVoiceProvider')
    await expect(new SarvamVoiceProvider().synthesizeStream('   ')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('sanitizes provider failures', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('secret provider details', { status: 500 }))
    const { SarvamVoiceProvider } = await import('../../src/providers/voice/SarvamVoiceProvider')
    await expect(new SarvamVoiceProvider().synthesizeStream('Try again')).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      message: 'Voice service is temporarily unavailable',
    })
  })
})
