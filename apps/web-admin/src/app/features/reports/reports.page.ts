import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import * as XLSX from 'xlsx';
import {
  AbsencesReportResponse,
  DailyReportResponse,
  ExportReportResponse,
  LateReportResponse,
  MonthlyReportResponse,
  ReportAttendanceRow,
  ReportEmployee,
  ReportsApiService,
} from './reports-api.service';

type ReportType = 'daily' | 'monthly' | 'late' | 'absences';

interface RecentReport {
  id: string;
  title: string;
  meta: string;
  filename: string;
  content: string;
}

interface PreviewState {
  title: string;
  meta: string;
  columns: string[];
  rows: Array<Record<string, string>>;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isLoadingPreview = signal(false);
  readonly isExporting = signal(false);
  readonly isLoadingEmployees = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly employees = signal<ReportEmployee[]>([]);
  readonly recentReports = signal<RecentReport[]>([]);

  readonly preview = signal<PreviewState | null>(null);

  readonly fromDate = signal(this.getCurrentMonthStart());
  readonly toDate = signal(this.getCurrentMonthEnd());
  readonly reportType = signal<ReportType>('daily');
  readonly selectedEmployeeId = signal('ALL');

  readonly canUseEmployeeFilter = computed(() => this.reportType() === 'daily');

  constructor() {
    this.loadEmployees();
  }

  previewReport(): void {
    if (!this.validateDateRange()) return;

    this.isLoadingPreview.set(true);
    this.errorMessage.set(null);

    const type = this.reportType();

    let request$!: Observable<
      DailyReportResponse | MonthlyReportResponse | LateReportResponse | AbsencesReportResponse
    >;

    if (type === 'daily') {
      request$ = this.reportsApi.getDailyReport({
        date: this.fromDate(),
        employeeId:
          this.selectedEmployeeId() === 'ALL' ? undefined : this.selectedEmployeeId(),
      });
    } else if (type === 'monthly') {
      request$ = this.reportsApi.getMonthlyReport(this.extractYearMonth(this.fromDate()));
    } else if (type === 'late') {
      request$ = this.reportsApi.getLateReport({
        from: this.fromDate(),
        to: this.toDate(),
      });
    } else {
      request$ = this.reportsApi.getAbsencesReport({
        from: this.fromDate(),
        to: this.toDate(),
      });
    }

    request$
      .pipe(finalize(() => this.isLoadingPreview.set(false)))
      .subscribe({
        next: (response) => {
          this.preview.set(this.buildPreviewState(type, response));
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
          this.preview.set(null);
        },
      });
  }

  exportCsv(): void {
    this.exportReportFile('csv');
  }

  exportExcelCompatible(): void {
    this.exportReportFile('excel');
  }

  generateReport(): void {
    this.exportReportFile('csv');
  }

  downloadRecent(report: RecentReport): void {
    this.downloadFile(report.content, report.filename);
  }

  private exportReportFile(mode: 'csv' | 'excel'): void {
    if (!this.validateDateRange()) return;
    if (this.isExporting()) return;

    this.isExporting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const exportParams = this.buildExportParams();

    this.reportsApi
      .exportReport(exportParams)
      .pipe(finalize(() => this.isExporting.set(false)))
      .subscribe({
        next: (response) => {
          if (mode === 'excel') {
            const xlsxFilename = response.filename.replace(/\.csv$/i, '.xlsx');
            this.downloadExcel(response.content, xlsxFilename);
            this.successMessage.set('Reporte exportado como Excel correctamente.');
          } else {
            this.downloadFile(response.content, response.filename);
            this.successMessage.set('Reporte exportado correctamente.');
          }
          this.pushRecentReport(response);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  private buildExportParams(): {
    type: ReportType;
    date?: string;
    from?: string;
    to?: string;
    year?: number;
    month?: number;
    employeeId?: string;
  } {
    const type = this.reportType();

    if (type === 'daily') {
      return {
        type,
        date: this.fromDate(),
        employeeId:
          this.selectedEmployeeId() === 'ALL' ? undefined : this.selectedEmployeeId(),
      };
    }

    if (type === 'monthly') {
      const { year, month } = this.extractYearMonth(this.fromDate());
      return { type, year, month };
    }

    return {
      type,
      from: this.fromDate(),
      to: this.toDate(),
    };
  }

  private pushRecentReport(response: ExportReportResponse): void {
    const now = new Date();
    const title = this.buildRecentTitle(response.type);
    const meta = `Generado ${now.toLocaleDateString('es-PE')} · ${response.type}`;

    const item: RecentReport = {
      id: `${response.type}-${now.getTime()}`,
      title,
      meta,
      filename: response.filename,
      content: response.content,
    };

    this.recentReports.update((current) => [item, ...current].slice(0, 10));
  }

  private buildRecentTitle(type: string): string {
    if (type === 'daily') return 'Asistencia general';
    if (type === 'monthly') return 'Reporte mensual';
    if (type === 'late') return 'Tardanzas';
    if (type === 'absences') return 'Ausencias';
    return 'Reporte';
  }

  private buildPreviewState(
    type: ReportType,
    response:
      | DailyReportResponse
      | MonthlyReportResponse
      | LateReportResponse
      | AbsencesReportResponse,
  ): PreviewState {
    if (type === 'monthly') {
      const monthly = response as MonthlyReportResponse;
      const rows = monthly.rows.map((row) => ({
        Empleado: row.employeeName,
        Área: row.areaName,
        Presentes: String(row.present),
        Tardanzas: String(row.late),
        Incompletas: String(row.incomplete),
        Ausencias: String(row.absent),
      }));

      return {
        title: `Vista previa — Mensual ${monthly.month}/${monthly.year}`,
        meta: `${monthly.totalEmployees} empleados resumidos`,
        columns: Object.keys(rows[0] ?? { Empleado: '' }),
        rows,
      };
    }

    const generic = response as DailyReportResponse | LateReportResponse | AbsencesReportResponse;
    const rows = generic.rows.map((row) => this.mapAttendanceRowToPreview(row));

    return {
      title: `Vista previa — ${this.buildRecentTitle(type)}`,
      meta: `${generic.total} registros encontrados`,
      columns: Object.keys(rows[0] ?? { Empleado: '' }),
      rows,
    };
  }

  private mapAttendanceRowToPreview(row: ReportAttendanceRow): Record<string, string> {
    return {
      Empleado: `${row.employee.first_name} ${row.employee.last_name}`,
      Código: row.employee.code,
      Fecha: this.formatDate(row.attendance_date),
      Entrada: row.check_in_at ? this.formatTime(row.check_in_at) : '—',
      Salida: row.check_out_at ? this.formatTime(row.check_out_at) : '—',
      Estado: row.status,
      'Late min': String(row.late_minutes),
      Origen: row.source ?? '—',
    };
  }

  private loadEmployees(): void {
    this.isLoadingEmployees.set(true);

    this.reportsApi
      .getEmployees()
      .pipe(finalize(() => this.isLoadingEmployees.set(false)))
      .subscribe({
        next: (rows) => this.employees.set(rows),
        error: () => {
          this.employees.set([]);
        },
      });
  }

  private validateDateRange(): boolean {
    const from = this.fromDate();
    const to = this.toDate();
    const type = this.reportType();

    if (!from) {
      this.errorMessage.set('Debes seleccionar una fecha de inicio.');
      return false;
    }

    if (type !== 'daily' && !to) {
      this.errorMessage.set('Debes seleccionar una fecha de fin.');
      return false;
    }

    if (type !== 'daily' && from > to) {
      this.errorMessage.set('La fecha de inicio no puede ser mayor a la fecha fin.');
      return false;
    }

    this.errorMessage.set(null);
    return true;
  }

  private extractYearMonth(dateIso: string): { year: number; month: number } {
    const [yearRaw, monthRaw] = dateIso.split('-').map(Number);
    return {
      year: yearRaw,
      month: monthRaw,
    };
  }

  private formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatTime(value: string): string {
    const date = new Date(value);
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  private getCurrentMonthStart(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private getCurrentMonthEnd(): string {
    const date = new Date();
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(
      end.getDate(),
    ).padStart(2, '0')}`;
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error.error?.message;
    if (Array.isArray(backendMessage) && backendMessage.length > 0) {
      return backendMessage.join(' · ');
    }
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    return 'No se pudo completar la operación de reportes.';
  }

  private downloadFile(content: string, filename: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private downloadExcel(csvContent: string, filename: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const workbook = XLSX.read(csvContent, { type: 'string' });
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
