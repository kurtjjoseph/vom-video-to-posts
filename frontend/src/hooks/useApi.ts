import { useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import ApiClient from '../services/api';

let apiClient: ApiClient | null = null;

export function useApi() {
  const { getToken } = useAuth();
  const [api, setApi] = useState<ApiClient | null>(null);

  useEffect(() => {
    const initApi = async () => {
      try {
        const token = await getToken();
        if (token) {
          if (!apiClient) {
            apiClient = new ApiClient(token);
          } else {
            apiClient.setToken(token);
          }
          setApi(apiClient);
        }
      } catch (error) {
        console.error('Failed to initialize API:', error);
      }
    };

    initApi();
  }, [getToken]);

  return api;
}
