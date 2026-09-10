import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

export type ServiceResponse<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;
  private readonly saltRounds = 12;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET ?? 'default_jwt_secret';
    this.refreshSecret = process.env.REFRESH_SECRET ?? 'default_refresh_secret';
  }

  public async hashPassword(password: string): Promise<ServiceResponse<string>> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return { success: true, data: hash };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to hash password' };
    }
  }

  public async verifyPassword(password: string, hash: string): Promise<ServiceResponse<boolean>> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return { success: true, data: isValid };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to verify password' };
    }
  }

  public async generateTokens(userId: string): Promise<ServiceResponse<AuthTokens>> {
    try {
      const accessToken = jwt.sign({ userId }, this.jwtSecret, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId }, this.refreshSecret, { expiresIn: '7d' });
      return { success: true, data: { accessToken, refreshToken } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate tokens' };
    }
  }

  public async refreshAccessToken(refreshToken: string): Promise<ServiceResponse<AuthTokens>> {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as { userId: string };
      return this.generateTokens(decoded.userId);
    } catch (error) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }
  }

  // Placeholder logic for register/login since DB isn't specified
  public async register(input: RegisterInput): Promise<ServiceResponse<{ userId: string }>> {
    try {
      const validated = RegisterSchema.parse(input);
      // DB check if user exists
      const hashResponse = await this.hashPassword(validated.password);
      if (!hashResponse.success) return { success: false, error: hashResponse.error };
      
      // Save to DB here...
      const userId = 'generated-uuid-placeholder';
      return { success: true, data: { userId } };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0]?.message ?? 'Validation failed' };
      }
      return { success: false, error: 'Registration failed' };
    }
  }

  public async login(input: LoginInput): Promise<ServiceResponse<AuthTokens>> {
    try {
      const validated = LoginSchema.parse(input);
      // Fetch user from DB
      const userHash = 'db-hash-placeholder';
      const userId = 'db-uuid-placeholder';

      const isValid = await this.verifyPassword(validated.password, userHash);
      if (!isValid.success || !isValid.data) {
        return { success: false, error: 'Invalid credentials' };
      }

      return this.generateTokens(userId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0]?.message ?? 'Validation failed' };
      }
      return { success: false, error: 'Login failed' };
    }
  }

  public async logout(userId: string): Promise<ServiceResponse<void>> {
    try {
      // Invalidate refresh token in DB
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: 'Logout failed' };
    }
  }
}
