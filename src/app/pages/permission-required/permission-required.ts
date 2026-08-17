import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-permission-required',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './permission-required.html',
})
export class PermissionRequired {}