import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../../../Layout/Components/page-title/page-title.component';
const PrimaryWhite = '#fff';
const SecondaryGrey = '#ccc';
const PrimaryRed = 'var(--danger)';
const SecondaryBlue = 'var(--primary)';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, PageTitleComponent],  styles: []
})
export class CardsComponent {

  heading = 'Cards';
  subheading = 'Wide selection of cards with multiple styles, borders, actions and hover effects.';
  icon = 'pe-7s-stopwatch icon-gradient bg-amy-crisp';

  constructor(private sanitizer: DomSanitizer) {
  }

}
