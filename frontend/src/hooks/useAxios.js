import { useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const useAxios = () => {
  const { token, logout, updateToken } = useAuth();

  return useMemo(() => {
    const axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '',
      withCredentials: true,
    });

    axiosInstance.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest?._retried && !originalRequest?.url?.includes('/auth/refresh')) {
          originalRequest._retried = true;
          try {
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/refresh`, {}, { withCredentials: true });
            const nextToken = response.data?.data?.token;
            updateToken(nextToken);
            originalRequest.headers.Authorization = `Bearer ${nextToken}`;
            return axiosInstance(originalRequest);
          } catch {
            await logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return axiosInstance;
  }, [token, logout, updateToken]);
};

export default useAxios;
