import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-test-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './test-report.component.html',
  styleUrls: ['./test-report.component.scss'],
})
export class TestReportComponent {

    reportUrl: SafeResourceUrl | null = null;
    constructor(private sanitizer: DomSanitizer) {}

    dateForm = new FormGroup({
    startDate: new FormControl('', { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
  });

  error = '';
  submittedRange: { startDate: string; endDate: string } | null = null;



    submit(): void {
    this.error = '';
    this.submittedRange = null;

    const { startDate, endDate } = this.dateForm.getRawValue();

    if (!startDate || !endDate) {
        this.error = 'Please select both dates.';
        return;
    }

    if (startDate > endDate) {
        this.error = 'Start date cannot be after end date.';
        return;
    }

    const unit = '107';

    const url =
        'https://report.akijbashir.com/ReportServer/Pages/ReportViewer.aspx?' +
        encodeURIComponent('/TeaLink/BonusSummary') +
        '&FROMDATE=' + encodeURIComponent(startDate) +
        '&TODATE=' + encodeURIComponent(endDate) +
        '&UNITID=' + encodeURIComponent(unit) +
        '&BOOKID=&CODE=&DIVISIONID=' +
        '&rs:Embed=true&rc:LinkTarget=_self';

    this.reportUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.submittedRange = { startDate, endDate };

    const reportWindow = window.open(
        url,
        '_blank',
        'scrollbars=yes,toolbar=0,height=700,width=1100,top=60,left=60',
    );

    if (reportWindow) {
        reportWindow.focus();
    } else {
        this.error = 'Popup blocked. Allow popups to compare both views.';
    }
    }





}