import * as crypto from 'crypto';
import { z } from 'zod';

export type ServiceResponse<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

export const EncryptionDataSchema = z.object({
  iv: z.string(),
  authTag: z.string(),
  encryptedData: z.string(),
});

export type EncryptionData = z.infer<typeof EncryptionDataSchema>;

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef';
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes long');
    }
    this.secretKey = Buffer.from(key, 'utf-8');
  }

  public async encrypt(text: string): Promise<ServiceResponse<EncryptionData>> {
    try {
      if (!text) {
        return { success: false, error: 'Text to encrypt cannot be empty' };
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');

      return {
        success: true,
        data: {
          iv: iv.toString('hex'),
          authTag,
          encryptedData: encrypted,
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Encryption failed' };
    }
  }

  public async decrypt(data: EncryptionData): Promise<ServiceResponse<string>> {
    try {
      const validated = EncryptionDataSchema.parse(data);
      
      const ivBuffer = Buffer.from(validated.iv, 'hex');
      const authTagBuffer = Buffer.from(validated.authTag, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, ivBuffer);
      
      decipher.setAuthTag(authTagBuffer);
      
      let decrypted = decipher.update(validated.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return { success: true, data: decrypted };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid encryption data format' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Decryption failed' };
    }
  }
}
