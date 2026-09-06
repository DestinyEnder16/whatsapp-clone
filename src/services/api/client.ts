import createClient from 'openapi-fetch';

import { paths } from './schema';

export const api = createClient<paths>({
    baseUrl: process.env.EXPO_PUBLIC_API_URL
});