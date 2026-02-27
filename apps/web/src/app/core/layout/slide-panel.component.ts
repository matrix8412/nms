import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-slide-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" [class.open]="isOpen" (click)="close.emit()"></div>
    <aside class="panel" [class.open]="isOpen">
      <header class="panel-header">
        <h2>{{ title }}</h2>
        <button class="close-btn" (click)="close.emit()" type="button" aria-label="Close">
          <span class="material-icons">close</span>
        </button>
      </header>
      <div class="panel-body">
        <ng-content />
      </div>
    </aside>
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        z-index: 999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(520px, 95vw);
        background: #fff;
        z-index: 1000;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
      }
      .panel.open {
        transform: translateX(0);
      }
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e9ef;
        background: #f8fafc;
      }
      .panel-header h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #1a2332;
      }
      .close-btn {
        border: none;
        background: none;
        cursor: pointer;
        color: #64748b;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .close-btn:hover {
        background: #e2e8f0;
        color: #1a2332;
      }
      .panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }
    `,
  ],
})
export class SlidePanelComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Output() close = new EventEmitter<void>();
}
