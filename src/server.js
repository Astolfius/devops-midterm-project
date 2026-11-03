const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🩺 Health check available at: http://localhost:${PORT}/health`);
  console.log(`📊 Dashboard available at: http://localhost:${PORT}/status`);
});

module.exports = server;
