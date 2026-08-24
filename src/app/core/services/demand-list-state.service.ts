import { Injectable } from '@angular/core';

export type DemandListMode = 'active' | 'closed';

export interface DemandListState {
  mode: DemandListMode;
  pageIndex: number;
  pageSize: number;
  programId: number | null;
  resultCode: string;
  search: string;
  sort: string | null;
}

@Injectable({ providedIn: 'root' })
export class DemandListStateService {
  private readonly key = 'demand_list_state';

  save(state: DemandListState): void {
    sessionStorage.setItem(
      this.key,
      JSON.stringify(state),
    );
  }

  load(): DemandListState | null {
    const raw = sessionStorage.getItem(this.key);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<DemandListState>;

      const mode: DemandListMode =
        parsed.mode === 'closed'
          ? 'closed'
          : 'active';

      const pageIndex = Math.max(
        0,
        Number(parsed.pageIndex ?? 0),
      );

      const pageSizeCandidate = Number(parsed.pageSize ?? 20);
      const pageSize = [20, 50, 100].includes(pageSizeCandidate)
        ? pageSizeCandidate
        : 20;

      const programIdValue = Number(parsed.programId);
      const programId =
        parsed.programId !== null &&
        parsed.programId !== undefined &&
        Number.isFinite(programIdValue) &&
        programIdValue > 0
          ? programIdValue
          : null;
      const resultCode = String(
        parsed.resultCode ?? '',
      ).trim();

      const search = String(
        parsed.search ?? '',
      ).trim();
      const sort = parsed.sort
        ? String(parsed.sort)
        : null;

      return {
        mode,
        pageIndex,
        pageSize,
        programId,
        resultCode,
        search,
        sort,
      };
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    sessionStorage.removeItem(this.key);
  }
}