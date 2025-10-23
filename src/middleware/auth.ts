import {Request, Response, NextFunction} from 'express';
import {verifyAccessToken} from '../services/jwt';
import {IUser} from "../models/User";
import {IUserForToken} from "../types/auth";

export interface AuthRequest extends Request {
  user?: IUserForToken;
}

export default function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({error: 'Unauthorized'});
    }

    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({error: 'Unauthorized'});
    }

    const token = parts[1];
    try {
      // attach user payload to request for downstream handlers
      console.log("verifyAccessToken(token)",verifyAccessToken(token))
      req.user = verifyAccessToken(token);
      return next();
    } catch (err) {
      return res.status(401).json({error: 'Invalid or expired token'});
    }
  } catch (err: any) {
    return res.status(500).json({error: err?.message || 'Internal server error'});
  }
}
