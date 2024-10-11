import Cookies from "js-cookie";
import axios, {
  AxiosRequestConfig,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

import { LocalStorageKeysConstant, SessionStorageKeys } from "constants/index";
import { SessionStorage } from "util/session-storage";
import { LocalStorage } from "util/local-storage";

enum ApiScope {
  PUBLIC = "public",
  PRIVATE = "private",
}

export type JsonResponse<T> = {
  code: string;
  data: T;
  message: string;
};

export default class BaseApi {
  private getAxiosInstance(options = {}): AxiosInstance {
    // const defaultOptions = {
    // 	timeout: 10000,
    // };
    const axiosInstance = axios.create({ ...options });
    return axiosInstance;
  }

  private setInterceptorRequest(axiosInstance: AxiosInstance, type: ApiScope): AxiosInstance {
    const onFulfilled = (config: InternalAxiosRequestConfig) => {
      if (type === ApiScope.PRIVATE) {
        let token: string | null;
        if (typeof window !== "undefined") {
          token = LocalStorage.getItem(LocalStorageKeysConstant.ACCESS_TOKEN);
        }
        if (token) {
          config.headers.Authorization = "Bearer " + token;
        }
      }
      return config;
    };

    const onRejected = (error: any) => {
      return Promise.reject(error);
    };

    axiosInstance.interceptors.request.use(onFulfilled, onRejected);
    return axiosInstance;
  }

  private setInterceptorResponse(axiosInstance: AxiosInstance, type: ApiScope) {
    const onFulfilled = (res: AxiosResponse<any>) => {
      return res;
    };

    const onRejected = async (error: any) => {
      if (type === ApiScope.PRIVATE) {
        const originalConfig = error.config;

        if (originalConfig.url !== "/login" && error.response) {
          if (error.response.status === 401 && !originalConfig._retry) {
            originalConfig._retry = true;
            LocalStorage.removeItem(LocalStorageKeysConstant.ACCESS_TOKEN);
            Cookies.remove("token", { domain: ".ssi.com.vn" });
            Cookies.remove(SessionStorageKeys.IS_FIRST_LOGIN);
            window.location.href = "/login";
          }
        }
      }

      return Promise.reject(error);
    };

    axiosInstance.interceptors.response.use(onFulfilled, onRejected);
    return axiosInstance;
  }

  public publicRequest(options: AxiosRequestConfig = {}) {
    let axiosInstance = this.getAxiosInstance(options);
    axiosInstance = this.setInterceptorRequest(axiosInstance, ApiScope.PUBLIC);
    axiosInstance = this.setInterceptorResponse(axiosInstance, ApiScope.PUBLIC);
    return axiosInstance;
  }

  public privateRequest(options: AxiosRequestConfig = {}) {
    let axiosInstance = this.getAxiosInstance(options);
    axiosInstance = this.setInterceptorRequest(axiosInstance, ApiScope.PRIVATE);
    axiosInstance = this.setInterceptorResponse(axiosInstance, ApiScope.PRIVATE);
    return axiosInstance;
  }
}
