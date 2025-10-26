import { Component, OnInit, signal, computed, effect } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { TestPlan } from '../../models/test-plan.model';
import { TestPlanService } from '../../services/test-plan.service';
import { FormsModule } from '@angular/forms';
import { contrastingForeground, tagToColor } from '../../utils/color.util';
import { ReportWidgetComponent } from '../report-widget/report-widget.component';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList, DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { WeatherWidgetComponent } from '../misc-widgets/weather-widget.component';
import { StatsWidgetComponent } from '../misc-widgets/stats-widget.component';
import { NotesWidgetComponent } from '../misc-widgets/notes-widget.component';
@Component({
  selector: 'app-test-plan-list',
  standalone: true,
  imports: [FormsModule, ReportWidgetComponent, CommonModule, DragDropModule, CdkDropList, CdkDrag],

  styles:
    `
    :host {
      --gutter: 10px;
      --resizer: 6px;
    }
    * { box-sizing: border-box; }
    body, html { height: 100%; margin: 0; }


  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .app-header { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #fafafa; }
  .content { display: grid; grid-template-columns: 260px 1fr; gap: var(--gutter); padding: var(--gutter); }


  .palette { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; background: white; height: calc(100vh - 120px); overflow: auto; }
  .palette h3 { margin: 4px 0 10px; font-weight: 600; }
  .card-dash { display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 8px; border: 1px dashed #cbd5e1; border-radius: 10px; background: #f8fafc; cursor: grab; }
  .drag-handle { font-size: 16px; opacity: 0.7; cursor: grab; }


  .grid { 
    position: relative; 
    border: 1px solid #e2e8f0; 
    border-radius: 12px; 
    background: white; 
    display: grid; 
    gap: 0; 
    height: calc(100vh - 120px); 
    overflow: hidden;
    grid-template-areas: "a v b" "h h h" "c v2 d";
  }

  .cell { 
    padding: 10px; 
    border: 1px solid #eef2f7; 
    overflow: auto;
    min-height: 0;
    min-width: 0;
  }
  .cell h4 { margin: 0 0 8px; font-weight: 600; }


  /* Use resizers between grid areas */
  .v-resizer { width: var(--resizer); }
  .v-resizer2 { width: var(--resizer); }

  .h-resizer { height: var(--resizer); }


  .cell[id="a"] { grid-area: a; }
  .cell[id="b"] { grid-area: b; }
  .cell[id="c"] { grid-area: c; }
  .cell[id="d"] { grid-area: d; }
  .v-resizer { grid-area: v; cursor: col-resize; background: linear-gradient(to right, #f1f5f9, #e2e8f0); }
  .v-resizer2 { grid-area: v2; cursor: col-resize; background: linear-gradient(to right, #f1f5f9, #e2e8f0); }

  .h-resizer { grid-area: h; cursor: row-resize; background: linear-gradient(to bottom, #f1f5f9, #e2e8f0); }


  /* Improve hit target */
  .v-resizer::after, .h-resizer::after { content: ""; display: block; opacity: .6; }
  .v-resizer::after { height: 100%; width: 2px; margin: 0 auto; background: #cbd5e1; }
  .h-resizer::after { height: 2px; width: 100%; margin: 0 auto; background: #cbd5e1; }


  /* CDK list styling */
  .cdk-drop-list-dragging .card-dash { opacity: .8; }
  .cdk-drag-preview { box-shadow: 0 10px 25px rgba(0,0,0,.15); border-radius: 10px; }
  .cdk-drag-placeholder { opacity: 0.2; }
  `,
  template: `
     <div class="app">
      <header class="app-header">
      <h1>Drag‑Resize Dashboard</h1>
      </header>


      <div class="content">
      <!-- Palette of widgets -->
      <aside class="palette"
      cdkDropList
      id="palette"
      [cdkDropListData]="palette"
      [cdkDropListConnectedTo]="listIds"
      (cdkDropListDropped)="drop($event)">
      <h3>Widgets</h3>
      <div class="card-dash" *ngFor="let cmp of palette" cdkDrag>
      <span class="drag-handle" cdkDragHandle>⠿</span>
      <span>{{ cmp.name }}</span>
      </div>
      </aside>


      <!-- Dashboard grid -->
      <div class="grid resizable" #grid
      [style.gridTemplateColumns]="gridTemplateColumns()"
      [style.gridTemplateRows]="gridTemplateRows()">


      <!-- Top‑left -->
      <section class="cell" cdkDropList id="a"
      [cdkDropListData]="a" [cdkDropListConnectedTo]="listIds"
      (cdkDropListDropped)="drop($event)">
      <h4>A</h4>
      <ng-container *ngFor="let cmp of a">
      <ng-container *ngComponentOutlet="cmp.type"></ng-container>
      </ng-container>
      </section>


      <!-- Vertical resizer between col 1 & 2 -->
      <div class="v-resizer" (mousedown)="startColResize($event, grid)"></div>


      <!-- Top‑right -->
      <section class="cell" cdkDropList id="b"
      [cdkDropListData]="b" [cdkDropListConnectedTo]="listIds"
      (cdkDropListDropped)="drop($event)">
      <h4>B</h4>
      <ng-container *ngFor="let cmp of b">
      <ng-container *ngComponentOutlet="cmp.type"></ng-container>
      </ng-container>
      </section>


      <!-- Horizontal resizer between row 1 & 2 (spans both cols) -->
      <div class="h-resizer" (mousedown)="startRowResize($event, grid)"></div>


      <!-- Bottom‑left -->
      <section class="cell" cdkDropList id="c"
      [cdkDropListData]="c" [cdkDropListConnectedTo]="listIds"
      (cdkDropListDropped)="drop($event)">
      <h4>C</h4>
      <ng-container *ngFor="let cmp of c">
      <ng-container *ngComponentOutlet="cmp.type"></ng-container>
      </ng-container>
      </section>

      <div class="v-resizer2" (mousedown)="startColResize($event, grid)"></div>

      <!-- Bottom‑right -->
      <section class="cell" cdkDropList id="d"
      [cdkDropListData]="d" [cdkDropListConnectedTo]="listIds"
      (cdkDropListDropped)="drop($event)">
      <h4>D</h4>
      <ng-container *ngFor="let cmp of d">
      <ng-container *ngComponentOutlet="cmp.type"></ng-container>
      </ng-container>
      </section>


      </div>
      </div>
    </div>

    <div class="container">
      @if (showReportWidget()) {
        <app-report-widget></app-report-widget>
      }

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
  private readonly STORAGE_KEY = 'dashboard-state';

  // Grid state in percentages
  colPerc = signal<[number, number]>([50, 50]);
  rowPerc = signal<[number, number]>([50, 50]);

  // Component type mapping for serialization
  private componentMap: { [key: string]: any } = {
    'Weather': WeatherWidgetComponent,
    'Stats': StatsWidgetComponent,
    'Notes': NotesWidgetComponent
  };

  gridTemplateColumns = computed(() => {
    const [left] = this.colPerc();
    return `${left}% 6px ${100 - left}%`;
  });

  gridTemplateRows = computed(() => {
    const [top] = this.rowPerc();
    return `${top}% 6px ${100 - top}%`;
  });


  // Available widgets palette (drag from here into any section)
  palette = [
    { type: WeatherWidgetComponent, name: 'Weather' },
    { type: StatsWidgetComponent, name: 'Stats' },
    { type: NotesWidgetComponent, name: 'Notes' }
  ];

  // Each section holds an array of component types
  a = [{ type: WeatherWidgetComponent, name: 'Weather' }];
  b = [{ type: StatsWidgetComponent, name: 'Stats' }];
  c = [{ type: NotesWidgetComponent, name: 'Notes' }];
  d: Array<{ type: any, name: string }> = [];
  lists = signal<object>({});


  // Connect all drop lists so items can be moved freely
  listIds = ['palette', 'a', 'b', 'c', 'd'];

  testPlans: TestPlan[] = [];
  searchTerm: string = '';

  // Keyset pagination state
  pageSize = 4; // limit
  // store a single previous cursor and the current 'after' cursor
  prev: number | null = null;
  after: number | null = null;
  showReportWidget = signal<boolean>(false);

  constructor(private testPlanService: TestPlanService,
    private router: Router,
    private route: ActivatedRoute) {
    // Load saved state on initialization
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);

        // Restore grid layout
        if (state.grid) {
          this.colPerc.set(state.grid.columns);
          this.rowPerc.set(state.grid.rows);
        }

        // Restore widgets
        if (state.widgets) {
          this.a = this.deserializeWidgets(state.widgets.a || []);
          this.b = this.deserializeWidgets(state.widgets.b || []);
          this.c = this.deserializeWidgets(state.widgets.c || []);
          this.d = this.deserializeWidgets(state.widgets.d || []);
        }
      } catch (e) {
        console.error('Failed to load dashboard state:', e);
      }

      // listen for widget preference changes
      try {
        window.addEventListener('dashboardWidgetChanged', (e: any) => {
          const detail = e?.detail;
          this.showReportWidget.set(!!(detail && detail.enabled));
        });
      } catch (e) { }
    }

    // Set up effect to save state when changes occur
    effect(() => {
      const l = this.lists();
      if (l) {
        const state = {
          grid: {
            columns: this.colPerc(),
            rows: this.rowPerc()
          },
          widgets: {
            a: this.serializeWidgets(this.a),
            b: this.serializeWidgets(this.b),
            c: this.serializeWidgets(this.c),
            d: this.serializeWidgets(this.d)
          }
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      }
    });
  }

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
    try {
      const raw = localStorage.getItem('dashboardWidget');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.showReportWidget.set(!!parsed.enabled);
      }
    } catch (e) { }
  }

  private serializeWidgets(widgets: Array<{ type: any, name: string }>): string[] {
    return widgets.map(w => w.name);
  }

  private deserializeWidgets(names: string[]): Array<{ type: any, name: string }> {
    return names.map(name => ({
      type: this.componentMap[name],
      name: name
    }));

  }

  drop(evt: CdkDragDrop<Array<{ type: any, name: string }>>) {
    // Handle both same container and cross-container drops
    if (evt.previousContainer === evt.container) {
      moveItemInArray(evt.container.data, evt.previousIndex, evt.currentIndex);
    } else {
      // If dragging from palette, create a copy
      if (evt.previousContainer.id === 'palette') {
        const itemToCopy = evt.previousContainer.data[evt.previousIndex];
        evt.container.data.splice(evt.currentIndex, 0, { ...itemToCopy });
      } else {
        // Otherwise move the item between containers
        transferArrayItem(
          evt.previousContainer.data,
          evt.container.data,
          evt.previousIndex,
          evt.currentIndex
        );
      }
    }
    this.lists.set({});  // Trigger save effect
  }


  private startX = 0;
  private startY = 0;
  private isDragging = false;

  startColResize(event: MouseEvent, container: HTMLElement) {
    if (event.button !== 0) return;  // Only handle left mouse button
    event.preventDefault();
    event.stopPropagation();

    this.startX = event.pageX;
    this.isDragging = true;

    const startWidth = container.getBoundingClientRect().width;
    const [currentLeftPerc] = this.colPerc();
    const startLeft = startWidth * (currentLeftPerc / 100);  // Start at current position

    const mouseMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging) return;

      const dx = e.pageX - this.startX;
      const newLeftWidth = startLeft + dx;
      const leftPercent = (newLeftWidth / startWidth) * 100;

      // Constrain between 20% and 80%
      const constrainedLeft = Math.max(20, Math.min(80, leftPercent));
      this.colPerc.set([constrainedLeft, 100 - constrainedLeft]);
    };

    const mouseUpHandler = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  startRowResize(event: MouseEvent, container: HTMLElement) {
    if (event.button !== 0) return;  // Only handle left mouse button
    event.preventDefault();
    event.stopPropagation();

    this.startY = event.pageY;
    this.isDragging = true;

    const startHeight = container.getBoundingClientRect().height;
    const [currentTopPerc] = this.rowPerc();
    const startTop = startHeight * (currentTopPerc / 100);  // Start at current position

    const mouseMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging) return;

      const dy = e.pageY - this.startY;
      const newTopHeight = startTop + dy;
      const topPercent = (newTopHeight / startHeight) * 100;

      // Constrain between 20% and 80%
      const constrainedTop = Math.max(20, Math.min(80, topPercent));
      this.rowPerc.set([constrainedTop, 100 - constrainedTop]);
    };

    const mouseUpHandler = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
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