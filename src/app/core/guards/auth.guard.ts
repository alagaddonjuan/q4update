import { inject } from '@angular/core';
import { Router, CanActivateFn, CanActivateChildFn } from '@angular/router';
import { authService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(authService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Redirect to login if not authenticated
  return router.createUrlTree(['/auth/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(authService);
  const router = inject(Router);

  // Check if user is authenticated first
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // Check if user is admin
  if (auth.isAdmin()) {
    return true;
  }

  // Redirect non-admin users to user dashboard
  return router.createUrlTree(['/user/dashboard']);
};

export const clientGuard: CanActivateFn = () => {
  const auth = inject(authService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // Check if user is NOT an admin (is a regular client)
  if (!auth.isAdmin()) {
    return true;
  }

  // Redirect admin users to admin dashboard
  return router.createUrlTree(['/admin/dashboard']);
};

// Guard to protect child routes
export const authChildGuard: CanActivateChildFn = (childRoute, state) => {
  return authGuard(childRoute, state);
};