import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TestPlan } from '../../models/test-plan.model';
import { TestPlanService } from '../../services/test-plan.service';
import { FormsModule } from '@angular/forms';
import { contrastingForeground, tagToColor } from '../../utils/color.util';

@Component({
  selector: 'app-test-plan-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="header">
        <h1>Test Plans</h1>
        <button class="btn btn-primary" (click)="createTestPlan()">
          <i class="icon">+</i> Create Test Plan
        </button>
      </div>

      <div class="search-row">
        <input
          type="text"
          [(ngModel)]="searchTerm"
          (input)="filterTestPlans()"
          placeholder="Filter by tag"
          class="form-control"
        />
      </div>

      <div class="grid" *ngIf="filteredTestPlans.length > 0">
        <div class="card" *ngFor="let testPlan of filteredTestPlans">
          <div class="card-header">
            <h3>{{ testPlan.name }}</h3>
            <span class="status-badge" [class]="'status-' + testPlan.status.toLowerCase()">
              {{ testPlan.status }}
            </span>
          </div>
          <div class="info-item card-section">
            <label>Tags</label>
            <div class="single-column">
              <div *ngFor="let tag of testPlan.tagList">
                <div>
                  <span class="tag-badge" [class]="'tag-' + tag?.tag?.toLowerCase()" [style.backgroundColor]="tagToColor(tag.tag)" [style.color]="contrastingForeground(tag.tag)">
                    {{ tag.tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="card-body">
            <p>{{ testPlan.description }}</p>
            <div class="card-actions">
              <button class="btn btn-secondary" (click)="viewTestPlan(testPlan.id!)">
                View Details
              </button>
              <button class="btn btn-outline" (click)="editTestPlan(testPlan.id!)">
                Edit
              </button>
              <button class="btn btn-danger" (click)="deleteTestPlan(testPlan.id!)">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="testPlans.length === 0">
        <div class="empty-icon">📋</div>
        <h2>No Test Plans Yet</h2>
        <p>Create your first test plan to get started with testing</p>
        <button class="btn btn-primary" (click)="createTestPlan()">
          Create Test Plan
        </button>
      </div>
    </div>
  `
})
export class TestPlanListComponent implements OnInit {
  testPlans: TestPlan[] = [];
  filteredTestPlans: TestPlan[] = [];
  searchTerm: string = '';

  constructor(
    private testPlanService: TestPlanService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTestPlans();
  }

  public tagToColor = tagToColor;
  public contrastingForeground = contrastingForeground;

  filterTestPlans() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredTestPlans = this.testPlans;
      return;
    }
    this.filteredTestPlans = this.testPlans.filter(plan =>
      plan.tagList && plan.tagList?.some(tag => tag.tag && tag.tag.toLowerCase().includes(term))
    );
  }

  loadTestPlans() {
    this.testPlanService.getTestPlans().subscribe({
      next: (plans) => {
        this.testPlans = plans;
        this.filterTestPlans();
      },
      error: (error) => console.error('Error loading test plans:', error)
    });
  }

  createTestPlan() {
    this.router.navigate(['/test-plans/create']);
  }

  viewTestPlan(id: number) {
    this.router.navigate(['/test-plans', id]);
  }

  editTestPlan(id: number) {
    this.router.navigate(['/test-plans', id, 'edit']);
  }

  deleteTestPlan(id: number) {
    if (confirm('Are you sure you want to delete this test plan?')) {
      this.testPlanService.deleteTestPlan(id).subscribe({
        next: () => this.loadTestPlans(),
        error: (error) => console.error('Error deleting test plan:', error)
      });
    }
  }
}