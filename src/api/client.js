const API_URL = import.meta.env.VITE_API_URL || '/api'

const fetchClient = async (endpoint, { method = 'GET', body, ...customConfig } = {}) => {
  const token = localStorage.getItem('freshpress_token')
  const headers = { 'Content-Type': 'application/json' }
  
  // Attach JWT token if we have one
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const config = {
    method,
    headers: { ...headers, ...customConfig.headers },
  }
  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)
  
  let data
  try {
    data = await response.json()
  } catch (err) {
    throw new Error('Server returned an invalid response')
  }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
  }
  
  return data
}

export default fetchClient
