import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private token: string | null = null;

  setToken(token: string | null | undefined): void {
    if (token) {
      this.token = token;
    }
  }

  getTokenSync(): string | null {
    if (this.token) return this.token;
    return this.readCookie('nms_csrf') ?? this.readCookie('nms_csrf_anon');
  }

  async ensureToken(): Promise<string> {
    const existing = this.getTokenSync();
    if (existing) return existing;
    const token = await firstValueFrom(
      this.http.get<{ csrfToken: string }>('/api/auth/csrf', { withCredentials: true }).pipe(
        map((response) => response.csrfToken),
      ),
    );
    this.token = token;
    return token;
  }

  private readCookie(name: string): string | null {
    const chunk = document.cookie
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`));
    return chunk ? decodeURIComponent(chunk.split('=').slice(1).join('=')) : null;
  }
}
