export interface IApiResponse {
  Code: string;
  Status: boolean;
  Message: string;
  ResponseTime: Date;
}



export interface IApiResponseWithData<T> extends IApiResponse {
  Data: T | null;
}