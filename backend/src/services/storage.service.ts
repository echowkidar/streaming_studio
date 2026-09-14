import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

export type ServiceResponse<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

export const FileUploadSchema = z.object({
  bucket: z.string(),
  key: z.string(),
  contentType: z.string(),
  body: z.any(), // In practice, Buffer | Uint8Array | Readable
});

export type FileUploadInput = z.infer<typeof FileUploadSchema>;

export class StorageService {
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;
  private ensuredBuckets = new Set<string>();

  constructor() {
    this.defaultBucket = process.env.MINIO_BUCKET || 'livestudio';
    const accessKey = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
    this.s3Client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
      region: process.env.MINIO_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
  }

  private async ensureBucket(bucket: string): Promise<void> {
    if (this.ensuredBuckets.has(bucket)) return;
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
      this.ensuredBuckets.add(bucket);
    } catch (headErr: any) {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
        this.ensuredBuckets.add(bucket);
      } catch (createErr) {
        console.warn(`Could not auto-create bucket ${bucket}:`, createErr);
      }
    }
  }

  public async uploadFile(input: Omit<FileUploadInput, 'bucket'> & { bucket?: string }): Promise<ServiceResponse<{ url: string }>> {
    try {
      const bucket = input.bucket ?? this.defaultBucket;
      await this.ensureBucket(bucket);

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      });

      try {
        await this.s3Client.send(command);
      } catch (sendErr: any) {
        // If error is NoSuchBucket, create bucket and retry once
        if (sendErr?.name === 'NoSuchBucket' || sendErr?.message?.includes('bucket does not exist')) {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
          this.ensuredBuckets.add(bucket);
          await this.s3Client.send(command);
        } else {
          throw sendErr;
        }
      }

      return { 
        success: true, 
        data: { url: `/${bucket}/${input.key}` } 
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'File upload failed' };
    }
  }

  public async getPresignedUrl(key: string, bucket?: string, expiresIn: number = 3600): Promise<ServiceResponse<string>> {
    try {
      const targetBucket = bucket ?? this.defaultBucket;
      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return { success: true, data: url };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate presigned URL' };
    }
  }

  public async getFileStream(key: string, bucket?: string): Promise<ServiceResponse<{ stream: any; contentType?: string; contentLength?: number }>> {
    try {
      const targetBucket = bucket ?? this.defaultBucket;
      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        success: true,
        data: {
          stream: response.Body,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to retrieve file stream' };
    }
  }

  public async deleteFile(key: string, bucket?: string): Promise<ServiceResponse<void>> {
    try {
      const targetBucket = bucket ?? this.defaultBucket;
      const command = new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'File deletion failed' };
    }
  }
}
