import { Request, Response } from 'express';

const THEME_COOKIE_NAME = 'preferred-theme';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

/**
 * Set the theme cookie
 */
export function setThemeCookie(res: Response, theme: string) {
  res.cookie(THEME_COOKIE_NAME, theme, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false, // Allow JavaScript access
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Get the theme from the cookie
 */
export function getThemeFromCookie(req: Request): string | undefined {
  const theme = req.cookies?.[THEME_COOKIE_NAME];
  return theme;
}

/**
 * Clear the theme cookie
 */
export function clearThemeCookie(res: Response) {
  res.clearCookie(THEME_COOKIE_NAME, { path: '/' });
} 