import {Component} from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../../../Layout/Components/page-title/page-title.component';
@Component({
  selector: 'app-tooltips-popovers',
  templateUrl: './tooltips-popovers.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, PageTitleComponent]})
export class TooltipsPopoversComponent {

  heading = 'Tooltips & Popovers';
  subheading = 'These Vue components are used to add interaction or extra information for your app\'s content.';
  icon = 'pe-7s-note2 icon-gradient bg-happy-fisher';

  constructor() {
  }


}
