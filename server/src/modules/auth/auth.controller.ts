/**
 * Auth controller — handles login, refresh, logout, MFA, password.
 * Uses queryHandler because the auth service manages its own transactions.
 */

import type { Request, Response } from 'express';
import type { ControllerResult, ILoginResponse, IMfaSetupResponse, IUserPublic } from '@am-pms/shared-types';
import { authService } from './auth.service.js';
import { config } from '../../common/config/env.js';
import { UnauthorizedError } from '../../common/utils/errors.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export class AuthController {
  async login(req: Request, res: Response): Promise<ControllerResult<ILoginResponse>> {
    const { username, password } = req.body;
    const result = await authService.login(username, password, req.ip, String(req.id));

    if (result.refreshToken) {
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());
      delete result.refreshToken;
    }

    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async refresh(req: Request, res: Response): Promise<ControllerResult<{ accessToken: string }>> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token provided');
    }

    const result = await authService.refreshTokens(refreshToken, req.ip, String(req.id));
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    (req as any).__transactionCommitted = true;
    return { status: 200, data: { accessToken: result.accessToken } };
  }

  async logout(req: Request, res: Response): Promise<ControllerResult<{ message: string }>> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(req.user!.sub, refreshToken, req.ip, String(req.id));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });

    (req as any).__transactionCommitted = true;
    return { status: 200, data: { message: 'Logged out successfully' } };
  }

  async logoutAll(req: Request, res: Response): Promise<ControllerResult<{ message: string }>> {
    await authService.logoutAll(req.user!.sub, req.ip, String(req.id));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });

    (req as any).__transactionCommitted = true;
    return { status: 200, data: { message: 'All sessions terminated' } };
  }

  async setupMfa(req: Request): Promise<ControllerResult<IMfaSetupResponse>> {
    const result = await authService.setupMfa(req.user!.sub);
    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async verifyMfa(req: Request, res: Response): Promise<ControllerResult<ILoginResponse>> {
    const { code } = req.body;
    const result = await authService.verifyMfa(req.user!.sub, code, req.ip, String(req.id));

    if (result.refreshToken) {
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());
      delete result.refreshToken;
    }

    (req as any).__transactionCommitted = true;
    return { status: 200, data: result };
  }

  async changePassword(req: Request, res: Response): Promise<ControllerResult<{ message: string }>> {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.sub, currentPassword, newPassword, req.ip, String(req.id));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });

    (req as any).__transactionCommitted = true;
    return { status: 200, data: { message: 'Password changed successfully' } };
  }

  async getMe(req: Request): Promise<ControllerResult<IUserPublic>> {
    const user = await authService.getMe(req.user!.sub);
    return { status: 200, data: user };
  }
}

export const authController = new AuthController();
