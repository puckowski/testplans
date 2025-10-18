import { Component, OnInit } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { TestPlan, TestCase } from '../../models/test-plan.model';
import { TestPlanService } from '../../services/test-plan.service';
import { tagToColor } from '../../utils/color.util';
import { contrastingForeground } from '../../utils/color.util';

@Component({
  selector: 'app-test-plan-detail',
  standalone: true,
  imports: [],
  template: `
    <div class="container">
      <div class="header">
        <div class="header-left">
          <button class="btn btn-outline" (click)="goBack()">
            ← Back
          </button>
          <h1>{{ testPlan?.name }}</h1>
        </div>
        <div class="header-right">
          <button class="btn btn-outline" (click)="editTestPlan()">
            Edit Plan
          </button>
          <button class="btn btn-primary" (click)="executeTestPlan()">
            ▶ Execute Plan
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
                    <div>
                      <span class="tag-badge" [class]="'tag-' + tag.tag.toLowerCase()" [style.backgroundColor]="tagToColor(tag.tag)" [style.color]="contrastingForeground(tag.tag)">
                        {{ tag.tag }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    
      <div class="test-cases-section">
        <div class="section-header">
          <h2>Test Cases ({{ testCases.length || 0 }})</h2>
          <button class="btn btn-primary" (click)="createTestCase()">
            <i class="icon">+</i> Add Test Case
          </button>
        </div>
    
        @if (testCases.length > 0) {
          <div class="test-cases-grid">
            @for (testCase of testCases; track testCase) {
              <div class="test-case-card">
                <div class="test-case-header">
                  <h4>{{ testCase.name }}</h4>
                  <div class="test-case-meta">
                    <span class="priority-badge" [class]="'priority-' + testCase.priority.toLowerCase()">
                      {{ testCase.priority }}
                    </span>
                    <span class="status-badge" [class]="'status-' + testCase.status.toLowerCase()">
                      {{ testCase.status }}
                    </span>
                  </div>
                </div>
                <div class="test-case-body">
                  <p>{{ testCase.description }}</p>
                  <div class="test-case-actions">
                    <button class="btn btn-sm btn-outline" (click)="editTestCase(testCase.id!)">
                      Edit
                    </button>
                    <button class="btn btn-sm btn-danger" (click)="deleteTestCase(testCase.id!)">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
    
        @if (testCases.length === 0) {
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
    `
})
export class TestPlanDetailComponent implements OnInit {
  testPlan?: TestPlan;
  testCases: TestCase[] = [];
  testPlanId!: number;
  previousQueryParams: any = {};

  constructor(
    private testPlanService: TestPlanService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.testPlanId = Number(this.route.snapshot.paramMap.get('id'));
    this.previousQueryParams = { ...this.route.snapshot.queryParams };
    this.loadTestPlan();
    this.loadTestCases();
  }

  loadTestPlan() {
    this.testPlanService.getTestPlan(this.testPlanId).subscribe({
      next: (testPlan) => this.testPlan = testPlan,
      error: (error) => console.error('Error loading test plan:', error)
    });
  }

  executeTestPlan() {
    this.router.navigate(['/test-plans', this.testPlanId, 'with-cases'], {
      queryParams: this.previousQueryParams
    });
  }

  loadTestCases() {
    this.testPlanService.getTestCases(this.testPlanId).subscribe({
      next: (testCases) => this.testCases = testCases,
      error: (error) => console.error('Error loading test cases:', error)
    });
  }

  public tagToColor = tagToColor;
  public contrastingForeground = contrastingForeground;

  goBack() {
    this.router.navigate(['/test-plans'], {
      queryParams: this.previousQueryParams
    });
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
        next: () => this.loadTestCases(),
        error: (error) => console.error('Error deleting test case:', error)
      });
    }
  }
}