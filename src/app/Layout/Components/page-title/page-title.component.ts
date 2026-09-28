import {Component, Input} from '@angular/core';
import { faStar, faPlus } from '@fortawesome/free-solid-svg-icons';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
@Component({
  selector: 'app-page-title',
  templateUrl: './page-title.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule]
})
export class PageTitleComponent {

  faStar = faStar;
  faPlus = faPlus;

  @Input() heading: string = '';
  @Input() subheading: string = '';
  @Input() icon: string = '';

}
