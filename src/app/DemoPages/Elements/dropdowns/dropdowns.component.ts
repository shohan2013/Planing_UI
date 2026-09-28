import {Component} from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../../../Layout/Components/page-title/page-title.component';
@Component({
  selector: 'app-dropdowns',
  templateUrl: './dropdowns.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, PageTitleComponent],  styles: []
})
export class DropdownsComponent {

  heading = 'Dropdowns';
  subheading = 'Multiple styles, actions and effects are available for the ArchutectUI dropdown buttons.';
  icon = 'pe-7s-umbrella icon-gradient bg-sunny-morning';

  constructor() {
  }


}
