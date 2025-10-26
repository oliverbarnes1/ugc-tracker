const { authenticateUser, generateToken } = require('../../../src/lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await authenticateUser(email, password)
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken(user)

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`)

    return res.status(200).json({
      success: true,
      user,
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
