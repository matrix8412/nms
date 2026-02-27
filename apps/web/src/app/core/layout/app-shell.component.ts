import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  adminOnly?: boolean;
  children?: { label: string; route: string; icon?: string }[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Mobile overlay -->
    <div
      class="mobile-overlay"
      [class.visible]="sidebarOpen()"
      (click)="sidebarOpen.set(false)"
    ></div>

    <!-- Sidebar -->
    <aside class="sidebar" [class.open]="sidebarOpen()" [class.collapsed]="sidebarCollapsed()">
      <div class="sidebar-brand">
        <span class="material-icons brand-icon">hub</span>
        <span class="brand-text" *ngIf="!sidebarCollapsed()">NMS</span>
      </div>

      <div class="sidebar-user" *ngIf="!sidebarCollapsed()">
        <div class="user-avatar">
          <span class="material-icons">account_circle</span>
        </div>
        <div class="user-info">
          <span class="user-name">{{ userName() }}</span>
          <span class="user-role">{{ userRole() }}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <ng-container *ngFor="let item of visibleNav()">
          <!-- Simple nav item -->
          <a
            *ngIf="!item.children && item.route"
            class="nav-item"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            (click)="onNavClick()"
          >
            <span class="material-icons nav-icon">{{ item.icon }}</span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">{{ item.label }}</span>
          </a>

          <!-- Expandable nav group -->
          <div *ngIf="item.children" class="nav-group">
            <button
              class="nav-item nav-group-toggle"
              (click)="toggleGroup(item.label)"
              [class.expanded]="isGroupExpanded(item.label)"
              type="button"
            >
              <span class="material-icons nav-icon">{{ item.icon }}</span>
              <span class="nav-label" *ngIf="!sidebarCollapsed()">{{ item.label }}</span>
              <span class="material-icons expand-icon" *ngIf="!sidebarCollapsed()">
                {{ isGroupExpanded(item.label) ? 'expand_less' : 'expand_more' }}
              </span>
            </button>
            <div class="nav-children" *ngIf="isGroupExpanded(item.label) && !sidebarCollapsed()">
              <a
                *ngFor="let child of item.children"
                class="nav-item child"
                [routerLink]="child.route"
                routerLinkActive="active"
                (click)="onNavClick()"
              >
                <span class="material-icons nav-icon">{{ child.icon || 'chevron_right' }}</span>
                <span class="nav-label">{{ child.label }}</span>
              </a>
            </div>
          </div>
        </ng-container>
      </nav>

      <div class="sidebar-footer" *ngIf="!sidebarCollapsed()">
        <button class="nav-item logout-btn" (click)="logout()" type="button">
          <span class="material-icons nav-icon">logout</span>
          <span class="nav-label">Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="main-wrapper" [class.sidebar-collapsed]="sidebarCollapsed()">
      <header class="topbar">
        <button class="topbar-btn" (click)="toggleSidebar()" type="button" aria-label="Toggle menu">
          <span class="material-icons">menu</span>
        </button>
        <div class="topbar-spacer"></div>
        <div class="topbar-user">
          <span class="material-icons">account_circle</span>
          <span class="topbar-username">{{ userName() }}</span>
        </div>
      </header>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        height: 100dvh;
        overflow: hidden;
      }

      .mobile-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 90;
      }
      @media (max-width: 992px) {
        .mobile-overlay.visible {
          display: block;
        }
      }

      .sidebar {
        width: 260px;
        min-width: 260px;
        background: linear-gradient(180deg, #1a2332 0%, #1e3a4f 100%);
        color: #c8d6e5;
        display: flex;
        flex-direction: column;
        transition: width 0.25s ease, min-width 0.25s ease;
        z-index: 100;
        overflow-y: auto;
        overflow-x: hidden;
      }
      .sidebar.collapsed {
        width: 64px;
        min-width: 64px;
      }
      @media (max-width: 992px) {
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }
        .sidebar.open {
          transform: translateX(0);
        }
        .sidebar.collapsed {
          width: 260px;
          min-width: 260px;
        }
      }

      .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 16px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .brand-icon {
        font-size: 32px;
        color: #4fc3f7;
      }
      .brand-text {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 1.4rem;
        color: #fff;
        letter-spacing: 1px;
      }

      .sidebar-user {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .user-avatar .material-icons {
        font-size: 40px;
        color: #4fc3f7;
      }
      .user-info {
        display: flex;
        flex-direction: column;
      }
      .user-name {
        font-weight: 600;
        color: #fff;
        font-size: 0.9rem;
      }
      .user-role {
        font-size: 0.75rem;
        color: #8eafc4;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .sidebar-nav {
        flex: 1;
        padding: 12px 8px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        color: #b0c4d8;
        text-decoration: none;
        font-size: 0.88rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
      }
      .nav-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
      }
      .nav-item.active {
        background: rgba(79, 195, 247, 0.15);
        color: #4fc3f7;
      }
      .nav-item.active .nav-icon {
        color: #4fc3f7;
      }
      .nav-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      .nav-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .expand-icon {
        margin-left: auto;
        font-size: 18px;
      }

      .nav-group-toggle {
        font-family: inherit;
      }

      .nav-children {
        padding-left: 8px;
      }
      .nav-item.child {
        padding: 8px 12px 8px 16px;
        font-size: 0.84rem;
      }
      .nav-item.child .nav-icon {
        font-size: 16px;
      }

      .sidebar-footer {
        padding: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .logout-btn {
        color: #f87171;
        font-family: inherit;
      }
      .logout-btn:hover {
        background: rgba(248, 113, 113, 0.12);
        color: #fca5a5;
      }

      .main-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #f0f4f8;
      }

      .topbar {
        display: flex;
        align-items: center;
        height: 56px;
        padding: 0 20px;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
        flex-shrink: 0;
      }
      .topbar-btn {
        border: none;
        background: none;
        cursor: pointer;
        color: #475569;
        padding: 6px;
        border-radius: 6px;
        display: flex;
        align-items: center;
      }
      .topbar-btn:hover {
        background: #f1f5f9;
      }
      .topbar-spacer {
        flex: 1;
      }
      .topbar-user {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #475569;
        font-size: 0.88rem;
        font-weight: 500;
      }
      .topbar-user .material-icons {
        font-size: 28px;
        color: #94a3b8;
      }

      .content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }
      @media (max-width: 768px) {
        .content {
          padding: 16px;
        }
      }
    `,
  ],
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly sidebarOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);

  private readonly handsetSignal = toSignal(this.breakpoints.observe('(max-width: 992px)'));
  protected readonly isHandset = computed(() => this.handsetSignal()?.matches ?? false);
  protected readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');

  protected readonly userName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    return user.email.split('@')[0] ?? user.email;
  });

  protected readonly userRole = computed(() => this.auth.currentUser()?.role ?? 'USER');

  private readonly expandedGroups = signal<Set<string>>(new Set(['Hosts']));

  private readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    {
      label: 'Hosts',
      icon: 'dns',
      children: [
        { label: 'All Hosts', route: '/hosts', icon: 'list' },
        { label: 'Host Groups', route: '/hosts/groups', icon: 'folder' },
      ],
    },
    { label: 'Events', icon: 'event_note', route: '/events' },
    {
      label: 'Settings',
      icon: 'settings',
      adminOnly: true,
      children: [
        { label: 'General', route: '/settings', icon: 'tune' },
        { label: 'Users', route: '/settings/users', icon: 'people' },
        { label: 'Audit Logs', route: '/settings/audit-logs', icon: 'history' },
        { label: 'Roles', route: '/settings/roles', icon: 'admin_panel_settings' },
        { label: 'Integrations', route: '/settings/integrations', icon: 'extension' },
        { label: 'Plugins', route: '/settings/plugins', icon: 'power' },
        { label: 'Catalogs', route: '/settings/catalogs', icon: 'inventory_2' },
      ],
    },
  ];

  protected readonly visibleNav = computed(() => {
    const admin = this.isAdmin();
    return this.navItems.filter((item) => !item.adminOnly || admin);
  });

  protected isGroupExpanded(label: string): boolean {
    return this.expandedGroups().has(label);
  }

  protected toggleGroup(label: string) {
    const groups = new Set(this.expandedGroups());
    if (groups.has(label)) {
      groups.delete(label);
    } else {
      groups.add(label);
    }
    this.expandedGroups.set(groups);
  }

  protected toggleSidebar() {
    if (this.isHandset()) {
      this.sidebarOpen.set(!this.sidebarOpen());
    } else {
      this.sidebarCollapsed.set(!this.sidebarCollapsed());
    }
  }

  protected onNavClick() {
    if (this.isHandset()) {
      this.sidebarOpen.set(false);
    }
  }

  protected logout() {
    this.auth.logout().subscribe();
  }
}
