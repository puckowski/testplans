import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TestPlan, TestCase } from '../../models/test-plan.model';
import { TestPlanExecution } from '../../models/test-plan-execution.model';
import { TestPlanService } from '../../services/test-plan.service';
import { tagToColor, contrastingForeground } from '../../utils/color.util';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-test-plan-with-cases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [
    `
    dialog::backdrop {
      background: rgba(0,0,0,0.45);
    }

    dialog {
      border: none;
      border-radius: 8px;
      padding: 16px;
      width: min(720px, 92vw);
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      background: #fff;
      font-family: inherit;
    }

    /* center when open (for browsers that don't position modal dialogs)
       the dialog element will be positioned fixed and centered */
    dialog[open] {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
    }

    dialog form label { display:block; margin-bottom:6px; font-weight:600; }
    dialog textarea { font-family: inherit; font-size:14px; padding:8px; border:1px solid #ccc; border-radius:4px; }
    dialog button { min-width: 64px; }
    `
  ],
  template: `
    @if (testPlan) {
      <div class="container">
        <div class="header">
          <div class="header-left">
            <button class="btn btn-outline" (click)="goBack()">
              ← Back
            </button>
            <h1>{{ testPlan.name }}</h1>
          </div>
          <div class="header-right">
            <button class="btn btn-outline" (click)="editTestPlan()">
              Edit Plan
            </button>
          </div>
        </div>
        @if (testPlan) {
          <div class="plan-info">
            <div class="info-card">
              <h3>Plan Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <label>Status</label>
                  <span class="status-badge" [class]="'status-' + testPlan.status.toLowerCase()">
                    {{ testPlan.status }}
                  </span>
                </div>
                <div class="info-item">
                  <label>Description</label>
                  <p>{{ testPlan.description || 'No description provided' }}</p>
                </div>
              </div>
              <div class="info-item">
                <label>Tags</label>
                <div class="single-column">
                  @for (tag of testPlan.tagList; track tag) {
                    <div>
                      <span class="tag-badge"
                        [style.backgroundColor]="tagToColor(tag.tag)"
                        [style.color]="contrastingForeground(tag.tag)">
                        {{ tag.tag }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }
        <div class="test-cases-section">
          <div class="section-header">
            <h2>Test Cases ({{ testPlan.testCases?.length || 0 }})</h2>
            <button class="btn btn-primary" (click)="createTestCase()">
              <i class="icon">+</i> Add Test Case
            </button>
          </div>
          <div class="executions-section" *ngIf="executions">
            <div class="section-header">
              <h2>Executions ({{ executions.length }})</h2>
              <button class="btn btn-primary" (click)="startExecution()">
                <i class="icon">▶</i> Start Execution
              </button>
            </div>

            <div class="executions-list" *ngIf="executions.length > 0">
              <div class="execution-card" *ngFor="let ex of executions">
                <div class="execution-row">
                  <div>
                    <strong>#{{ ex.id }}</strong>
                    <span>{{ ex.status }}</span>
                  </div>
                  <div>
                    <small>Started: {{ ex.startedAt | date:'short' }}</small>
                    <small *ngIf="ex.finishedAt">Finished: {{ ex.finishedAt | date:'short' }}</small>
                  </div>
                    <div class="execution-actions">
                    <button *ngIf="!ex.finishedAt" class="btn btn-sm" (click)="finishExecution(ex)">Mark Done</button>
                    <button class="btn btn-sm btn-outline" (click)="editExecution(ex)">Edit</button>
                    <button class="btn btn-sm btn-danger" (click)="deleteExecution(ex.id!)">Delete</button>
                  </div>
                </div>
                <div class="execution-notes">{{ ex.resultNotes }}</div>
              </div>
            </div>
          </div>

          <!-- Execution notes / create dialog -->
          <dialog #execDialog>
            <form method="dialog" (submit)="submitExecutionDialog()">
              <h3>{{ editingExecution?.id ? 'Edit Execution' : 'Start Execution' }}</h3>
              <div>
                <label for="notes">Comments</label>
                <textarea id="notes" name="notes" rows="6" style="width:100%" [(ngModel)]="dialogNotes"></textarea>
              </div>
              <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
                <button type="button" class="btn btn-outline" (click)="closeExecutionDialog()">Cancel</button>
                <button type="submit" class="btn btn-primary">Submit</button>
              </div>
            </form>
          </dialog>

          <!-- Delete confirmation dialog -->
          <dialog #confirmDialog>
            <p>Are you sure you want to delete this execution?</p>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
              <button type="button" class="btn btn-outline" (click)="cancelDelete()">No</button>
              <button type="button" class="btn btn-danger" (click)="confirmDelete()">Yes</button>
            </div>
          </dialog>
          @if (testPlan.testCases && testPlan.testCases!.length > 0) {
            <div class="test-cases-grid">
              @for (testCase of testPlan.testCases; track testCase) {
                <div class="test-case-card" [class.collapsed]="isCollapsed(testCase.id!)">
                  <div class="test-case-header">
                    <div class="header-left">
                      <input
                        type="checkbox"
                        [checked]="isCollapsed(testCase.id!)"
                        (change)="toggleCollapse(testCase.id!)"
                        title="Collapse/Expand"
                        />
                        <h4>{{ testCase.name }}</h4>
                      </div>
                      <div class="test-case-meta">
                        <span class="priority-badge" [class]="'priority-' + testCase.priority.toLowerCase()">
                          {{ testCase.priority }}
                        </span>
                        <span class="status-badge" [class]="'status-' + testCase.status.toLowerCase()">
                          {{ testCase.status }}
                        </span>
                      </div>
                    </div>
                    @if (!isCollapsed(testCase.id!)) {
                      <div class="test-case-body">
                        <p><strong>Description:</strong> {{ testCase.description }}</p>
                        <p><strong>Steps:</strong> {{ testCase.steps }}</p>
                        <p><strong>Expected Result:</strong> {{ testCase.expectedResult }}</p>
                        <p><strong>Test Plan ID:</strong> {{ testCase.testPlanId ?? '—' }}</p>
                        <p><strong>Created:</strong> {{ testCase.createdDate | date: 'short' }}</p>
                        <p><strong>Updated:</strong> {{ testCase.updatedDate | date: 'short' }}</p>
                        <div class="test-case-actions">
                          <button class="btn btn-sm btn-outline" (click)="editTestCase(testCase.id!)">
                            Edit
                          </button>
                          <button class="btn btn-sm btn-danger" (click)="deleteTestCase(testCase.id!)">
                            Delete
                          </button>
                        </div>
                      </div>
                    }
                    @if (isCollapsed(testCase.id!)) {
                      <div class="test-case-body">
                        Reviewed
                      </div>
                    }
                  </div>
                }
              </div>
            }
            @if (!testPlan.testCases || testPlan.testCases!.length === 0) {
              <div class="empty-state">
                <div class="empty-icon">🧪</div>
                <h3>No Test Cases Yet</h3>
                <p>Add test cases to start testing this plan</p>
                <button class="btn btn-primary" (click)="createTestCase()">
                  Add Test Case
                </button>
              </div>
            }
          </div>
        </div>
      }
    `
})
export class TestPlanWithCasesComponent implements OnInit {
  testPlan?: TestPlan;
  testPlanId!: number;
  previousQueryParams: any = {};
  collapsedMap = new Map<number, boolean>();
  executions: TestPlanExecution[] = [];
  @ViewChild('execDialog') execDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('confirmDialog') confirmDialog!: ElementRef<HTMLDialogElement>;
  editingExecution?: TestPlanExecution;
  dialogNotes: string = '';
  deleteTargetId?: number;

  constructor(
    private testPlanService: TestPlanService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.testPlanId = Number(this.route.snapshot.paramMap.get('id'));
    this.previousQueryParams = { ...this.route.snapshot.queryParams };
    this.loadTestPlanWithCases();
    this.loadExecutions();
  }

  loadExecutions() {
    this.testPlanService.getExecutions(this.testPlanId).subscribe({
      next: (list) => this.executions = list,
      error: (err) => console.error('Error loading executions:', err)
    });
  }

  startExecution() {
    // open dialog to enter initial comments and start execution
    this.openExecutionDialog();
  }

  openExecutionDialog(ex?: TestPlanExecution) {
    this.editingExecution = ex ? { ...ex } : undefined;
    this.dialogNotes = ex?.resultNotes || '';
    // show dialog
    try {
      this.execDialog.nativeElement.showModal();
    } catch (e) {
      // fallback for browsers that don't support dialog
      alert('Dialog not supported');
    }
  }

  closeExecutionDialog() {
    try {
      this.execDialog.nativeElement.close();
    } catch (e) { }
  }

  submitExecutionDialog() {
    const normalizeToIso = (v: any): string | undefined => {
      if (v == null) return undefined;
      // If already a string, assume it's an ISO-like string
      if (typeof v === 'string') return v;
      // If a number (milliseconds since epoch)
      if (typeof v === 'number') return this.formatLocalDatetime(new Date(v));
      // If an array from Jackson (e.g. [year, month, day, hour, minute, second, ...])
      if (Array.isArray(v) && v.length >= 3) {
        const year = Number(v[0]);
        const month = Number(v[1]);
        const day = Number(v[2]);
        const hour = Number(v[3] ?? 0);
        const minute = Number(v[4] ?? 0);
        const second = Number(v[5] ?? 0);
        // Jackson months are 1-based; JS Date months are 0-based
        return this.formatLocalDatetime(new Date(year, month - 1, day, hour, minute, second));
      }
      // If it's a Date-like object
      if (v instanceof Date) return this.formatLocalDatetime(v);
      // As a last resort, try to build Date from toString()
      try {
        const d = new Date(v);
        if (!isNaN(d.valueOf())) return this.formatLocalDatetime(d);
      } catch (e) { }
      return undefined;
    };

    const payload: any = {
      status: this.editingExecution?.status || 'RUNNING',
      startedAt: normalizeToIso(this.editingExecution?.startedAt) || this.formatLocalDatetime(new Date()),
      finishedAt: normalizeToIso(this.editingExecution?.finishedAt),
      resultNotes: this.dialogNotes
    };
    if (this.editingExecution && this.editingExecution.id) {
      this.testPlanService.updateExecution(this.editingExecution.id!, payload).subscribe({
        next: () => { this.loadExecutions(); this.closeExecutionDialog(); },
        error: (err) => console.error('Error updating execution:', err)
      });
    } else {
      this.testPlanService.createExecution(this.testPlanId, payload).subscribe({
        next: () => { this.loadExecutions(); this.closeExecutionDialog(); },
        error: (err) => console.error('Error creating execution:', err)
      });
    }
  }

  openDeleteDialog(id: number) {
    this.deleteTargetId = id;
    try { this.confirmDialog.nativeElement.showModal(); } catch (e) { }
  }

  cancelDelete() {
    try { this.confirmDialog.nativeElement.close(); } catch (e) { }
    this.deleteTargetId = undefined;
  }

  confirmDelete() {
    const id = this.deleteTargetId!;
    this.testPlanService.deleteExecution(id).subscribe({
      next: () => { this.loadExecutions(); this.cancelDelete(); },
      error: (err) => console.error('Error deleting execution:', err)
    });
  }

  finishExecution(ex: TestPlanExecution) {
    const finishedAt = this.formatLocalDatetime(new Date());
    const updated = { ...ex, status: 'DONE', finishedAt };
    this.testPlanService.updateExecution(ex.id!, updated).subscribe({
      next: () => this.loadExecutions(),
      error: (err) => console.error('Error finishing execution:', err)
    });
  }

  private formatLocalDatetime(date: Date): string {
    // Produce local date-time in format: 'yyyy-MM-ddTHH:mm:ss'
    // Example: '2025-10-24T23:13:50' (no milliseconds, local time, no timezone)
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  editExecution(ex: TestPlanExecution) {
    this.openExecutionDialog(ex);
  }

  deleteExecution(id: number) {
    this.openDeleteDialog(id);
  }

  loadTestPlanWithCases() {
    this.testPlanService.getTestPlanWithCases(this.testPlanId).subscribe({
      next: (plan) => (this.testPlan = plan),
      error: (error) => console.error('Error loading test plan with cases:', error)
    });
  }

  public tagToColor = tagToColor;
  public contrastingForeground = contrastingForeground;

  goBack() {
    this.router.navigate(['/test-plans'], {
      queryParams: this.previousQueryParams
    });
  }

  toggleCollapse(testCaseId: number) {
    const current = this.collapsedMap.get(testCaseId) ?? false;
    this.collapsedMap.set(testCaseId, !current);
  }

  isCollapsed(testCaseId: number): boolean {
    return this.collapsedMap.get(testCaseId) ?? false;
  }

  editTestPlan() {
    this.router.navigate(['/test-plans', this.testPlanId, 'edit']);
  }

  createTestCase() {
    this.router.navigate(['/test-plans', this.testPlanId, 'test-cases', 'create']);
  }

  editTestCase(testCaseId: number) {
    this.router.navigate(['/test-cases', testCaseId, 'edit']);
  }

  deleteTestCase(testCaseId: number) {
    if (confirm('Are you sure you want to delete this test case?')) {
      this.testPlanService.deleteTestCase(testCaseId).subscribe({
        next: () => this.loadTestPlanWithCases(),
        error: (error) => console.error('Error deleting test case:', error)
      });
    }
  }
}
