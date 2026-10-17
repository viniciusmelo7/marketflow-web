import axios from 'axios'
import { getToken } from './sessionService'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (!config.headers.has('Authorization')) {
    const token = getToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})

export default api
