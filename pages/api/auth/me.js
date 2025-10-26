const { verifyToken, getUserById } = require('../../../src/lib/auth')

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies?.token

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const user = getUserById(decoded.userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  return res.status(200).json({
    success: true,
    user
  })
}
