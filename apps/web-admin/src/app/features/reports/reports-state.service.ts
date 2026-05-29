import { Injectable, signal } from '@angular/core';

export interface RecentReportItem {
  id: string;
  title: string;
  meta: string;
  filename: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsStateService {
  readonly recentReports = signal<RecentReportItem[]>([]);

  push(item: RecentReportItem): void {
    this.recentReports.update((current) => [item, ...current].slice(0, 10));
  }
}
