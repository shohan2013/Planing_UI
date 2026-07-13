export interface FilterState {
  [column: string]: any;
}

export interface ServerQueryRequest {
  page: number;
  pageSize: number;
  sortBy?: string | null;
  sortOrder?: 'asc' | 'desc' | null;
  globalSearch?: string;
  filters?: FilterState;
}

export interface ServerQueryResponse<T> {
  Data: T[];
  Total: number;
  Page: number;
  PageSize: number;
  TotalPages: number;
}
