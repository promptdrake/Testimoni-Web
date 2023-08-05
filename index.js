const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const sqlite3 = require('sqlite3').verbose();
const io = new Server(server);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');
const db = new sqlite3.Database('comments.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('[DATABASE] Connected to comments.sqlite ✅');
    db.run('CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY, username TEXT, comment TEXT, likes INTEGER DEFAULT 0, dislikes INTEGER DEFAULT 0)');
  }
});
app.get('/', (req, res) => {
  const info = req.query.status;
  db.all('SELECT * FROM comments', (err, rows) => {
    if (err) {
      console.error('Error fetching comments:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.render('index', { comments: rows, info });
    }
  });
});

app.post('/submit', (req, res) => {
  const { username, comment } = req.body;
  // Save the comment to the database
  db.run('INSERT INTO comments (username, comment) VALUES (?, ?)', [username, comment], (err) => {
    if (err) {
      console.error('Error saving comment:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      db.all('SELECT * FROM comments', (err, rows) => {
        if (err) {
          console.error('Error fetching comments:', err.message);
        } else {
          io.emit('commentsUpdated', rows);
        }
      });
      res.redirect('/');
    }
  });
});

app.post('/dislike', (req, res) => {
  const { commentId } = req.body;

  // Update the dislikes count in the database
  db.run('UPDATE comments SET dislikes = dislikes + 1 WHERE id = ?', [commentId], (err) => {
    if (err) {
      console.error('Error updating dislikes count:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      // Send the updated dislikes count as the response
      db.get('SELECT dislikes FROM comments WHERE id = ?', [commentId], (err, row) => {
        if (err) {
          console.error('Error fetching dislikes count:', err.message);
          res.status(500).send('Internal Server Error');
        } else {
          res.json({ dislikes: row.dislikes });
        }
      });
    }
  });
});

app.post('/like', (req, res) => {
  const { commentId } = req.body;

  // Update the likes count in the database
  db.run('UPDATE comments SET likes = likes + 1 WHERE id = ?', [commentId], (err) => {
    if (err) {
      console.error('Error updating likes count:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      db.get('SELECT likes FROM comments WHERE id = ?', [commentId], (err, row) => {
        if (err) {
          console.error('Error fetching likes count:', err.message);
          res.status(500).send('Internal Server Error');
        } else {
          res.json({ likes: row.likes });
        }
      });
    }
  });
});
io.on('connection', (socket) => {
  console.log('[CLIENT] + Joined session');
  socket.on('disconnect', () => {
    console.log('[CLIENT] - Leaving session');
  });
});
server.listen(3000, () => {
  console.log('aisbir@cli~: Server Ready');
});