import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-report-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dashboard-widget" style="padding:12px;">
      <details>
        <summary style="cursor:pointer; font-weight:600;">Dashboard widget: Duration sum (last month)</summary>
        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
          <label style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" [(ngModel)]="widget.enabled" /> Enable widget
          </label>
          <label style="display:flex; gap:8px; align-items:center;">
            Plan ID:
            <input type="number" [(ngModel)]="widget.planId" min="1" style="width:120px;" />
          </label>
          <button class="btn btn-primary" (click)="saveWidget()">Save</button>
          <button class="btn btn-outline" (click)="removeWidget()">Remove</button>
        </div>
        <div *ngIf="widget.enabled && widget.planId" style="margin-top:12px;">
          <button class="btn" (click)="refreshWidget()">Refresh</button>
          <div *ngIf="loading">Loading...</div>
          <div *ngIf="error" style="color:crimson">{{ error }}</div>
          <div *ngIf="report" style="margin-top:8px; border:1px solid #ddd; padding:8px; border-radius:6px; background:#fff; max-width:420px;">
            <div><strong>Plan</strong>: {{ report.planId }}</div>
            <div><strong>Period</strong>: {{ report.periodStart }} → {{ report.periodEnd }}</div>
            <div><strong>Executions</strong>: {{ report.executionCount }}</div>
            <div><strong>Per-exec duration (mins)</strong>: {{ report.perExecutionDurationSum }}</div>
            <div><strong>Total duration (mins)</strong>: {{ report.totalDuration }}</div>
          </div>
        </div>
      </details>
    </section>
  `
})
export class ReportWidgetComponent implements OnInit {
  widget: { enabled: boolean; planId?: number } = { enabled: false };
  report: any = null;
  loading = false;
  error: string | null = null;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('dashboardWidget');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.widget.enabled = !!parsed.enabled;
        this.widget.planId = parsed.planId ?? undefined;
      }
    } catch (e) { }

    if (this.widget.enabled && this.widget.planId) {
      this.fetchReport(this.widget.planId!);
    }
  }

  saveWidget() {
    localStorage.setItem('dashboardWidget', JSON.stringify(this.widget));
    if (this.widget.enabled && this.widget.planId) this.fetchReport(this.widget.planId);
  }

  removeWidget() {
    localStorage.removeItem('dashboardWidget');
    this.widget = { enabled: false };
    this.report = null;
  }

  refreshWidget() {
    if (this.widget.planId) this.fetchReport(this.widget.planId);
  }

  private fetchReport(planId: number) {
    this.loading = true;
    this.error = null;
    this.report = null;
    this.reportService.getDurationSumLastMonth(planId).subscribe({
      next: (res) => { this.report = res; this.loading = false; },
      error: (err) => { this.error = (err?.message || 'Failed to load'); this.loading = false; }
    });
  }
}
