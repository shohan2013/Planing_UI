import {Component} from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../../../Layout/Components/page-title/page-title.component';
import { DoughnutChartComponent } from './examples/doughnut-chart/doughnut-chart.component';
import { RadarChartComponent } from './examples/radar-chart/radar-chart.component';
import { PolarAreaChartComponent } from './examples/polar-area-chart/polar-area-chart.component';
import { PieChartComponent } from './examples/pie-chart/pie-chart.component';
import { LineChartComponent } from './examples/line-chart/line-chart.component';
import { DynamicChartComponent } from './examples/dynamic-chart/dynamic-chart.component';
import { BarChartComponent } from './examples/bar-chart/bar-chart.component';
@Component({
  selector: 'app-chartjs',
  templateUrl: './chartjs.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, PageTitleComponent, DoughnutChartComponent, RadarChartComponent, PolarAreaChartComponent, PieChartComponent, LineChartComponent, DynamicChartComponent, BarChartComponent],  styles: []
})
export class ChartjsComponent {
  heading = 'ChartJS';
  subheading = 'Huge selection of charts created with Chart.js and ng2-charts';
  icon = 'pe-7s-bandaid icon-gradient bg-amy-crisp';

  constructor() {
  }


}
