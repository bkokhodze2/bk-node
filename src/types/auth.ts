export interface AuthPayload {
  userId: string;
  email: string;
  // optional JWT claims added by sign/verify
  iat?: number;
  exp?: number;
}

