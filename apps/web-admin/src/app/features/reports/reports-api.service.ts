import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface ReportEmployee {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  area_name?: string | null;
  status: string;
}

export interface ReportAttendanceRow {
  id: string;
  attendance_date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status: string;
  late_minutes: number;
  source?: string | null;
  employee: ReportEmployee;
}

export interface DailyReportResponse {
  total: number;
  rows: ReportAttendanceRow[];
}

export interface LateReportResponse {
  total: number;
  rows: ReportAttendanceRow[];
}

export interface AbsencesReportResponse {
  total: number;
  rows: ReportAttendanceRow[];
}

export interface MonthlyReportRow {
  employeeId: string;
  employeeName: string;
  areaName: string;
  present: number;
  late: number;
  incomplete: number;
  absent: number;
}

export interface MonthlyReportResponse {
  year: number;
  month: number;
  totalEmployees: number;
  rows: MonthlyReportRow[];
}

export interface ExportReportResponse {
  type: string;
  format: string;
  filename: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = 'http://localhost:3000';

  private authHeaders(): HttpHeaders {
    const token = this.authSession.getAccessToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getEmployees(): Observable<ReportEmployee[]> {
    return this.http.get<ReportEmployee[]>(`${this.baseUrl}/employees`, {
      headers: this.authHeaders(),
    });
  }

  getDailyReport(params: {
    date: string;
    employeeId?: string;
  }): Observable<DailyReportResponse> {
    let query = new HttpParams().set('date', params.date);
    if (params.employeeId) query = query.set('employeeId', params.employeeId);
    return this.http.get<DailyReportResponse>(`${this.baseUrl}/reports/daily`, {
      headers: this.authHeaders(),
      params: query,
    });
  }

  getMonthlyReport(params: {
    year: number;
    month: number;
  }): Observable<MonthlyReportResponse> {
    const query = new HttpParams()
      .set('year', String(params.year))
      .set('month', String(params.month));
    return this.http.get<MonthlyReportResponse>(`${this.baseUrl}/reports/monthly`, {
      headers: this.authHeaders(),
      params: query,
    });
  }

  getLateReport(params: {
    from: string;
    to: string;
  }): Observable<LateReportResponse> {
    const query = new HttpParams().set('from', params.from).set('to', params.to);
    return this.http.get<LateReportResponse>(`${this.baseUrl}/reports/late`, {
      headers: this.authHeaders(),
      params: query,
    });
  }

  getAbsencesReport(params: {
    from: string;
    to: string;
  }): Observable<AbsencesReportResponse> {
    const query = new HttpParams().set('from', params.from).set('to', params.to);
    return this.http.get<AbsencesReportResponse>(`${this.baseUrl}/reports/absences`, {
      headers: this.authHeaders(),
      params: query,
    });
  }

  exportReport(params: {
    type: 'daily' | 'monthly' | 'late' | 'absences';
    date?: string;
    from?: string;
    to?: string;
    year?: number;
    month?: number;
    employeeId?: string;
  }): Observable<ExportReportResponse> {
    let query = new HttpParams().set('type', params.type);

    if (params.date) query = query.set('date', params.date);
    if (params.from) query = query.set('from', params.from);
    if (params.to) query = query.set('to', params.to);
    if (params.year !== undefined) query = query.set('year', String(params.year));
    if (params.month !== undefined) query = query.set('month', String(params.month));
    if (params.employeeId) query = query.set('employeeId', params.employeeId);

    return this.http.get<ExportReportResponse>(`${this.baseUrl}/reports/export`, {
      headers: this.authHeaders(),
      params: query,
    });
  }
}
