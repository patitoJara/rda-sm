import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { SessionService } from '../../core/services/session.service';
import { TimeService } from '../../core/services/time.service';
import { TokenService } from '../../services/token.service';
import { uiLabRoleGuard } from './ui-lab-role.guard';

describe('UI Lab access using existing session and active role', () => {
  let token: jasmine.SpyObj<TokenService>;
  let router: jasmine.SpyObj<Router>;
  let session: jasmine.SpyObj<SessionService>;
  const route = { data: { roles: ['ADMIN'], hidden: true } } as unknown as ActivatedRouteSnapshot;
  const state = { url: '/ui-lab' } as RouterStateSnapshot;

  beforeEach(() => {
    token = jasmine.createSpyObj('TokenService', ['getActiveRole', 'getUserRoles', 'getAccessToken', 'getTokenExpiration']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    session = jasmine.createSpyObj('SessionService', ['invalidateSession']);
    token.getUserRoles.and.returnValue(['ADMIN', 'SUPERVISOR']);
    token.getActiveRole.and.returnValue('ADMIN');
    TestBed.configureTestingModule({ providers: [
      { provide: TokenService, useValue: token },
      { provide: Router, useValue: router },
      { provide: SessionService, useValue: session },
      { provide: TimeService, useValue: { loadServerTime: () => Promise.resolve(true), nowMs: () => 1000 } },
    ] });
  });

  it('allows active ADMIN with a valid session', async () => {
    token.getAccessToken.and.returnValue('test-token');
    token.getTokenExpiration.and.returnValue(2000);
    expect(await TestBed.runInInjectionContext(() => authGuard(route, state))).toBeTrue();
    expect(TestBed.runInInjectionContext(() => uiLabRoleGuard(route, state))).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  for (const role of ['SUPERVISOR', 'ADMINISTRATIVO', 'OPERADOR', 'PROFESIONAL', '', 'UNKNOWN']) {
    it(`denies active role ${role || '(none)'} even if ADMIN is among assigned roles`, () => {
      token.getActiveRole.and.returnValue(role);
      expect(TestBed.runInInjectionContext(() => uiLabRoleGuard(route, state))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
    });
  }

  for (const url of ['/ui-lab?returnUrl=/about', '/ui-lab#/about']) {
    it(`does not inherit the public about exception through ${url}`, () => {
      token.getActiveRole.and.returnValue('SUPERVISOR');
      expect(TestBed.runInInjectionContext(() => uiLabRoleGuard(route, { url } as RouterStateSnapshot))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
    });
  }

  it('rejects a missing token even with ADMIN selected', async () => {
    token.getAccessToken.and.returnValue(null);
    expect(await TestBed.runInInjectionContext(() => authGuard(route, state))).toBeFalse();
    expect(session.invalidateSession).toHaveBeenCalledWith('/ui-lab');
  });

  it('rejects an expired authenticated session', async () => {
    token.getAccessToken.and.returnValue('test-token');
    token.getTokenExpiration.and.returnValue(500);
    expect(await TestBed.runInInjectionContext(() => authGuard(route, state))).toBeFalse();
    expect(session.invalidateSession).toHaveBeenCalledWith('/ui-lab');
  });
});
