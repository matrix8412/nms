import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Events</h1>
        <p class="subtitle">Host monitoring events and alerts</p>
      </div>
    </div>

    <div class="table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Host</th>
              <th>Event</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let event of events()" class="row-hover">
              <td>
                <span class="severity-dot" [ngClass]="event.severity"></span>
                {{ event.severity | titlecase }}
              </td>
              <td>{{ event.hostName }}</td>
              <td>{{ event.message }}</td>
              <td class="mono">{{ event.timestamp | date:'medium' }}</td>
            </tr>
            <tr *ngIf="events().length === 0 && !loading()">
              <td colspan="4" class="empty">
                <span class="material-icons empty-icon">check_circle</span>
                <p>No events at this time. All systems operational.</p>
              </td>
            </tr>
            <tr *ngIf="loading()">
              <td colspan="4" class="empty">Loading...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header { margin-bottom: 20px; }
      .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
      .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

      .table-card {
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        overflow: hidden;
      }
      .table-wrap { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; }
      th {
        text-align: left;
        padding: 12px 16px;
        font-size: 0.78rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }
      td {
        padding: 12px 16px;
        font-size: 0.86rem;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
      }
      .row-hover:hover { background: #f8fafc; }
      .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }

      .severity-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
      }
      .severity-dot.info { background: #3b82f6; }
      .severity-dot.warning { background: #f59e0b; }
      .severity-dot.error { background: #ef4444; }
      .severity-dot.ok { background: #22c55e; }

      .empty {
        text-align: center;
        color: #94a3b8;
        padding: 48px 16px !important;
      }
      .empty-icon { font-size: 40px; color: #22c55e; display: block; margin-bottom: 8px; }
      .empty p { margin: 0; font-size: 0.9rem; }
    `,
  ],
})
export class EventsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly loading = signal(true);
  protected readonly events = signal<Array<{
    severity: string;
    hostName: string;
    message: string;
    timestamp: string;
  }>>([]);

  ngOnInit() {
    // Events come from device metrics/monitoring - for now show empty
    // This will be populated when real monitoring data is available
    this.loading.set(false);
    this.events.set([]);
  }
}
