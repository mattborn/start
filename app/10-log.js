const log = (message, data) => {
  console.log({
    message,
    time: Math.floor(Date.now() / 1000),
    ...(data && { data }),
  })
}
