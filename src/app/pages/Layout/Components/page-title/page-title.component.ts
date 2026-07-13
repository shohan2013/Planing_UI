import {Component, Input} from '@angular/core';
import { faStar, faPlus } from '@fortawesome/free-solid-svg-icons';
import { SHARED_COMPONENTS } from '../../../../shared/SharedComponent/SharedComponent';

@Component({
  selector: 'app-page-title',
  templateUrl: './page-title.component.html',
  standalone: true,
  imports:[SHARED_COMPONENTS]
})
export class PageTitleComponent {

  faStar = faStar;
  faPlus = faPlus;

  @Input() heading: string = '';
  @Input() subheading: string = '';
  @Input() icon: string = '';

}
