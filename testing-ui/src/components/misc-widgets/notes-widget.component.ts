import { Component } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';


@Component({
selector: 'app-notes-widget',
standalone: true,
imports: [DragDropModule],
template: `
<div class="widget" cdkDrag>
  <div class="title">Notes</div>
  <textarea rows="4" style="width:100%" placeholder="Type...\n(Drag using the handle on the right)"></textarea>
  <div class="drag-handle" cdkDragHandle>⋮</div>
</div>
`,
styles: [`
.widget { 
  border: 1px solid #e2e8f0; 
  border-radius: 12px; 
  padding: 10px; 
  margin-bottom: 8px; 
  background: #fcfcff;
  position: relative;
  cursor: move;
}
.title { font-weight: 600; margin-bottom: 6px; }
.drag-handle {
  position: absolute;
  top: 8px;
  right: 8px;
  cursor: move;
  font-size: 20px;
  color: #94a3b8;
}
.cdk-drag-preview {
  box-shadow: 0 5px 15px rgba(0,0,0,0.15);
}
.cdk-drag-placeholder {
  opacity: 0.3;
}
.cdk-drag-animating {
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
}
textarea {
  cursor: text;
}
`]
})
export class NotesWidgetComponent {}