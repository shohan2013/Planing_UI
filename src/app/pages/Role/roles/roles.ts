import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';


import { RoleAssign } from '../role-assign/role-assign';
import { RolePermission } from '../role-permission/role-permission';

type RoleTab = 'role-assign' | 'role-permission';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [RoleAssign, RolePermission],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Roles {
  readonly activeTab = signal<RoleTab>('role-assign');

  onTabChange(tab: RoleTab): void {
    this.activeTab.set(tab);
  }
}