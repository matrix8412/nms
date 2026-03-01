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
import { HostListComponent } from './features/hosts/host-list.component';
import { HostDetailComponent } from './features/hosts/host-detail.component';
import { HostGroupsComponent } from './features/hosts/host-groups.component';
import { EventsComponent } from './features/events/events.component';
import { AuditLogsComponent } from './features/audit-logs/audit-logs.component';
import { UsersComponent } from './features/users/users.component';
import { SettingsComponent } from './features/settings/settings.component';
import { RolesComponent } from './features/settings/roles.component';
import { IntegrationsComponent } from './features/settings/integrations.component';
import { PluginsComponent } from './features/settings/plugins.component';
import { CatalogsComponent } from './features/settings/catalogs.component';

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
      { path: 'hosts', component: HostListComponent },
      { path: 'hosts/:id', component: HostDetailComponent },
      { path: 'events', component: EventsComponent },

      // Settings (admin)
      { path: 'settings', component: SettingsComponent, canActivate: [adminGuard] },
      { path: 'settings/users', component: UsersComponent, canActivate: [adminGuard] },
      { path: 'settings/audit-logs', component: AuditLogsComponent, canActivate: [adminGuard] },
      { path: 'settings/roles', component: RolesComponent, canActivate: [adminGuard] },
      { path: 'settings/integrations', component: IntegrationsComponent, canActivate: [adminGuard] },
      { path: 'settings/plugins', component: PluginsComponent, canActivate: [adminGuard] },
      { path: 'settings/catalogs', component: CatalogsComponent, canActivate: [adminGuard] },
      { path: 'settings/host-groups', component: HostGroupsComponent, canActivate: [adminGuard] },

      // Legacy redirects
      { path: 'devices', redirectTo: 'hosts', pathMatch: 'full' },
      { path: 'devices/:id', redirectTo: 'hosts/:id' },
      { path: 'admin', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'admin/users', redirectTo: 'settings/users', pathMatch: 'full' },
      { path: 'hosts/groups', redirectTo: 'settings/host-groups', pathMatch: 'full' },
      { path: 'admin/groups', redirectTo: 'settings', pathMatch: 'full' },
      { path: 'admin/devices', redirectTo: 'hosts', pathMatch: 'full' },
      { path: 'users', redirectTo: 'settings/users', pathMatch: 'full' },
      { path: 'audit-logs', redirectTo: 'settings/audit-logs', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
