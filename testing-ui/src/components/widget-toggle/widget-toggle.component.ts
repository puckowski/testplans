import { Component, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-widget-toggle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="position:relative; display:inline-block;">
      <button #btn class="btn" (click)="toggle($event, btn)">Widgets ▾</button>

      <div *ngIf="open" [ngStyle]="popoverStyle" (click)="$event.stopPropagation()"
           style="z-index:30; background:#fff; border:1px solid #ddd; padding:10px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.08); min-width:220px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <label style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" [(ngModel)]="widget.enabled" /> Show Report widget
          </label>
        </div>
        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
          <label style="display:flex; gap:8px; align-items:center;">
            Plan ID:
            <input type="number" [(ngModel)]="widget.planId" min="1" style="width:100px;" />
          </label>
        </div>
        <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn btn-primary" (click)="save()">Save</button>
          <button class="btn" (click)="cancel()">Close</button>
        </div>
      </div>
    </div>
  `
})
export class WidgetToggleComponent {
  open = false;
  widget: { enabled: boolean; planId?: number } = { enabled: false };
  popoverStyle: { [k: string]: string } = { position: 'absolute', top: '0px', left: '0px' };

  constructor(private el: ElementRef<HTMLElement>) {
    try {
      const raw = localStorage.getItem('dashboardWidget');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.widget.enabled = !!parsed.enabled;
        this.widget.planId = parsed.planId ?? undefined;
      }
    } catch (e) { }
  }

  toggle(event: MouseEvent, btn: HTMLElement) {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) this.positionPopover(btn as HTMLElement);
  }

  private positionPopover(btn: HTMLElement) {
    try {
      const btnRect = btn.getBoundingClientRect();
      const hostRect = this.el.nativeElement.getBoundingClientRect();
      const top = btnRect.bottom - hostRect.top + 8; // place below the button
      const left = btnRect.left - hostRect.left; // align left edges
      this.popoverStyle = {
        position: 'absolute',
        top: top + 'px',
        left: left + 'px'
      };
    } catch (e) {
      // fall back to default
      this.popoverStyle = { position: 'absolute', top: '28px', left: '0px' };
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as Node;
    if (!this.el.nativeElement.contains(target)) {
      this.open = false;
    }
  }

  save() {
    localStorage.setItem('dashboardWidget', JSON.stringify(this.widget));
    try {
      window.dispatchEvent(new CustomEvent('dashboardWidgetChanged', { detail: this.widget }));
    } catch (e) { }
    this.open = false;
  }

  cancel() {
    this.open = false;
  }
}
