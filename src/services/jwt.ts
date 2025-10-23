import jwt from 'jsonwebtoken';
import {IUserForToken} from '../types/auth';

const ACCESS_SECRET = process.env.JWT_SECRET || '1dev_access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '1dev_refresh_secret_change_me';

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function signAccessToken(payload: IUserForToken): string {
  // cast to any to satisfy typing differences across jsonwebtoken versions
  return jwt.sign({...payload}, ACCESS_SECRET, {expiresIn: ACCESS_EXPIRES_IN} as any) as string;
}

export function signRefreshToken(payload: IUserForToken): string {
  return jwt.sign({...payload} as any, REFRESH_SECRET as any, {expiresIn: REFRESH_EXPIRES_IN} as any) as string;
}

export function verifyAccessToken(token: string): IUserForToken {
  return jwt.verify(token, ACCESS_SECRET) as IUserForToken;
}

export function verifyRefreshToken(token: string): IUserForToken {
  return jwt.verify(token, REFRESH_SECRET) as IUserForToken;
}
