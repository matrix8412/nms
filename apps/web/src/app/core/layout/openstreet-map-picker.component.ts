import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

type LeafletModule = typeof import('leaflet');
type LeafletMap = import('leaflet').Map;
type LeafletCircleMarker = import('leaflet').CircleMarker;
type LeafletImport = LeafletModule & { default?: LeafletModule };

@Component({
  selector: 'app-openstreet-map-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-picker">
      <div #mapHost class="map-canvas"></div>
      <div class="map-footer" *ngIf="latitude != null && longitude != null">
        <span class="coord-chip">Lat {{ latitude.toFixed(6) }}</span>
        <span class="coord-chip">Lng {{ longitude.toFixed(6) }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .map-picker {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .map-canvas {
        height: 320px;
        width: 100%;
        border: 1px solid #dbe4ee;
        border-radius: 10px;
        overflow: hidden;
        background: #e2e8f0;
      }
      .map-footer {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .coord-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 0.78rem;
        font-weight: 600;
      }
    `,
  ],
})
export class OpenstreetMapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Output() coordinatesChange = new EventEmitter<{ latitude: number; longitude: number }>();

  @ViewChild('mapHost', { static: true }) private readonly mapHost?: ElementRef<HTMLDivElement>;

  private leaflet: LeafletModule | null = null;
  private map: LeafletMap | null = null;
  private marker: LeafletCircleMarker | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  async ngAfterViewInit() {
    if (!this.mapHost) {
      return;
    }

    const leafletModule = await import('leaflet') as LeafletImport;
    this.leaflet = leafletModule.default ?? leafletModule;
    const L = this.leaflet;
    const initialLat = this.latitude ?? 48.1485965;
    const initialLng = this.longitude ?? 17.1077477;
    const initialZoom = this.latitude != null && this.longitude != null ? 15 : 7;

    this.map = L.map(this.mapHost.nativeElement, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.on('click', (event) => {
      const latitude = Number(event.latlng.lat.toFixed(6));
      const longitude = Number(event.latlng.lng.toFixed(6));
      this.setMarker(latitude, longitude, true);
    });

    this.setMarker(this.latitude, this.longitude, false);

    this.observeMapSize();
    this.invalidateMapSize();
    setTimeout(() => this.invalidateMapSize(), 350);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.map || !this.leaflet) {
      return;
    }

    if (changes['latitude'] || changes['longitude']) {
      this.setMarker(this.latitude, this.longitude, false);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.map?.remove();
    this.resizeObserver = null;
    this.intersectionObserver = null;
    this.map = null;
    this.marker = null;
  }

  private observeMapSize() {
    const host = this.mapHost?.nativeElement;
    if (!host) {
      return;
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.invalidateMapSize());
      this.resizeObserver.observe(host);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.invalidateMapSize();
        }
      });
      this.intersectionObserver.observe(host);
    }
  }

  private invalidateMapSize() {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.map?.invalidateSize());
      return;
    }

    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private setMarker(latitude: number | null, longitude: number | null, emit: boolean) {
    if (!this.map || !this.leaflet) {
      return;
    }

    if (latitude == null || longitude == null) {
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }
      return;
    }

    const coords: [number, number] = [latitude, longitude];
    if (!this.marker) {
      this.marker = this.leaflet.circleMarker(coords, {
        radius: 8,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.95,
        weight: 2,
      }).addTo(this.map);
    } else {
      this.marker.setLatLng(coords);
    }

    this.map.setView(coords, Math.max(this.map.getZoom(), 15));

    if (emit) {
      this.coordinatesChange.emit({ latitude, longitude });
    }
  }
}
