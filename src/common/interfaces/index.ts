export type PaginatedResults<T> = {
  data: T[];
  pagination: {
    totalRecords: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};
