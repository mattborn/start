require('dotenv').config()
const axios = require('axios')
const { execSync } = require('child_process')

const getRepos = async token => {
  const { data } = await axios.get('https://api.github.com/repos/mattborn/start/contents/repos.json', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  const { repos } = JSON.parse(Buffer.from(data.content, 'base64').toString())
  return repos.filter(repo => repo.name !== 'start')
}

const isSubmodule = repo => {
  try {
    const output = execSync('git submodule status', { encoding: 'utf8' })
    return output.includes(`/${repo.name}`)
  } catch (error) {
    return false
  }
}

const removeSubmodule = repo => {
  try {
    const [owner] = repo.full_name.split('/')
    const path = `${owner}/${repo.name}`
    console.log(`Removing ${repo.name}...`)
    execSync(`git submodule deinit -f ${path}`, { stdio: 'inherit' })
    execSync(`git rm -f ${path}`, { stdio: 'inherit' })
    execSync(`rm -rf .git/modules/${path}`, { stdio: 'inherit' })
    console.log(`✓ Removed ${repo.name}`)
  } catch (error) {
    console.error(`× Failed to remove ${repo.name}:`, error.message)
  }
}

const addSubmodule = repo => {
  try {
    const [owner] = repo.full_name.split('/')
    execSync(`mkdir -p ${owner}`)
    execSync(`git submodule add https://github.com/${repo.full_name}.git ${owner}/${repo.name}`, { stdio: 'inherit' })
    console.log(`✓ Added ${repo.name}`)
  } catch (error) {
    console.error(`× Failed to add ${repo.name}:`, error.message)
  }
}

;(async () => {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not found')

  const repos = await getRepos(token)

  for (const repo of repos) {
    const exists = isSubmodule(repo)

    if (exists && !repo.local) {
      // Remove submodule if it exists but shouldn't
      removeSubmodule(repo)
    } else if (!exists && repo.local) {
      // Add submodule if it doesn't exist but should
      addSubmodule(repo)
    }
  }
})()
