import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, inject, signal } from '@angular/core';

@Component({
  selector: 'app-column-filter-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="filter-shell" [class.open]="open()">
      <button
        type="button"
        class="filter-trigger"
        [class.active]="active"
        [attr.aria-label]="label"
        [title]="label"
        (click)="toggle($event)"
      >
        <span class="material-icons">filter_alt</span>
      </button>

      <div class="filter-panel" *ngIf="open()" (click)="$event.stopPropagation()">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .filter-shell {
        position: relative;
        display: inline-flex;
        flex-shrink: 0;
      }
      .filter-shell.open {
        z-index: 25;
      }
      .filter-trigger {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .filter-trigger:hover {
        background: #eef2ff;
        color: #475569;
      }
      .filter-trigger.active {
        background: #dbeafe;
        color: #2563eb;
      }
      .filter-trigger .material-icons {
        font-size: 18px;
      }
      .filter-panel {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        min-width: 220px;
        max-width: 320px;
        padding: 12px;
        border: 1px solid #dbe5f0;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
      }
      :host ::ng-deep .filter-panel .th-filter,
      :host ::ng-deep .filter-panel app-searchable-select,
      :host ::ng-deep .filter-panel .filter-input {
        width: 100%;
      }
      :host ::ng-deep .filter-panel .th-filter,
      :host ::ng-deep .filter-panel .filter-input {
        min-width: 0;
      }
      @media (max-width: 720px) {
        .filter-panel {
          left: auto;
          right: 0;
          min-width: 200px;
        }
      }
    `,
  ],
})
export class ColumnFilterTriggerComponent {
  private readonly elementRef = inject(ElementRef);

  @Input() active = false;
  @Input() label = 'Open filter';

  protected readonly open = signal(false);

  protected toggle(event: MouseEvent) {
    event.stopPropagation();
    this.open.update((current) => !current);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }
}
