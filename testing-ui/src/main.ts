import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { TestPlanListComponent } from './components/test-plan-list/test-plan-list.component';
import { TestPlanFormComponent } from './components/test-plan-form/test-plan-form.component';
import { TestPlanDetailComponent } from './components/test-plan-detail/test-plan-detail.component';
import { TestCaseFormComponent } from './components/test-case-form/test-case-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app">
      <nav class="navbar">
        <div class="nav-container">
          <div class="nav-brand" (click)="navigateHome()">
            <span class="nav-icon">🧪</span>
            <span class="nav-title">Test Plan Manager</span>
          </div>
          <div class="nav-links">
            <button class="nav-link" (click)="navigateHome()">Test Plans</button>
          </div>
        </div>
      </nav>
      
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class App {
  constructor(private router: Router) { }

  navigateHome() {
    this.router.navigate(['/test-plans']);
  }
}

const routes: Routes = [
  { path: '', redirectTo: '/test-plans', pathMatch: 'full' },
  { path: 'test-plans', component: TestPlanListComponent },
  { path: 'test-plans/create', component: TestPlanFormComponent },
  { path: 'test-plans/:id', component: TestPlanDetailComponent },
  { path: 'test-plans/:id/edit', component: TestPlanFormComponent },
  { path: 'test-plans/:id/test-cases/create', component: TestCaseFormComponent },
  { path: 'test-cases/:testCaseId/edit', component: TestCaseFormComponent },
  {
    path: 'test-plans/:id/with-cases',
    loadComponent: () => import('./components/test-plan-execute/test-plan-with-cases.component').then(m => m.TestPlanWithCasesComponent)
  }
];

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
});