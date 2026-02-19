import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { AppShellComponent } from './core/layout/app-shell.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page.component';
import { VerifyEmailPageComponent } from './features/auth/verify-email-page.component';
import { RequestResetPageComponent } from './features/auth/request-reset-page.component';
import { ResetPasswordPageComponent } from './features/auth/reset-password-page.component';
import { UserDashboardComponent } from './features/dashboard/user-dashboard.component';
import { DeviceListPageComponent } from './features/devices/device-list-page.component';
import { DeviceDetailPageComponent } from './features/devices/device-detail-page.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { AdminUsersPageComponent } from './features/admin/admin-users-page.component';
import { AdminGroupsPageComponent } from './features/admin/admin-groups-page.component';
import { AdminDevicesPageComponent } from './features/admin/admin-devices-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'auth/login',
    component: LoginPageComponent,
  },
  {
    path: 'auth/register',
    component: RegisterPageComponent,
  },
  {
    path: 'auth/verify-email',
    component: VerifyEmailPageComponent,
  },
  {
    path: 'auth/request-reset',
    component: RequestResetPageComponent,
  },
  {
    path: 'auth/reset-password',
    component: ResetPasswordPageComponent,
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: UserDashboardComponent },
      { path: 'devices', component: DeviceListPageComponent },
      { path: 'devices/:id', component: DeviceDetailPageComponent },
      { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
      { path: 'admin/users', component: AdminUsersPageComponent, canActivate: [adminGuard] },
      { path: 'admin/groups', component: AdminGroupsPageComponent, canActivate: [adminGuard] },
      { path: 'admin/devices', component: AdminDevicesPageComponent, canActivate: [adminGuard] },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
