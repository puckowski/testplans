import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TestPlan, TestCase } from '../../models/test-plan.model';
import { TestPlanService } from '../../services/test-plan.service';
import { tagToColor, contrastingForeground } from '../../utils/color.util';

@Component({
    selector: 'app-test-plan-with-cases',
    standalone: true,
    imports: [CommonModule],
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
          @if (testPlan?.testCases && testPlan.testCases!.length > 0) {
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
            @if (!testPlan?.testCases || testPlan.testCases!.length === 0) {
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

    constructor(
        private testPlanService: TestPlanService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit() {
        this.testPlanId = Number(this.route.snapshot.paramMap.get('id'));
        this.previousQueryParams = { ...this.route.snapshot.queryParams };
        this.loadTestPlanWithCases();
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
