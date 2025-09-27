import { SetMetadata } from '@nestjs/common';

export const CSRF_PROTECTED_KEY = 'csrf_protected';

/**
 * Mark endpoints that require CSRF protection
 * This should be used on state-changing operations
 */
export const CsrfProtected = () => SetMetadata(CSRF_PROTECTED_KEY, true);

/**
 * Mark endpoints that are safe from CSRF (read-only operations)
 */
export const CsrfSafe = () => SetMetadata(CSRF_PROTECTED_KEY, false);
