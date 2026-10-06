import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is missing`)
  return value
}

export class S3Service {
  private static client(): S3Client {
    return new S3Client({
      region: required('AWS_REGION'),
      credentials: {
        accessKeyId: required('AWS_ACCESS_KEY_ID'),
        secretAccessKey: required('AWS_SECRET_ACCESS_KEY'),
      },
    })
  }

  private static bucket(): string {
    return required('AWS_S3_BUCKET')
  }

  static async putAudio(key: string, body: Buffer, contentType = 'audio/wav'): Promise<void> {
    await this.client().send(
      new PutObjectCommand({
        Bucket: this.bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'private, max-age=31536000, immutable',
        ServerSideEncryption: 'AES256',
      }),
    )
  }

  static async getAudio(key: string): Promise<Buffer | null> {
    try {
      const result = await this.client().send(
        new GetObjectCommand({ Bucket: this.bucket(), Key: key }),
      )
      if (!result.Body) return null
      const bytes = await result.Body.transformToByteArray()
      return Buffer.from(bytes)
    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode
      const code = error?.name || error?.Code
      if (status === 404 || code === 'NoSuchKey' || code === 'NotFound') return null
      throw error
    }
  }
}
