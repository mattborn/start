const CLIENT_ID = 'Ov23lihFRB0PxL15ABqk'

const getToken = async code => {
  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/github-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const { access_token } = await response.json()
  localStorage.setItem('start_token', access_token)
  log('Auth with GitHub')
  return access_token
}

const getProfile = async token => {
  const profile = localStorage.getItem('start_profile')
  if (profile) {
    const parsed = JSON.parse(profile)
    log('Reusing profile', parsed)
    return parsed
  }

  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json()
  const { avatar_url, bio, blog, company, location, login, name, public_repos, updated_at } = data
  const result = { avatar_url, bio, blog, company, location, login, name, public_repos, updated_at }

  localStorage.setItem('start_profile', JSON.stringify(result))
  log('GitHub profile', result)
  return result
}

;(async () => {
  const code = new URLSearchParams(window.location.search).get('code')
  if (code) {
    window.history.replaceState({}, document.title, window.location.pathname)
    const token = await getToken(code)
    await getProfile(token)
    return
  }

  const token = localStorage.getItem('start_token')
  if (!token) window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo`
  else {
    log('Reusing token')
    await getProfile(token)
  }
})()
