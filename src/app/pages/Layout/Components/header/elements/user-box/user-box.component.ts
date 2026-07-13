import { Component } from '@angular/core';
import { ThemeOptions } from '../../../../../../theme-options';

@Component({
  selector: 'app-user-box',
  templateUrl: './user-box.component.html',
  standalone: true,
})
export class UserBoxComponent {
  constructor(public globals: ThemeOptions) {}
}
