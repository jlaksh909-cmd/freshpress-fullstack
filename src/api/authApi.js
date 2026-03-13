import fetchClient from './client'

export const login = async (email, password) => {
  return await fetchClient('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export const register = async (name, email, password, phone = '') => {
  return await fetchClient('/auth/register', {
    method: 'POST',
    body: { name, email, password, phone },
  })
}

export const getMe = async () => {
  return await fetchClient('/auth/me')
}

export const logout = () => {
  localStorage.removeItem('freshpress_token')
  localStorage.removeItem('freshpress_user')
}
