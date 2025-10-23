import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types/auth';

const ACCESS_SECRET = process.env.JWT_SECRET || '1dev_access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '1dev_refresh_secret_change_me';

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function signAccessToken(payload: AuthPayload): string {
  // cast to any to satisfy typing differences across jsonwebtoken versions
  return jwt.sign(payload as any, ACCESS_SECRET as any, { expiresIn: ACCESS_EXPIRES_IN } as any) as string;
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload as any, REFRESH_SECRET as any, { expiresIn: REFRESH_EXPIRES_IN } as any) as string;
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token as any, ACCESS_SECRET as any) as AuthPayload;
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token as any, REFRESH_SECRET as any) as AuthPayload;
}
