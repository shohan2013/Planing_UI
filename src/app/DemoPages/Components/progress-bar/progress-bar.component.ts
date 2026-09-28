import {Component} from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../../../Layout/Components/page-title/page-title.component';
@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, PageTitleComponent]})
export class ProgressBarComponent {

  height = '20px';

  heading = 'Progress Bar';
  subheading = 'You can use the progress bars on their own or in combination with other widgets.';
  icon = 'pe-7s-filter icon-gradient bg-grow-early';

  constructor() {
  }


}
