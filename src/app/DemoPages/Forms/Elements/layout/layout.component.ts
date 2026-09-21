import {Component} from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../../../../Layout/Components/page-title/page-title.component';
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, PageTitleComponent],  styles: []
})
export class LayoutComponent {

  heading = 'Form Layouts';
  subheading = 'Build whatever layout you need with our ArchitectUI framework.';
  icon = 'pe-7s-graph text-success';

  constructor() {
  }


}
