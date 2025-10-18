import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { TestPlan } from '../../models/test-plan.model';
import { TestPlanService } from '../../services/test-plan.service';
import { FormsModule } from '@angular/forms';
import { contrastingForeground, tagToColor } from '../../utils/color.util';

@Component({
  selector: 'app-test-plan-list',
  standalone: true,
  imports: [FormsModule],
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
    
        @if (testPlans.length > 0) {
          <div class="grid">
            @for (testPlan of testPlans; track testPlan) {
              <div class="card">
                <div class="card-header">
                  <h3>{{ testPlan.name }}</h3>
                  <span class="status-badge" [class]="'status-' + testPlan.status.toLowerCase()">
                    {{ testPlan.status }}
                  </span>
                </div>
                <div class="info-item card-section">
                  <label>Tags</label>
                  <div class="single-column">
                    @for (tag of testPlan.tagList; track tag) {
                      <div>
                        <div>
                          <span class="tag-badge" [class]="'tag-' + tag?.tag?.toLowerCase()" [style.backgroundColor]="tagToColor(tag.tag)" [style.color]="contrastingForeground(tag.tag)" (click)="setSearchPlanFilter(tag.tag)">
                            {{ tag.tag }}
                          </span>
                        </div>
                      </div>
                    }
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
            }
          </div>
        }
    
        <div class="pagination">
          <button class="btn btn-secondary" (click)="prevPage()" [disabled]="after == null && prev == null">Prev</button>
          <span class="page-info">Showing up to {{ pageSize }} plans</span>
          <button class="btn btn-secondary" (click)="nextPage()" [disabled]="!testPlans || testPlans.length < pageSize">Next</button>
        </div>
    
        @if (testPlans.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h2>No Test Plans Yet</h2>
            <p>Create your first test plan to get started with testing</p>
            <button class="btn btn-primary" (click)="createTestPlan()">
              Create Test Plan
            </button>
          </div>
        }
      </div>
    `
})
export class TestPlanListComponent implements OnInit {
  testPlans: TestPlan[] = [];
  searchTerm: string = '';

  // Keyset pagination state
  pageSize = 4; // limit
  // store a single previous cursor and the current 'after' cursor
  prev: number | null = null;
  after: number | null = null;

  constructor(
    private testPlanService: TestPlanService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Subscribe to query params to handle browser navigation & reload
    this.route.queryParams.subscribe(params => {
  // Set defaults or use from params
  this.pageSize = +params['per'] || 4;
  this.searchTerm = params['filter'] || '';
  const afterParam = params['after'];
  const prevParam = params['prev'];
  this.after = afterParam != null ? Number(afterParam) : null;
  this.prev = prevParam != null ? Number(prevParam) : null;

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
        after: this.after != null ? this.after : undefined,
        prev: this.prev != null ? this.prev : undefined,
        per: this.pageSize,
        filter: this.searchTerm || undefined
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
  this.after = null;
  this.prev = null;
  this.updateQueryParams();
  }

  public setSearchPlanFilter(tag: string) {
    this.searchTerm = tag;
  // reset keyset pagination and update
  this.after = null;
  this.prev = null;
  this.updateQueryParams();
  }

  private resetPagination() {
    this.prev = null;
    this.after = null;
    this.pageSize = 4;
  }


  loadTestPlans() {
    this.testPlanService.getTestPlans(this.after ?? undefined, this.pageSize, this.searchTerm).subscribe({
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
  // store previous cursor and set 'after' to lastId for next page
  // preserve the first-page cursor in `prev` so users can jump back to the start with one click
  if (this.prev == null) this.prev = this.after;
  this.after = lastId;
  this.updateQueryParams();
  }

  // Navigate to previous page: pop cursor stack
  prevPage() {
    // If a stored prev exists, go to it. Otherwise clear 'after' to go to the first page.
    if (this.prev != null) {
      this.after = this.prev;
      this.prev = null;
    } else {
      // go to first page
      this.after = null;
    }
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