import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TestPlan } from '../../models/test-plan.model';
import { TestPlanService } from '../../services/test-plan.service';

@Component({
  selector: 'app-test-plan-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <div class="form-header">
        <h1>{{ isEditMode ? 'Edit Test Plan' : 'Create Test Plan' }}</h1>
        <button class="btn btn-outline" (click)="goBack()">
          ← Back
        </button>
      </div>
    
      <form class="form" (ngSubmit)="onSubmit()" #testPlanForm="ngForm">
        <div class="form-group">
          <label for="name">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            [(ngModel)]="testPlan.name"
            required
            class="form-control"
            placeholder="Enter test plan name"
            />
        </div>
    
        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            name="description"
            [(ngModel)]="testPlan.description"
            class="form-control"
            rows="4"
            placeholder="Enter test plan description"
          ></textarea>
        </div>
    
        <div class="form-group">
          <label for="status">Status *</label>
          <select
            id="status"
            name="status"
            [(ngModel)]="testPlan.status"
            required
            class="form-control"
            >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
    
        <div class="form-group">
          <label>Tags</label>
          @for (tag of testPlan.tagList; track tag; let i = $index) {
            <div class="tag-input-group" style="display: flex; gap: 0.5em; margin-bottom: 0.5em;">
              <input
                type="text"
                [(ngModel)]="testPlan.tagList[i].tag"
                name="tag-{{i}}"
                class="form-control"
                placeholder="Enter tag"
                />
              @if (testPlan.tagList.length > 0) {
                <button type="button" (click)="removeTag(i)" class="btn btn-sm btn-outline-danger">Remove</button>
              }
            </div>
          }
          <button type="button" (click)="addTag()" class="btn btn-outline-primary btn-sm">Add Tag</button>
        </div>
    
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="!testPlanForm.form.valid">
            {{ isEditMode ? 'Update' : 'Create' }} Test Plan
          </button>
          <button type="button" class="btn btn-outline" (click)="goBack()">
            Cancel
          </button>
        </div>
      </form>
    </div>
    `
})
export class TestPlanFormComponent implements OnInit {
  testPlan: TestPlan = {
    name: '',
    description: '',
    status: 'DRAFT',
    tagList: []
  };
  isEditMode = false;
  testPlanId?: number;
  previousQueryParams: any = {};

  constructor(
    private testPlanService: TestPlanService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.testPlanId = Number(this.route.snapshot.paramMap.get('id'));
    this.isEditMode = !!this.testPlanId;
    this.previousQueryParams = { ...this.route.snapshot.queryParams };

    if (this.isEditMode) {
      this.loadTestPlan();
    }
  }

  addTag() {
    this.testPlan.tagList.push({ tag: '' });
  }

  removeTag(index: number) {
    this.testPlan.tagList.splice(index, 1);
  }

  loadTestPlan() {
    if (this.testPlanId) {
      this.testPlanService.getTestPlan(this.testPlanId).subscribe({
        next: (testPlan) => this.testPlan = testPlan,
        error: (error) => console.error('Error loading test plan:', error)
      });
    }
  }

  onSubmit() {
    if (this.isEditMode && this.testPlanId) {
      this.testPlanService.updateTestPlan(this.testPlanId, this.testPlan).subscribe({
        next: () => this.router.navigate(['/test-plans']),
        error: (error) => console.error('Error updating test plan:', error)
      });
    } else {
      this.testPlanService.createTestPlan(this.testPlan).subscribe({
        next: () => this.router.navigate(['/test-plans']),
        error: (error) => console.error('Error creating test plan:', error)
      });
    }
  }

  goBack() {
    this.router.navigate(['/test-plans'], {
      queryParams: this.previousQueryParams
    });
  }
}