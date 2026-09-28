import {Component} from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../../../Layout/Components/page-title/page-title.component';
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, PageTitleComponent]})
export class TabsComponent {

  heading = 'Tabs';
  subheading = 'Tabs are used to split content between multiple sections. Wide variety available.';
  icon = 'pe-7s-drawer icon-gradient bg-happy-itmeo';

  currentJustify = 'start';
  currentOrientation = 'horizontal';
  disabled = true; // For disabled tab examples

  constructor() {
  }
}
