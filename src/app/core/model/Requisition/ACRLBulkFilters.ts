export interface IACRLBulkFilterOption {
  ID: number;
  Name: string;
}

export interface IACRLBulkFilters {
  Sizes: IACRLBulkFilterOption[];
  SubCategories: IACRLBulkFilterOption[];
  Grades: { ID: number; Name: string }[];
}