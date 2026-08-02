import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateTime',
  standalone: true,
})
export class DateTimePipe implements PipeTransform {
  private datePipe = new DatePipe('en-US');

  transform(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    return this.datePipe.transform(value, 'dd MMM yyyy, hh:mm a') ?? '';
  }
}
