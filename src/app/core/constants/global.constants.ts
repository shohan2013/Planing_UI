export const GlobalConstant = {
  API_END_POINTS: {
    LOGIN: 'Login/Login',
    LOGOUT: 'Logout/Logout',

    PermissionByEnroll: 'Permission/menupermission',
    PermissionByType: 'Permission/permissionbytype',

    /*===========================MENU===================================== */
    Menu: 'Menu',
    getMenuById: 'Menu/menu',
    addMenu: 'Menu',
    updateMenu: 'Menu',
    deleteMenu: 'Menu',

    /*===========================SUB MENU===================================== */
    SubMenu: 'SubMenu',
    getSubMenuById: 'SubMenu/submenu',
    addSubMenu: 'SubMenu',
    updateSubMenu: 'SubMenu',
    deleteSubMenu: 'SubMenu',

    /*===========================MATRIX===================================== */
    ApproveMatrix: 'ApproveMatrix',
    ProvideApproveMatrix: 'ApproveMatrix/updateApproveMatrixPermission',

    ApproveMatrixGroup: 'ApprovalMatrixGroup',

    /*===========================REQUISITION===================================== */
    addRequisition: 'Requisition/save',
    getRequisition: 'Requisition',
    updateRequisition: 'Requisition/update',
    deleteRequisition: 'Requisition/',

    /*===========================COMMON===================================== */
    Common: 'Common',
    modules: 'Common/modules',
    menus: 'Common/menus',
    approvalgroups: 'Common/approvalgroups',
    units: 'Common/units',
    priority: 'Common/priorities',
    SubMenuList: 'Common/submenus',
    SubMenuListByMenuId: 'Common/submenusById',
    EnrollList: 'Common/enrolllist',
    ApproveMatrixGroupTypeList: 'Common/approvalmatrixgrouplist',
    SideBar: 'SideBar',
    UserMenuPermission: 'UserMenuPermission',

      Businesses : 'Common/BusinessList',
      ProductType : 'Common/ProductTypeList',
      Item : 'Common/ItemList',

      StockQuantity : 'Common/StockQty',
      SalesQuantity : 'Common/GetSalesQty',

      RequisitionItemNames: 'Common/RequisitionItemNames',
      UOM : 'Common/UOMList',

      DocumentStatus: 'Common/DocumentStatusList',




    },
    
    URL: {API_URL : 'https://localhost:7111/api/'}
}

