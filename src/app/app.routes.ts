import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./features/landing-page/landing-page/landing-page.component').then(m => m.LandingPageComponent),
    },
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
    },
    { path: 'user', loadComponent: () => import('./features/dashboard/user-dashboard/user-dashboard').then(m => m.UserDashboard) },
    { path: 'profile', loadComponent: () => import('./profile-screen/profile-screen').then(m => m.ProfileScreen) },
    {
        path: '**',
        redirectTo: ''
    }

];