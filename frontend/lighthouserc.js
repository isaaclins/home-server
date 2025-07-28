module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      // Don't start server - let the CI handle it or run against static build
      // startServerCommand: 'cd frontend && npm start',
      // startServerReadyPattern: 'Ready on',
      // startServerReadyTimeout: 30000,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}; 
