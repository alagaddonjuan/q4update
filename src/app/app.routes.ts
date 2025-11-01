import { Routes } from '@angular/router';

<<<<<<< HEAD
export const routes: Routes = [
    {path: 'login', loadComponent: () => import('./login/login').then(m => m.Login)},
    {path: 'user', loadComponent: () => import('./user-dashboard/user-dashboard').then(m => m.UserDashboard)},
    {path:'profile', loadComponent: () => import('./profile-screen/profile-screen').then(m => m.ProfileScreen)},
    {path:'sign-up', loadComponent: () => import('./signup/signup').then(m => m.Signup)},
    {path: 'forgot-password', loadComponent: () => import('./forgot-password/forgot-password').then(m => m.ForgotPassword)},
    {path: 'otp-verification', loadComponent: () => import('./otp-verification/otp-verification').then(m => m.OtpVerification)},
    {path:'password-success', loadComponent: () => import('./password-success/password-success').then(m => m.PasswordSuccess)},

];
 
=======
export const routes: Routes = [];
>>>>>>> origin/angular-version-branch
