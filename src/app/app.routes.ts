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
                loadComponent: () => import('./features/dashboard/admin/admin-dashboard/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
            },
            {
                path: 'registered-clients',
                loadComponent: () => import('./features/dashboard/admin/registered-clients/registered-clients').then(m => m.RegisteredClients)
            },
            {
                path: 'sms-logs',
                loadComponent: () => import('./features/dashboard/admin/sms-logs/sms-logs').then(m => m.SmsLogs)
            },
            {
                path: 'airtime-logs',
                loadComponent: () => import('./features/dashboard/admin/airtime-logs/airtime-logs').then(m => m.AirtimeLogs)
            },
            {
                path: 'transaction-logs',
                loadComponent: () => import('./features/dashboard/admin/transaction-logs/transaction-logs').then(m => m.TransactionLogs)
            },
            {
                path: 'ussd-logs',
                loadComponent: () => import('./features/dashboard/admin/ussd-logs/ussd-logs').then(m => m.UssdLogs)
            },
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }

];