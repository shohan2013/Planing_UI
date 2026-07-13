import { CommonModule } from "@angular/common";
import { MessagesBoxComponent } from "../../pages/Layout/Components/header/elements/messages-box/messages-box";
import { NotificationsBoxComponent } from "../../pages/Layout/Components/header/elements/notifications-box/notifications-box";
import { SearchBoxComponent } from "../../pages/Layout/Components/header/elements/search-box/search-box.component";
import { UserBoxComponent } from "../../pages/Layout/Components/header/elements/user-box/user-box.component";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { BaseLayoutComponent } from "../../pages/Layout/base-layout/base-layout.component";
import { PagesLayoutComponent } from "../../pages/Layout/pages-layout/pages-layout.component";

export const SHARED_COMPONENTS = [
  CommonModule,
  FontAwesomeModule,
  RouterOutlet,
  RouterLink,
  NotificationsBoxComponent,
  UserBoxComponent,
  MessagesBoxComponent,
  SearchBoxComponent
];