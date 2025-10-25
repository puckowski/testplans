import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unknown-route',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container empty-state">
      <div class="empty-icon">❓</div>
      <h2>Page not found</h2>
      <p>The page you requested does not exist.</p>
      <button class="btn btn-primary" (click)="goHome()">Back to Test Plans</button>
    </div>
  `
})
export class UnknownRouteComponent {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/test-plans']);
  }
}
