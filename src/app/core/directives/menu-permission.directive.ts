import {
  Directive,
  inject,
  Input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  AuthorizationService,
  PermissionAction,
} from '../services/Authorization/authorization.service';

@Directive({
  selector: '[menuPermission]',
  standalone: true,
})
export class MenuPermissionDirective {
  private readonly templateRef =
    inject(TemplateRef<unknown>);

  private readonly viewContainer =
    inject(ViewContainerRef);

  private readonly router = inject(Router);

  private readonly authorizationService =
    inject(AuthorizationService);

  private isRendered = false;

  @Input({ required: true })
  set menuPermission(action: PermissionAction) {
    const isAllowed =
      this.authorizationService.hasPermission(
        this.router.url,
        action,
      );

    if (isAllowed && !this.isRendered) {
      this.viewContainer.createEmbeddedView(
        this.templateRef,
      );

      this.isRendered = true;
      return;
    }

    if (!isAllowed && this.isRendered) {
      this.viewContainer.clear();
      this.isRendered = false;
    }
  }
}