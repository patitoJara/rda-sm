import { CanActivateFn } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

/** Reuse active-role authorization without the legacy /about URL exception. */
export const uiLabRoleGuard: CanActivateFn = (route, state) =>
  roleGuard(route, { ...state, root: state.root, url: '/ui-lab' });
