const LOCALSTORAGE_LOGIN_KEY = 'swLoginParams'

export const setLoginParams = params => {
  localStorage.setItem(LOCALSTORAGE_LOGIN_KEY, JSON.stringify(params))
}

export const getLoginParams = () => {
  let params = {}
  try {
    params = JSON.parse(localStorage.getItem(LOCALSTORAGE_LOGIN_KEY)) || {}
  } catch (error) {}

  return params
}
