import { Component } from '@angular/core';

@Component({
  selector: 'app-plugins',
  standalone: true,
  template: `
    <div class="page-header">
      <div>
        <h1>Plugins</h1>
        <p class="subtitle">Extend NMS with custom plugins</p>
      </div>
    </div>

    <div class="empty-state">
      <span class="material-icons">extension</span>
      <h2>No plugins installed</h2>
      <p>Plugins will appear here once they are available. Check back later for community and custom plugins.</p>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: #1a2332; }
    .subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 32px;
      text-align: center;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .empty-state .material-icons { font-size: 64px; color: #cbd5e1; margin-bottom: 16px; }
    .empty-state h2 { margin: 0 0 8px; font-size: 1.2rem; color: #334155; font-weight: 700; }
    .empty-state p { margin: 0; color: #94a3b8; font-size: 0.92rem; max-width: 420px; line-height: 1.5; }
  `],
})
export class PluginsComponent {}
