import { MergedPlanning } from 'src/app/pages/merged-planning/merged-planning';

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
    getRequisitionLines: 'Requisition/GetLinesByReqId',
    updateRequisition: 'Requisition/update',
    deleteRequisition: 'Requisition/Delete',

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
    Businesses: 'Common/BusinessList',
    ProductType: 'Common/ProductTypeList',
    Item: 'Common/ItemList',
    StockQuantity: 'Common/StockQty',
    SalesQuantity: 'Common/GetSalesQty',
    RequisitionItemNames: 'Common/RequisitionItemNames',
    UOM: 'Common/UOMList',
    DocumentStatus: 'Common/DocumentStatusList',
    ProductionStepsForPlanning: 'Common/GetBusinessConfigure',
    Machine: 'Common/GetMachine',
    Recipe: 'Common/GetRecipe',

    /*==============================PLANNING====================================*/
    DeliveryOrders: 'SalesOrderLanding/GetDOData',
    DeliveryOrderLine: 'SalesOrderLanding/GetDOLineData',
    MergeDOs: 'MergeDeliveryOrder/MergeDOs',
    MergedPlanning: 'MergedPlanning/GetAllData',
    MergedPlanningDetails: 'MergedPlanning/GetDataById',
    SavePlans: 'MergedPlanning/AddProductionPlan',
  },

  URL: { API_URL: 'https://localhost:7111/api/' },
};
