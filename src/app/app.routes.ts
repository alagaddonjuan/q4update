import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./features/landing-page/landing-page/landing-page.component').then(m => m.LandingPageComponent),
    },
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes),
    },
    {
        path: 'user',
        loadComponent: () => import('./features/dashboard/user-dashboard/client-layout.component').then(m => m.ClientLayoutComponent),
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard-screen/dashboard-screen').then(m => m.DashboardScreen) },
            { path: 'services', loadComponent: () => import('./features/dashboard/services-screen/services-screen').then(m => m.ServicesScreen) },
            { path: 'ussd', loadComponent: () => import('./features/dashboard/ussd-screen/ussd-screen').then(m => m.UssdScreen) },
            { path: 'menu-builder', loadComponent: () => import('./features/dashboard/menu-builder/menu-builder').then(m => m.MenuBuilder) },
            { path: 'menus/:id/edit', loadComponent: () => import('./features/dashboard/menu-screen/menu-screen').then(m => m.MenuScreen) },
            { path: 'billing', loadComponent: () => import('./features/dashboard/billing-screen/billing-screen').then(m => m.BillingScreen) },
            { path: 'team', loadComponent: () => import('./features/dashboard/team-screen/team-screen').then(m => m.TeamScreen) },
            { path: 'profile', loadComponent: () => import('./features/dashboard/profile-screen/profile-screen').then(m => m.ProfileScreen) },

        ]
    },
    {
        path: 'admin',
        loadComponent: () => import('./features/dashboard/user-dashboard/admin-layout.component').then(m => m.AdminLayoutComponent),
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard-screen/dashboard-screen').then(m => m.DashboardScreen)
                // You can create a dedicated admin dashboard screen later
            },
            {
                path: 'users',
                // Example of a future admin-only screen
                loadComponent: () => import('./features/dashboard/team-screen/team-screen').then(m => m.TeamScreen)
            },
            {
                path: 'settings',
                // Example of a future admin-only screen
                loadComponent: () => import('./features/dashboard/profile-screen/profile-screen').then(m => m.ProfileScreen)
            },
        ]
    },
    // The route for editing menus is now a child of the 'user' path, which is more logical.
    // I have moved it inside the 'user' children array.
    // {path: 'menus/:id/edit', loadComponent: () => import('./features/dashboard/menu-screen/menu-screen').then(m => m.MenuScreen)},

    {
        path: '**',
        redirectTo: ''
    }

];