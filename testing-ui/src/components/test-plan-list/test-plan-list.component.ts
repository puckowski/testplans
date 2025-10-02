import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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

      <div class="pagination">
        <button class="btn btn-secondary" (click)="prevPage()" [disabled]="cursorStack.length <= 1">Prev</button>
        <span class="page-info">Showing up to {{ pageSize }} plans</span>
        <button class="btn btn-secondary" (click)="nextPage()" [disabled]="!testPlans || testPlans.length < pageSize">Next</button>
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

  // Keyset pagination state
  pageSize = 4; // limit
  // stack of cursors (where values) to allow going back; initial null means start from beginning
  cursorStack: (number | null)[] = [null];
  currentWhere: number | null = null;

  constructor(
    private testPlanService: TestPlanService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Subscribe to query params to handle browser navigation & reload
    this.route.queryParams.subscribe(params => {
      // Set defaults or use from params
      this.pageSize = +params['size'] || 4;
      this.searchTerm = params['search'] || '';
      const whereParam = params['where'];
      const whereProvided = params.hasOwnProperty('where');
      this.currentWhere = whereParam != null ? Number(whereParam) : null;

      // Rebuild cursor stack from 'cursors' param if present (comma-separated list)
      const cursorsParam = params['cursors'];
      if (cursorsParam) {
        try {
          const parts = String(cursorsParam).split(',').filter(p => p.length > 0).map(p => Number(p));
          this.cursorStack = [null, ...parts];
        } catch (e) {
          this.cursorStack = [null];
        }
      } else {
        // fallback: keep simple stack with only currentWhere if provided
        this.cursorStack = [null];
        if (this.currentWhere != null) this.cursorStack.push(this.currentWhere);
      }

      // Only derive currentWhere from cursorStack when an explicit 'where' query param was not provided
      if (!whereProvided && this.cursorStack.length > 1) {
        const last = this.cursorStack[this.cursorStack.length - 1];
        this.currentWhere = last ?? null;
      }

      // Load plans for current cursor
      this.loadTestPlans();
    });
  }

  public tagToColor = tagToColor;
  public contrastingForeground = contrastingForeground;

  private updateQueryParams() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
  where: this.currentWhere != null ? this.currentWhere : undefined,
  size: this.pageSize,
  search: this.searchTerm || undefined, // don't include empty
  cursors: this.cursorStack && this.cursorStack.length > 1 ? this.cursorStack.slice(1).filter(x => x != null).join(',') : undefined
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  loadTestPlanCount() {
    this.testPlanService.getTestPlanCount(this.searchTerm).subscribe({
      next: (count) => {
  // We keep count for informational purposes but keyset pagination doesn't use offsets
  // Show only next/prev controls
  // (no change to cursor stack here)
  this.loadTestPlans();
      },
      error: (error) => console.error('Error loading test plan count:', error)
    });
  }

  filterTestPlans() {
    this.updateQueryParams();
  }

  public setSearchPlanFilter(tag: string) {
    this.searchTerm = tag;
  // reset keyset pagination and query params
  this.currentWhere = null;
  this.cursorStack = [null];
  this.updateQueryParams();
  }

  private resetPagination() {
  this.cursorStack = [null];
  this.currentWhere = null;
  this.pageSize = 4;
  }


  loadTestPlans() {
    this.testPlanService.getTestPlans(this.currentWhere ?? undefined, this.pageSize, this.searchTerm).subscribe({
      next: (plans) => {
        this.testPlans = plans;
      },
      error: (error) => console.error('Error loading test plans:', error)
    });
  }

  // Navigate to next page using keyset pagination
  nextPage() {
    if (!this.testPlans || this.testPlans.length === 0) return;
    const last = this.testPlans[this.testPlans.length - 1];
    const lastId = last.id!;
  // push the current cursor (could be null) and set where to lastId for next page
  this.cursorStack.push(this.currentWhere);
  this.currentWhere = lastId;
    this.updateQueryParams();
  }

  // Navigate to previous page: pop cursor stack
  prevPage() {
    if (this.cursorStack.length <= 1) return; // already at beginning
    // current top is the cursor that got us here; pop it
    this.cursorStack.pop();
    const prev = this.cursorStack[this.cursorStack.length - 1];
    this.currentWhere = prev ?? null;
    this.updateQueryParams();
  }

  createTestPlan() {
    this.router.navigate(['/test-plans/create'], {
      queryParams: {
        ...this.route.snapshot.queryParams
      }
    });
  }

  viewTestPlan(id: number) {
    this.router.navigate(['/test-plans', id], {
      queryParams: {
        ...this.route.snapshot.queryParams
      }
    });
  }

  editTestPlan(id: number) {
    this.router.navigate(['/test-plans', id, 'edit'], {
      queryParams: {
        ...this.route.snapshot.queryParams
      }
    });
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