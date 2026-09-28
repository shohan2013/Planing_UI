import {Component} from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../../../../Layout/Components/page-title/page-title.component';
@Component({
  selector: 'app-controls',
  templateUrl: './controls.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, PageTitleComponent],  styles: []
})
export class ControlsComponent {

  heading = 'Form Controls';
  subheading = 'Wide selection of forms controls, using the Bootstrap 5 code base, but built with Vue.';
  icon = 'pe-7s-display1 icon-gradient bg-premium-dark';

  constructor() {
  }


}
