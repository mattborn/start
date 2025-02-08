const getRepos = async (token, forceRefresh = false) => {
  const pullCache = localStorage.getItem('start_pull')
  if (pullCache && !forceRefresh) {
    const repos = JSON.parse(pullCache)
    log('Reusing repos', { count: repos.filter(r => r.local).length })
    return repos
  }

  const response = await fetch('https://api.github.com/repos/mattborn/start/contents/repos.json', {
    headers: { Authorization: `Bearer ${token}` },
  })

  const { content, sha } = await response.json()
  const { repos } = JSON.parse(Base64.decode(content))
  repos.sort((a, b) => a.name.localeCompare(b.name))

  localStorage.setItem('start_pull', JSON.stringify(repos))
  localStorage.setItem('start_sha', sha)
  log('Pulled fresh repos')
  return repos
}

const filterChanges = (pushCache, pullCache) => {
  const changes = {
    added: pushCache.filter(r => !pullCache.find(p => p.name === r.name)).length,
    removed: pullCache.filter(r => !pushCache.find(p => p.name === r.name)).length,
    changed: pushCache.filter(r => {
      const old = pullCache.find(p => p.name === r.name)
      return old && JSON.stringify(r) !== JSON.stringify(old)
    }).length,
  }
  return changes
}

const updateStatus = () => {
  const pullCache = JSON.parse(localStorage.getItem('start_pull'))
  const pushCache = JSON.parse(localStorage.getItem('start_push'))

  const changes = filterChanges(pushCache, pullCache)
  console.log('Pending changes:', changes)

  const numChanges = changes.added + changes.changed + changes.removed
  pushButton.textContent = numChanges ? `Push ${numChanges} changes` : 'No unsaved changes'
  pushButton.disabled = !numChanges
}

let fetchButton, pushButton

const normalizeRepo = repo => {
  const keys = [
    'created_at',
    'description',
    'fork',
    'full_name',
    'id',
    'local',
    'name',
    'pushed_at',
    'size',
    'updated_at',
  ]
  return Object.fromEntries(keys.map(key => [key, key === 'local' ? repo[key] || false : repo[key]]))
}

const fetchRepos = async token => {
  try {
    const userResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const userRepos = await userResponse.json()

    const orgs = [
      'cpqpro',
      'designreborn',
      'mattmeg',
      'meetbigfoot',
      'metalytics-dev',
      'migmatt',
      'moonadesign',
      'palmvader',
      'withforco',
    ]
    let orgRepos = []

    for (const org of orgs) {
      const orgResponse = await fetch(
        `https://api.github.com/orgs/${org}/repos?per_page=100&sort=updated&direction=desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      const repos = await orgResponse.json()
      orgRepos = [...orgRepos, ...repos]
    }

    const allRepos = [...userRepos, ...orgRepos]
    const newRepos = allRepos.map(normalizeRepo)

    const pullCache = JSON.parse(localStorage.getItem('start_pull') || '[]')
    const newNames = newRepos.filter(r => !pullCache.find(p => p.name === r.name)).map(r => r.name)

    if (newNames.length) {
      const pushCache = JSON.parse(localStorage.getItem('start_push') || '[]')
      const merged = [
        ...pushCache,
        ...newRepos.filter(r => newNames.includes(r.name)).filter(r => !pushCache.find(p => p.name === r.name)),
      ]
      localStorage.setItem('start_push', JSON.stringify(merged.sort((a, b) => a.name.localeCompare(b.name))))
      updateStatus()
      log('Added new repos:', newNames)
    } else {
      log('No new repos found')
    }
  } catch (error) {
    console.error('Error fetching repos:', error)
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('start_token')
  if (!token) return

  fetchButton = document.createElement('button')
  fetchButton.textContent = 'Fetch repos'
  fetchButton.onclick = () => fetchRepos(token)
  document.body.appendChild(fetchButton)

  const repos = await getRepos(token)

  // Initialize push cache if it doesn't exist
  let pushCache = localStorage.getItem('start_push')
  if (!pushCache) {
    repos.forEach(repo => {
      repo.local = repo.rootFiles?.includes('ABOUT.json') || false
    })
    localStorage.setItem('start_push', JSON.stringify(repos.sort((a, b) => a.name.localeCompare(b.name))))
    pushCache = JSON.stringify(repos)
  }

  const pullButton = document.createElement('button')
  pullButton.textContent = 'Pull repos'
  pullButton.onclick = () => getRepos(token, true)
  document.body.appendChild(pullButton)

  pushButton = document.createElement('button')
  pushButton.onclick = async () => {
    const pushCache = JSON.parse(localStorage.getItem('start_push'))
    const pullCache = JSON.parse(localStorage.getItem('start_pull'))
    const sha = localStorage.getItem('start_sha')

    const changes = filterChanges(pushCache, pullCache)
    const payload = {
      changes,
      repos: pushCache,
      total: pushCache.length,
      updated: Date.now(),
    }

    const response = await fetch('https://api.github.com/repos/mattborn/start/contents/repos.json', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Update repos.json: +${changes.added} -${changes.removed} ~${changes.changed}`,
        content: Base64.encode(JSON.stringify(payload, null, 2)) + '\n',
        sha,
      }),
    })

    if (response.ok) {
      const commit = await response.json()
      log('Pushed changes', { commit: commit.commit.message })

      localStorage.setItem('start_pull', localStorage.getItem('start_push'))
      localStorage.setItem('start_sha', commit.content.sha)

      pushButton.textContent = 'No unsaved changes'
      pushButton.disabled = true
    }
  }

  updateStatus()
  document.body.appendChild(pushButton)

  // Use push cache for display
  const displayRepos = [...JSON.parse(pushCache)].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  displayRepos.forEach(repo => {
    const div = document.createElement('div')

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    const isStart = repo.name === 'start'
    checkbox.checked = isStart || repo.local
    checkbox.disabled = isStart
    checkbox.onchange = () => {
      repo.local = checkbox.checked
      const pushCache = JSON.parse(localStorage.getItem('start_push'))
      pushCache.find(r => r.name === repo.name).local = checkbox.checked
      localStorage.setItem('start_push', JSON.stringify(pushCache.sort((a, b) => a.name.localeCompare(b.name))))
      updateStatus()
    }
    div.appendChild(checkbox)

    const link = document.createElement('a')
    const isLocal = window.location.hostname === 'localhost'
    const [owner, name] = repo.full_name.split('/')
    link.href =
      isLocal && repo.local
        ? `/${owner}/${repo.name}` // Nested local submodule path
        : repo.local
        ? `https://${owner}.github.io/${name}` // GitHub Pages
        : `https://github.com/${repo.full_name}` // GitHub repo
    link.textContent = repo.full_name
    div.appendChild(link)

    document.body.appendChild(div)
  })
})
