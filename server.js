// Entry point for backend

const app = require('./app');
const { initDB } = require('./models/db');

const PORT = process.env.PORT || 5000;
initDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
