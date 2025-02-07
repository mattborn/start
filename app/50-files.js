// const getRootFiles = async (token, repo) => {
//   if (repo.rootFiles) return repo.rootFiles

//   const response = await fetch(`https://api.github.com/repos/${repo.full_name}/contents`, {
//     headers: { Authorization: `Bearer ${token}` },
//   })
//   if (!response.ok) return []
//   const contents = await response.json()
//   return contents
//     .filter(item => item.type === 'file')
//     .map(item => item.name)
//     .sort()
// }

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('github_token')
  if (!token) return

  const cached = localStorage.getItem('start_repos')
  if (!cached) return

  const repos = JSON.parse(cached)
  const needsFiles = repos.filter(repo => !repo.rootFiles)
  if (!needsFiles.length) log('All repos have root files')
  else log('Some repos need root files')

  // log('Fetching missing root files…')
  // for (const repo of needsFiles) {
  //   repo.rootFiles = await getRootFiles(token, repo)
  // }

  // localStorage.setItem('start_repos', JSON.stringify(repos))
  // log('Added missing root files', { preview: repos[0].rootFiles })
})
