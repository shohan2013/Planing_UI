import { ChangeDetectionStrategy, Component } from '@angular/core';


import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CodeBlockComponent } from '../code-block/code-block.component';
@Component({
  selector: 'app-docs-components',
  templateUrl: './docs-components.component.html',
  imports: [CommonModule, RouterModule, CodeBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsComponentsComponent {
  protected readonly modal = `import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({ /* … */ })
export class ExampleComponent {
  constructor(private modalService: NgbModal) {}

  open(content: TemplateRef<unknown>) {
    this.modalService.open(content, { centered: true });
  }
}`;
}
