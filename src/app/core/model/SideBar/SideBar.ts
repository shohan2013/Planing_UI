export interface ISideBarMenu {
  MenuId: number;
  MenuName: string;
  Icon: string;
  SubMenus: ISideBarSubMenu[];
}

export interface ISideBarSubMenu {
  SubMenuId: number;
  SubMenuName: string;
  RouterLink: string;
  Icon: string;
}