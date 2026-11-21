declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; email: string; name: string }
    }
  }
}

export {}
