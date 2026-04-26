import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';

export type TimeSeriesChartPoint = {
  timestamp: string | Date;
  values: Record<string, number | null | undefined>;
};

export type TimeSeriesChartSeries = {
  key: string;
  label: string;
  color: string;
  axis?: 'left' | 'right';
  unit?: string;
  decimals?: number;
};

export type TimeSeriesChartRangeOption = {
  label: string;
  value: string;
  durationMs?: number;
};

type NormalizedPoint = {
  timestampMs: number;
  timestampLabel: string;
  values: Record<string, number | null>;
};

type LegendRow = {
  series: TimeSeriesChartSeries;
  min: number | null;
  max: number | null;
  avg: number | null;
};

const DEFAULT_RANGES: TimeSeriesChartRangeOption[] = [
  { label: '1H', value: '1h', durationMs: 60 * 60 * 1000 },
  { label: '6H', value: '6h', durationMs: 6 * 60 * 60 * 1000 },
  { label: '24H', value: '24h', durationMs: 24 * 60 * 60 * 1000 },
  { label: 'All', value: 'all' },
];

@Component({
  selector: 'app-time-series-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="chart-shell">
      <div class="chart-toolbar">
        <div class="chart-copy">
          <div class="chart-title" *ngIf="title()">{{ title() }}</div>
          <div class="chart-subtitle" *ngIf="subtitle()">{{ subtitle() }}</div>
        </div>

        <div class="range-selector" *ngIf="resolvedRanges().length > 0">
          <button
            *ngFor="let option of resolvedRanges()"
            type="button"
            class="range-button"
            [class.active]="activeRange() === option.value"
            (click)="activeRange.set(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="chart-empty" *ngIf="visiblePoints().length === 0">
        <span class="material-icons">show_chart</span>
        <p>{{ emptyText() }}</p>
      </div>

      <ng-container *ngIf="visiblePoints().length > 0">
        <div class="chart-frame" [class.with-right-axis]="hasRightAxis()">
          <div class="chart-axis chart-axis-left">
            <span *ngFor="let label of leftAxisLabels()">{{ label }}</span>
          </div>

          <svg viewBox="0 0 100 64" preserveAspectRatio="none" class="chart-surface" [attr.aria-label]="title() || 'Time series chart'">
            <line *ngFor="let y of gridLines" x1="0" [attr.y1]="y" x2="100" [attr.y2]="y" class="grid-line"></line>

            <polyline
              *ngFor="let item of series()"
              [attr.points]="seriesPolyline(item)"
              class="chart-line"
              [attr.stroke]="item.color"
            ></polyline>
          </svg>

          <div class="chart-axis chart-axis-right" *ngIf="hasRightAxis()">
            <span *ngFor="let label of rightAxisLabels()">{{ label }}</span>
          </div>
        </div>

        <div class="chart-footer">
          <span>{{ visibleRangeLabel() }}</span>
          <span>{{ visiblePoints().length }} point{{ visiblePoints().length === 1 ? '' : 's' }}</span>
        </div>

        <div class="chart-legend" *ngIf="legendRows().length > 0">
          <div class="legend-header legend-grid">
            <span>Series</span>
            <span>Min</span>
            <span>Max</span>
            <span>Avg</span>
          </div>

          <div class="legend-row legend-grid" *ngFor="let row of legendRows()">
            <span class="legend-series">
              <span class="legend-swatch" [style.background]="row.series.color"></span>
              {{ row.series.label }}
            </span>
            <span>{{ formatValue(row.min, row.series) }}</span>
            <span>{{ formatValue(row.max, row.series) }}</span>
            <span>{{ formatValue(row.avg, row.series) }}</span>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .chart-shell {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 18px 20px 16px;
        border-bottom: 1px solid #e2e8f0;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 247, 251, 0.96) 100%),
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.05) 0, rgba(148, 163, 184, 0.05) 1px, transparent 1px, transparent 24px);
      }
      .chart-toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .chart-copy {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .chart-title {
        font-size: 0.94rem;
        font-weight: 800;
        color: #0f172a;
      }
      .chart-subtitle {
        font-size: 0.79rem;
        color: #64748b;
      }
      .range-selector {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px;
        border: 1px solid #d7dee8;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
      }
      .range-button {
        border: none;
        border-radius: 999px;
        background: transparent;
        color: #64748b;
        padding: 6px 10px;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        cursor: pointer;
        font-family: inherit;
      }
      .range-button.active {
        background: #0f172a;
        color: #fff;
      }
      .chart-frame {
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr);
        gap: 12px;
        align-items: stretch;
      }
      .chart-frame.with-right-axis {
        grid-template-columns: 48px minmax(0, 1fr) 48px;
      }
      .chart-axis {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 4px 0;
        color: #64748b;
        font-size: 0.73rem;
        font-weight: 700;
      }
      .chart-axis-right {
        text-align: right;
      }
      .chart-surface {
        width: 100%;
        height: 170px;
        border-radius: 12px;
        border: 1px solid #d6deea;
        background:
          linear-gradient(180deg, rgba(250, 251, 252, 0.98) 0%, rgba(238, 242, 247, 0.98) 100%),
          linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
        overflow: hidden;
      }
      .grid-line {
        stroke: rgba(100, 116, 139, 0.28);
        stroke-width: 0.6;
        stroke-dasharray: 1.6 2.4;
      }
      .chart-line {
        fill: none;
          stroke-width: 2px;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
      }
      .chart-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        color: #64748b;
        font-size: 0.77rem;
      }
      .chart-legend {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-top: 6px;
        border-top: 1px solid #e2e8f0;
      }
      .legend-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 0.8fr));
        gap: 10px;
        align-items: center;
      }
      .legend-header {
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .legend-row {
        color: #0f172a;
        font-size: 0.79rem;
        font-family: 'JetBrains Mono', monospace;
      }
      .legend-series {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
        font-weight: 700;
      }
      .legend-swatch {
        width: 20px;
        height: 3px;
        border-radius: 999px;
        flex: 0 0 auto;
      }
      .chart-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 28px;
        color: #94a3b8;
      }
      .chart-empty .material-icons {
        font-size: 28px;
      }
      .chart-empty p {
        margin: 0;
        font-size: 0.88rem;
      }
      @media (max-width: 720px) {
        .chart-frame,
        .chart-frame.with-right-axis {
          grid-template-columns: 40px minmax(0, 1fr) 40px;
          gap: 8px;
        }
        .legend-grid {
          grid-template-columns: minmax(0, 1.2fr) repeat(3, minmax(0, 0.8fr));
          gap: 8px;
        }
      }
    `,
  ],
})
export class TimeSeriesChartComponent {
  readonly title = input('');
  readonly subtitle = input('');
  readonly points = input<TimeSeriesChartPoint[]>([]);
  readonly series = input<TimeSeriesChartSeries[]>([]);
  readonly ranges = input<TimeSeriesChartRangeOption[]>(DEFAULT_RANGES);
  readonly emptyText = input('No chart data available.');

  protected readonly activeRange = signal('24h');
  protected readonly gridLines = ['8', '24', '40', '56'];

  protected readonly resolvedRanges = computed(() => {
    const custom = this.ranges();
    return custom.length > 0 ? custom : DEFAULT_RANGES;
  });

  protected readonly normalizedPoints = computed<NormalizedPoint[]>(() => {
    return this.points()
      .map((point) => {
        const date = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp);
        const timestampMs = date.getTime();
        if (!Number.isFinite(timestampMs)) {
          return null;
        }

        const values = Object.fromEntries(
          Object.entries(point.values).map(([key, value]) => [key, value == null ? null : Number(value)]),
        ) as Record<string, number | null>;

        return {
          timestampMs,
          timestampLabel: date.toISOString(),
          values,
        } satisfies NormalizedPoint;
      })
      .filter((point): point is NormalizedPoint => point !== null)
      .sort((left, right) => left.timestampMs - right.timestampMs);
  });

  protected readonly visiblePoints = computed(() => {
    const points = this.normalizedPoints();
    if (points.length === 0) {
      return [] as NormalizedPoint[];
    }

    const selected = this.resolvedRanges().find((option) => option.value === this.activeRange());
    if (!selected?.durationMs) {
      return points;
    }

    const latestTimestamp = points[points.length - 1]?.timestampMs ?? 0;
    const cutoff = latestTimestamp - selected.durationMs;
    const filtered = points.filter((point) => point.timestampMs >= cutoff);
    return filtered.length > 0 ? filtered : points.slice(-1);
  });

  protected readonly hasRightAxis = computed(() => this.series().some((item) => item.axis === 'right'));

  protected readonly leftAxisLabels = computed(() => this.buildAxisLabels('left'));
  protected readonly rightAxisLabels = computed(() => this.buildAxisLabels('right'));

  protected readonly legendRows = computed<LegendRow[]>(() => {
    const points = this.visiblePoints();
    return this.series().map((item) => {
      const values = points
        .map((point) => point.values[item.key])
        .filter((value): value is number => value !== null && Number.isFinite(value));

      if (values.length === 0) {
        return {
          series: item,
          min: null,
          max: null,
          avg: null,
        };
      }

      return {
        series: item,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, value) => sum + value, 0) / values.length,
      };
    });
  });

  protected readonly visibleRangeLabel = computed(() => {
    const points = this.visiblePoints();
    if (points.length === 0) {
      return '';
    }

    const start = points[0]?.timestampLabel;
    const end = points[points.length - 1]?.timestampLabel;
    if (!start || !end) {
      return '';
    }

    return `${this.formatTimestamp(start)} - ${this.formatTimestamp(end)}`;
  });

  constructor() {
    effect(
      () => {
        const options = this.resolvedRanges();
        const selected = this.activeRange();
        if (options.some((option) => option.value === selected)) {
          return;
        }

        const fallback = options.find((option) => option.value === '24h')?.value ?? options[0]?.value ?? 'all';
        this.activeRange.set(fallback);
      },
      { allowSignalWrites: true },
    );
  }

  protected seriesPolyline(item: TimeSeriesChartSeries) {
    const points = this.visiblePoints();
    if (points.length === 0) {
      return '';
    }

    const axisMax = this.resolveAxisMax(item.axis ?? 'left');
    return points
      .map((point, index) => {
        const value = point.values[item.key];
        if (value == null) {
          return null;
        }

        return `${this.resolveX(index, points.length)},${this.resolveY(value, axisMax)}`;
      })
      .filter((point): point is string => point !== null)
      .join(' ');
  }

  protected formatValue(value: number | null, item: TimeSeriesChartSeries) {
    if (value === null) {
      return '—';
    }

    const digits = item.decimals ?? (Math.abs(value) >= 100 ? 0 : 1);
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
    return item.unit ? `${formatted} ${item.unit}` : formatted;
  }

  private buildAxisLabels(axis: 'left' | 'right') {
    if (axis === 'right' && !this.hasRightAxis()) {
      return [] as string[];
    }

    const axisSeries = this.series().filter((item) => (item.axis ?? 'left') === axis);
    if (axisSeries.length === 0) {
      return ['0', '0', '0'];
    }

    const scaleMax = this.resolveAxisMax(axis);
    const unit = axisSeries[0]?.unit;
    return [scaleMax, scaleMax / 2, 0].map((value) => this.formatAxisLabel(value, unit));
  }

  private resolveAxisMax(axis: 'left' | 'right') {
    const axisKeys = this.series()
      .filter((item) => (item.axis ?? 'left') === axis)
      .map((item) => item.key);

    const maximum = this.visiblePoints().reduce((highest, point) => {
      const pointMaximum = axisKeys.reduce((seriesHighest, key) => {
        const value = point.values[key];
        return value != null ? Math.max(seriesHighest, value) : seriesHighest;
      }, 0);
      return Math.max(highest, pointMaximum);
    }, 0);

    return this.niceScaleMaximum(maximum);
  }

  private resolveX(index: number, total: number) {
    if (total <= 1) {
      return '50.00';
    }

    return (4 + (index / (total - 1)) * 92).toFixed(2);
  }

  private resolveY(value: number, maxValue: number) {
    const chartTop = 8;
    const chartBottom = 56;
    const ratio = maxValue > 0 ? Math.min(Math.max(value / maxValue, 0), 1) : 0;
    return (chartBottom - ratio * (chartBottom - chartTop)).toFixed(2);
  }

  private niceScaleMaximum(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      return 1;
    }

    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    if (normalized <= 1) {
      return magnitude;
    }
    if (normalized <= 2) {
      return 2 * magnitude;
    }
    if (normalized <= 5) {
      return 5 * magnitude;
    }
    return 10 * magnitude;
  }

  private formatAxisLabel(value: number, unit?: string) {
    const digits = value >= 10 ? 0 : 1;
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  private formatTimestamp(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}