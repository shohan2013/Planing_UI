export const GlobalConstant={
    API_END_POINTS: 
    {
      LOGIN: 'Login/Login',
      LOGOUT: 'Logout/Logout',

      PermissionByEnroll: 'Permission/menupermission',
      PermissionByType: 'Permission/permissionbytype',

/*===========================MENU===================================== */
      Menu:'Menu',
      getMenuById:'Menu/menu',
      addMenu:'Menu',
      updateMenu:'Menu',
      deleteMenu:'Menu',
      
/*===========================SUB MENU===================================== */
      SubMenu:'SubMenu',
      getSubMenuById:'SubMenu/submenu',
      addSubMenu:'SubMenu',
      updateSubMenu:'SubMenu',
      deleteSubMenu:'SubMenu',

/*===========================MATRIX===================================== */
      ApproveMatrix:'ApproveMatrix',
      ProvideApproveMatrix:'ApproveMatrix/approvematrixpermissionbytype',
      
      ApproveMatrixGroup:'ApprovalMatrixGroup',

/*===========================REQUISITION===================================== */  
      addRequisition : 'Requisition/save',
      getRequisition: 'Requisition',
      
/*===========================COMMON===================================== */  
      Common:'Common',
      modules:'Common/modules',
      menus:'Common/menus',
      approvalgroups:'Common/approvalgroups',
      units:'Common/units',
      priority:'Common/priorities',
      SubMenuList:'Common/submenus',
      EnrollList:'Common/enrolllist',
      ApproveMatrixGroupTypeList:'Common/approvalmatrixgrouplist',
      SideBar: 'SideBar',
      UserMenuPermission: 'UserMenuPermission',

      Businesses : "Common/BusinessList",
      ProductType : "Common/ProductTypeList",
      Item : "Common/ItemList",
      RequisitionItemNames: 'Common/RequisitionItemNames',
      UOM : "Common/UOMList",




    },
    
    URL: {API_URL : 'https://localhost:7111/api/'}
}

