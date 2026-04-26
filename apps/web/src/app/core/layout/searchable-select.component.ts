import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
  forwardRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { matchesSearchText, normalizeSearchText } from '../utils/search.util';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string | null;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="select-shell" [class.open]="isOpen()" [class.compact]="compact" [class.disabled]="disabled">
      <button type="button" class="select-trigger" [disabled]="disabled" (click)="toggleOpen()">
        <div class="select-copy">
          <span class="select-value" [class.placeholder]="!hasSelection()">{{ displayLabel() }}</span>
          <div class="chip-list" *ngIf="multiple && selectedOptions().length > 0">
            <span class="chip" *ngFor="let option of selectedOptions().slice(0, compact ? 2 : 4)">{{ option.label }}</span>
            <span class="chip chip-more" *ngIf="selectedOptions().length > (compact ? 2 : 4)">
              +{{ selectedOptions().length - (compact ? 2 : 4) }}
            </span>
          </div>
          <span class="select-meta" *ngIf="metaText && !compact">{{ metaText }}</span>
        </div>
        <span class="material-icons select-icon">{{ isOpen() ? 'expand_less' : 'expand_more' }}</span>
      </button>

      <button
        *ngIf="clearable && hasSelection()"
        type="button"
        class="select-clear"
        [disabled]="disabled"
        [attr.aria-label]="clearLabel"
        (click)="clearSelection($event)"
      >
        <span class="material-icons">close</span>
      </button>

      <div class="select-panel" *ngIf="isOpen()">
        <div class="search-box" *ngIf="searchable">
          <span class="material-icons">search</span>
          <input
            type="text"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            [ngModelOptions]="{ standalone: true }"
            [placeholder]="searchPlaceholder"
          />
        </div>

        <button
          *ngIf="allowEmpty"
          type="button"
          class="option option-empty"
          [class.selected]="!hasSelection()"
          (click)="selectEmpty()"
        >
          <div class="option-copy">
            <span class="option-title">{{ emptyOptionLabel }}</span>
          </div>
          <span class="material-icons option-state">
            {{ multiple ? 'remove_done' : (!hasSelection() ? 'radio_button_checked' : 'radio_button_unchecked') }}
          </span>
        </button>

        <div class="option-list" *ngIf="filteredOptions().length > 0; else emptyState">
          <button
            *ngFor="let option of filteredOptions()"
            type="button"
            class="option"
            [class.selected]="isSelected(option.value)"
            (click)="selectOption(option)"
          >
            <div class="option-copy">
              <span class="option-title">{{ option.label }}</span>
              <span class="option-description" *ngIf="option.description">{{ option.description }}</span>
            </div>
            <span class="material-icons option-state">
              {{ multiple
                ? (isSelected(option.value) ? 'check_box' : 'check_box_outline_blank')
                : (isSelected(option.value) ? 'radio_button_checked' : 'radio_button_unchecked') }}
            </span>
          </button>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            <span class="material-icons">manage_search</span>
            <p>{{ emptyStateLabel }}</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [
    `
      .select-shell {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .select-shell.open {
        z-index: 30;
      }
      .select-shell.disabled {
        opacity: 0.7;
      }
      .select-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px;
        border: 1px solid #dbe5f0;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
        text-align: left;
        cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
      }
      .select-trigger:hover:not(:disabled) {
        border-color: #93c5fd;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
      }
      .select-trigger:disabled {
        cursor: not-allowed;
      }
      .select-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .select-value {
        font-size: 0.9rem;
        font-weight: 700;
        color: #0f172a;
      }
      .select-value.placeholder {
        color: #94a3b8;
        font-weight: 600;
      }
      .select-meta {
        font-size: 0.78rem;
        color: #64748b;
      }
      .select-icon {
        color: #3b82f6;
        font-size: 20px;
      }
      .select-clear {
        width: 42px;
        min-width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #fff;
        color: #64748b;
        cursor: pointer;
      }
      .select-clear:hover:not(:disabled) {
        border-color: #fca5a5;
        color: #dc2626;
        background: #fff5f5;
      }
      .select-panel {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border: 1px solid #dbe5f0;
        border-radius: 18px;
        background: linear-gradient(180deg, #ffffff, #f8fafc);
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
      }
      .search-box {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid #dbe5f0;
        border-radius: 14px;
        background: #fff;
      }
      .search-box .material-icons {
        color: #64748b;
        font-size: 20px;
      }
      .search-box input {
        width: 100%;
        border: none;
        outline: none;
        background: transparent;
        font-size: 0.9rem;
        color: #0f172a;
        font-family: inherit;
      }
      .option-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 240px;
        overflow-y: auto;
      }
      .option {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px;
        border: 1px solid #dbe5f0;
        border-radius: 16px;
        background: #fff;
        text-align: left;
        cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
      }
      .option:hover {
        border-color: #93c5fd;
        box-shadow: 0 12px 26px rgba(59,130,246,0.12);
        transform: translateY(-1px);
      }
      .option.selected {
        border-color: #3b82f6;
        background: linear-gradient(180deg, #eff6ff, #ffffff);
      }
      .option-empty {
        margin-bottom: 2px;
      }
      .option-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .option-title {
        font-size: 0.88rem;
        font-weight: 700;
        color: #0f172a;
      }
      .option-description {
        font-size: 0.78rem;
        color: #64748b;
      }
      .option-state {
        color: #3b82f6;
        font-size: 22px;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px 12px;
        border: 1px dashed #cbd5e1;
        border-radius: 16px;
        color: #64748b;
        text-align: center;
      }
      .empty-state p {
        margin: 0;
        font-size: 0.84rem;
        font-weight: 700;
      }
      .chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        background: #e0f2fe;
        color: #0f172a;
        font-size: 0.74rem;
        font-weight: 700;
      }
      .chip-more {
        background: #e2e8f0;
        color: #475569;
      }

      .select-shell.compact .select-trigger {
        padding: 6px 10px;
        min-height: 34px;
        border-radius: 8px;
        background: #fff;
      }
      .select-shell.compact .select-clear {
        width: 34px;
        min-width: 34px;
        height: 34px;
        border-radius: 8px;
      }
      .select-shell.compact .select-value {
        font-size: 0.82rem;
      }
      .select-shell.compact .select-icon {
        font-size: 18px;
      }
      .select-shell.compact .select-panel {
        padding: 10px;
        border-radius: 14px;
      }
      .select-shell.compact .search-box {
        padding: 8px 10px;
        border-radius: 10px;
      }
      .select-shell.compact .option {
        padding: 10px 12px;
        border-radius: 12px;
      }
      .select-shell.compact .option-title {
        font-size: 0.82rem;
      }
      .select-shell.compact .option-description {
        font-size: 0.74rem;
      }

      @media (max-width: 720px) {
        .select-shell {
          flex-direction: column;
        }
        .select-clear {
          width: 100%;
          min-width: 0;
        }
        .select-panel {
          position: relative;
          top: auto;
        }
      }
    `,
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor, OnChanges {
  private readonly elementRef = inject(ElementRef);
  private readonly optionsVersion = signal(0);
  private readonly valueVersion = signal(0);

  @Input() options: SearchableSelectOption[] = [];
  @Input() placeholder = 'Select';
  @Input() metaText = '';
  @Input() searchPlaceholder = 'Search';
  @Input() emptyStateLabel = 'No matching results';
  @Input() emptyOptionLabel = 'None';
  @Input() clearLabel = 'Clear selection';
  @Input() multiple = false;
  @Input() searchable = true;
  @Input() clearable = true;
  @Input() allowEmpty = true;
  @Input() compact = false;

  protected readonly isOpen = signal(false);
  protected readonly query = signal('');

  private internalValue: string | string[] = '';
  private onChange: (value: string | string[]) => void = () => {};
  private onTouched: () => void = () => {};
  protected disabled = false;

  protected readonly filteredOptions = computed(() => {
    this.optionsVersion();
    const normalizedQuery = normalizeSearchText(this.query());
    if (!normalizedQuery) return this.options;
    return this.options.filter((option) => matchesSearchText(`${option.label} ${option.description ?? ''}`, normalizedQuery));
  });

  protected readonly selectedOptions = computed(() => {
    this.optionsVersion();
    this.valueVersion();
    const selectedValues = new Set(
      this.multiple ? this.currentValues() : (this.currentValue() ? [this.currentValue()] : []),
    );
    return this.options.filter((option) => selectedValues.has(option.value));
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ('options' in changes) {
      this.optionsVersion.update((version) => version + 1);
    }
  }

  protected hasSelection(): boolean {
    return this.multiple ? this.currentValues().length > 0 : this.currentValue() !== '';
  }

  protected displayLabel(): string {
    if (!this.hasSelection()) return this.placeholder;
    if (this.multiple) {
      const count = this.selectedOptions().length;
      if (count === 1) return '1 selected';
      return `${count} selected`;
    }
    return this.selectedOptions()[0]?.label ?? this.placeholder;
  }

  protected toggleOpen() {
    if (this.disabled) return;
    this.isOpen.update((open) => !open);
    if (!this.isOpen()) this.query.set('');
    this.onTouched();
  }

  protected selectOption(option: SearchableSelectOption) {
    if (this.multiple) {
      const values = new Set(this.currentValues());
      if (values.has(option.value)) {
        values.delete(option.value);
      } else {
        values.add(option.value);
      }
      this.internalValue = [...values];
      this.valueVersion.update((version) => version + 1);
      this.onChange(this.internalValue);
      return;
    }

    this.internalValue = option.value;
    this.valueVersion.update((version) => version + 1);
    this.onChange(this.internalValue);
    this.close();
  }

  protected selectEmpty() {
    this.internalValue = this.multiple ? [] : '';
    this.valueVersion.update((version) => version + 1);
    this.onChange(this.internalValue);
    this.close();
  }

  protected clearSelection(event: MouseEvent) {
    event.stopPropagation();
    this.selectEmpty();
  }

  protected isSelected(value: string): boolean {
    return this.multiple ? this.currentValues().includes(value) : this.currentValue() === value;
  }

  writeValue(value: string | string[] | null): void {
    if (this.multiple) {
      this.internalValue = Array.isArray(value) ? value : [];
      this.valueVersion.update((version) => version + 1);
      return;
    }
    this.internalValue = typeof value === 'string' ? value : '';
    this.valueVersion.update((version) => version + 1);
  }

  registerOnChange(fn: (value: string | string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }

  private close() {
    this.isOpen.set(false);
    this.query.set('');
  }

  private currentValue(): string {
    return typeof this.internalValue === 'string' ? this.internalValue : '';
  }

  private currentValues(): string[] {
    return Array.isArray(this.internalValue) ? this.internalValue : [];
  }
}
