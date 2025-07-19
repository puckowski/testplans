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
        <button class="btn btn-secondary" (click)="searchTerm = ''; filterTestPlans()">
          Clear Filter
        </button>
      </div>

      <div class="grid" *ngIf="testPlans.length > 0">
        <div class="card" *ngFor="let testPlan of testPlans">
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
                  <span class="tag-badge" [class]="'tag-' + tag?.tag?.toLowerCase()" [style.backgroundColor]="tagToColor(tag.tag)" [style.color]="contrastingForeground(tag.tag)" (click)="setSearchPlanFilter(tag.tag)">
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

      <div class="pagination" *ngIf="totalPages > 1">
        <button class="btn btn-secondary" (click)="onPageChange(currentPage - 1)" [disabled]="currentPage === 0">Prev</button>
        <span *ngFor="let page of [].constructor(totalPages); let i = index">
          <button class="btn btn-secondary" (click)="onPageChange(i)" [class.active]="i === currentPage">{{ i + 1 }}</button>
        </span>
        <button class="btn btn-secondary" (click)="onPageChange(currentPage + 1)" [disabled]="currentPage === totalPages - 1">Next</button>
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
  searchTerm: string = '';

  currentPage = 0;
  pageSize = 4;
  totalPlans = 0;
  totalPages = 0;

  constructor(
    private testPlanService: TestPlanService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadTestPlanCount();
  }

  public tagToColor = tagToColor;
  public contrastingForeground = contrastingForeground;

  loadTestPlanCount() {
    this.testPlanService.getTestPlanCount(this.searchTerm).subscribe({
      next: (count) => {
        this.totalPlans = count;
        this.totalPages = Math.ceil(count / this.pageSize);
        this.loadTestPlans();
      },
      error: (error) => console.error('Error loading test plan count:', error)
    });
  }

  filterTestPlans() {
    this.loadTestPlanCount();
  }

  public setSearchPlanFilter(tag: string) {
    this.searchTerm = tag;
    this.resetPagination();
    this.filterTestPlans();
  }

  private resetPagination() {
    this.currentPage = 0;
    this.pageSize = 4;
    this.totalPlans = 0;
    this.totalPages = 0;
  }


  loadTestPlans() {
    this.testPlanService.getTestPlans(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (plans) => {
        this.testPlans = plans;
      },
      error: (error) => console.error('Error loading test plans:', error)
    });
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadTestPlans();
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