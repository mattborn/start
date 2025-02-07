require('dotenv').config()
const axios = require('axios')
const { execSync } = require('child_process')

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

const getRepos = async token => {
  const { data } = await axios.get('https://api.github.com/repos/mattborn/start/contents/repos.json', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  const { repos } = JSON.parse(Buffer.from(data.content, 'base64').toString())
  return repos.filter(repo => repo.name !== 'start').sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
}

const isSubmodule = repo => {
  try {
    const output = execSync('git submodule status', { encoding: 'utf8' })
    return output.includes(`/${repo.name}`)
  } catch (error) {
    return false
  }
}

;(async () => {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not found')

  const repos = await getRepos(token)
  for (const repo of repos) {
    const exists = isSubmodule(repo)
    if (!exists && !repo.local) continue

    if (exists && !repo.local) {
      console.log(`${repo.name} ${RED}×${RESET} Remove submodule`)
    } else if (!exists && repo.local) {
      console.log(`${repo.name} ${RED}×${RESET} Missing submodule`)
    } else if (exists && repo.local) {
      console.log(`${repo.name} ${GREEN}✓${RESET}`)
    }
  }
})()
