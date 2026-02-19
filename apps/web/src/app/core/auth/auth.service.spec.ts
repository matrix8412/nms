import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('bootstraps authenticated session', (done) => {
    service.bootstrapSession().subscribe((user) => {
      expect(user?.email).toBe('user@kinet.sk');
      done();
    });

    const req = httpMock.expectOne('/api/auth/me');
    expect(req.request.method).toBe('GET');
    req.flush({
      authenticated: true,
      csrfToken: 'csrf-token',
      user: {
        id: 'u1',
        email: 'user@kinet.sk',
        role: 'USER',
        emailVerifiedAt: '2026-01-01T10:00:00.000Z',
        groups: [],
      },
    });
  });
});
