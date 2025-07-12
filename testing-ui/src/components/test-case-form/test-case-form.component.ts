import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TestCase } from '../../models/test-plan.model';
import { TestPlanService } from '../../services/test-plan.service';

@Component({
  selector: 'app-test-case-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="form-header">
        <h1>{{ isEditMode ? 'Edit Test Case' : 'Create Test Case' }}</h1>
        <button class="btn btn-outline" (click)="goBack()">
          ← Back
        </button>
      </div>

      <form class="form" (ngSubmit)="onSubmit()" #testCaseForm="ngForm">
        <div class="form-group">
          <label for="name">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            [(ngModel)]="testCase.name"
            required
            class="form-control"
            placeholder="Enter test case name"
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            name="description"
            [(ngModel)]="testCase.description"
            class="form-control"
            rows="3"
            placeholder="Enter test case description"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="steps">Test Steps *</label>
          <textarea
            id="steps"
            name="steps"
            [(ngModel)]="testCase.steps"
            required
            class="form-control"
            rows="4"
            placeholder="Enter test steps (one per line)"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="expectedResult">Expected Result *</label>
          <textarea
            id="expectedResult"
            name="expectedResult"
            [(ngModel)]="testCase.expectedResult"
            required
            class="form-control"
            rows="3"
            placeholder="Enter expected result"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="priority">Priority *</label>
            <select
              id="priority"
              name="priority"
              [(ngModel)]="testCase.priority"
              required
              class="form-control"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div class="form-group">
            <label for="status">Status *</label>
            <select
              id="status"
              name="status"
              [(ngModel)]="testCase.status"
              required
              class="form-control"
            >
              <option value="PENDING">Pending</option>
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="!testCaseForm.form.valid">
            {{ isEditMode ? 'Update' : 'Create' }} Test Case
          </button>
          <button type="button" class="btn btn-outline" (click)="goBack()">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `
})
export class TestCaseFormComponent implements OnInit {
  testCase: TestCase = {
    name: '',
    description: '',
    steps: '',
    expectedResult: '',
    priority: 'MEDIUM',
    status: 'PENDING'
  };
  isEditMode = false;
  testCaseId?: number;
  testPlanId?: number;

  constructor(
    private testPlanService: TestPlanService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.testCaseId = Number(this.route.snapshot.paramMap.get('testCaseId'));
    this.testPlanId = Number(this.route.snapshot.paramMap.get('id'));
    this.isEditMode = !!this.testCaseId;

    if (this.isEditMode) {
      this.loadTestCase();
    }
  }

  loadTestCase() {
    if (this.testCaseId) {
      this.testPlanService.getTestCase(this.testCaseId).subscribe({
        next: (testCase) => {
          this.testCase = testCase;
          this.testPlanId = testCase.testPlanId;;
        },
        error: (error) => console.error('Error loading test case:', error)
      });
    }
  }

  onSubmit() {
    if (this.isEditMode && this.testCaseId) {
      this.testPlanService.updateTestCase(this.testCaseId, this.testCase).subscribe({
        next: () => this.goBack(),
        error: (error) => console.error('Error updating test case:', error)
      });
    } else if (this.testPlanId) {
      this.testPlanService.createTestCase(this.testPlanId, this.testCase).subscribe({
        next: () => this.goBack(),
        error: (error) => console.error('Error creating test case:', error)
      });
    }
  }

  goBack() {
    if (this.testPlanId) {
      this.router.navigate(['/test-plans', this.testPlanId]);
    } else {
      this.router.navigate(['/test-plans']);
    }
  }
}