import http from 'node:http'

const PORT = process.env.PORT ?? 3000

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Hello from Vite backend!' }))
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', () => {
    server.close()
  })
  import.meta.hot.dispose(() => {
    server.close()
  })
}
