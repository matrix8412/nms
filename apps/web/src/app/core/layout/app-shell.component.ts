import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
  ],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="isHandset() ? sidenavOpen() : true"
        (closedStart)="sidenavOpen.set(false)"
      >
        <div class="brand">
          <span class="brand-title">NMS Console</span>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a mat-list-item routerLink="/devices" routerLinkActive="active">Devices</a>
          <a
            *ngIf="isAdmin()"
            mat-list-item
            routerLink="/admin"
            routerLinkActive="active"
            (click)="closeOnMobile()"
            >Admin</a
          >
          <a
            *ngIf="isAdmin()"
            mat-list-item
            routerLink="/admin/users"
            routerLinkActive="active"
            (click)="closeOnMobile()"
            >Users</a
          >
          <a
            *ngIf="isAdmin()"
            mat-list-item
            routerLink="/admin/groups"
            routerLinkActive="active"
            (click)="closeOnMobile()"
            >Groups</a
          >
          <a
            *ngIf="isAdmin()"
            mat-list-item
            routerLink="/admin/devices"
            routerLinkActive="active"
            (click)="closeOnMobile()"
            >Device Admin</a
          >
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="topbar">
          <button
            mat-icon-button
            type="button"
            *ngIf="isHandset()"
            (click)="sidenavOpen.set(!sidenavOpen())"
            aria-label="Toggle navigation"
          >
            <mat-icon>menu</mat-icon>
          </button>
          <span class="title">Network Management System</span>
          <span class="spacer"></span>
          <button mat-stroked-button color="primary" type="button" (click)="logout()">Logout</button>
        </mat-toolbar>

        <section class="content">
          <router-outlet />
        </section>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .shell {
        height: 100dvh;
      }
      .brand {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        padding: 16px 20px;
        border-bottom: 1px solid #dfe7ef;
      }
      .brand-title {
        color: #0d2d46;
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 2;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid #dbe5ef;
      }
      .title {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
      }
      .spacer {
        flex: 1;
      }
      .content {
        padding: 20px;
      }
      .active {
        background: #d8eef3;
        border-radius: 8px;
      }
      @media (max-width: 768px) {
        .content {
          padding: 14px;
        }
      }
    `,
  ],
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly sidenavOpen = signal(false);
  private readonly handsetSignal = toSignal(this.breakpoints.observe('(max-width: 992px)'));
  protected readonly isHandset = computed(() => this.handsetSignal()?.matches ?? false);
  protected readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');

  protected closeOnMobile() {
    if (this.isHandset()) {
      this.sidenavOpen.set(false);
    }
  }

  protected logout() {
    this.auth.logout().subscribe();
  }
}
