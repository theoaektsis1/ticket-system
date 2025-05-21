const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Serve static files from ticket-system directory
app.use(express.static(path.join(__dirname, '..', 'ticket-system')));
// Serve root index.html
app.use(express.static(path.join(__dirname, '..')));
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const JWT_SECRET = 'your_jwt_secret_here'; // Change this in production

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Load or initialize users
let users = [];
if (fs.existsSync(USERS_FILE)) {
  users = JSON.parse(fs.readFileSync(USERS_FILE));
} else {
  users = [];
}

// Load or initialize tickets
let tickets = [];
if (fs.existsSync(TICKETS_FILE)) {
  tickets = JSON.parse(fs.readFileSync(TICKETS_FILE));
} else {
  tickets = [];
}

// Save users to file
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Save tickets to file
function saveTickets() {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

// Create default accounts if not exist
async function createDefaultAccounts() {
  const defaultUsers = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'employee1', password: 'employee123', role: 'employee' },
    { username: 'employee2', password: 'employee123', role: 'employee' },
    { username: 'employee3', password: 'employee123', role: 'employee' },
  ];

  for (const user of defaultUsers) {
    if (!users.find(u => u.username === user.username)) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      users.push({ username: user.username, password: hashedPassword, role: user.role });
    }
  }
  saveUsers();
}

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Register endpoint for customers
app.post('/register', async (req, res) => {
  console.log('Received registration request:', {
    headers: req.headers,
    body: { ...req.body, password: '[REDACTED]' }
  });
  
  try {
    const { username, password, companyName } = req.body;
    
    if (!username || !password || !companyName) {
      console.log('Registration failed: Missing required fields');
      return res.status(400).json({ error: 'Username, password and company name are required' });
    }
    
    if (users.find(u => u.username === username)) {
      console.log('Registration failed: Username already exists:', username);
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword, role: 'customer', companyName };
    users.push(newUser);
    
    try {
      saveUsers();
      console.log('Registration successful for user:', username);
      res.json({ message: 'Registration successful' });
    } catch (saveError) {
      console.error('Error saving users:', saveError);
      res.status(500).json({ error: 'Failed to save user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: 'Invalid username or password' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid username or password' });

  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token, role: user.role });
});

// Get tickets endpoint
app.get('/tickets', authenticateToken, (req, res) => {
  const user = req.user;
  if (user.role === 'admin') {
    return res.json(tickets);
  } else if (user.role === 'employee') {
    return res.json(tickets);
  } else {
    // customer: only their tickets
    const userTickets = tickets.filter(t => t.username === user.username);
    return res.json(userTickets);
  }
});

// Create ticket endpoint
app.post('/tickets', authenticateToken, (req, res) => {
  const user = req.user;
  if (user.role !== 'customer') {
    return res.status(403).json({ error: 'Only customers can create tickets' });
  }
  const { subject, category, priority, description } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required' });
  }
  const newTicket = {
    id: Date.now(),
    username: user.username,
    subject,
    category,
    priority,
    description,
    status: 'New',
    assignedTo: null,
    comments: [],
    createdAt: new Date().toISOString(),
  };
  tickets.push(newTicket);
  saveTickets();
  res.json({ message: 'Ticket created', ticket: newTicket });
});

// Update ticket endpoint (for employees/admin)
app.put('/tickets/:id', authenticateToken, (req, res) => {
  const user = req.user;
  console.log(`Update ticket request by user: ${user.username}, role: ${user.role}`);
  console.log('Request body:', req.body);

  if (user.role !== 'admin' && user.role !== 'employee') {
    console.log('Forbidden: user role not allowed to update tickets');
    return res.status(403).json({ error: 'Forbidden' });
  }
  const ticketId = parseInt(req.params.id);
  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) {
    console.log('Ticket not found:', ticketId);
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { status, priority, description, assignedTo, comment } = req.body;
  console.log(`Current assignedTo: ${ticket.assignedTo}, New assignedTo: ${assignedTo}`);
  
  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (description) ticket.description = description;
  if (assignedTo) {
    // Normalize usernames to lowercase for comparison
    const normalizedAssignedTo = assignedTo.toLowerCase();
    const normalizedCurrent = ticket.assignedTo ? ticket.assignedTo.toLowerCase() : null;
    
    // Only update if the assignment is actually changing
    if (normalizedAssignedTo !== normalizedCurrent) {
      ticket.assignedTo = assignedTo;
      console.log(`Updated assignedTo from ${ticket.assignedTo} to ${assignedTo}`);
    }
  }
  if (comment) {
    if (!ticket.comments) ticket.comments = [];
    ticket.comments.push({
      author: user.username,
      text: comment,
      timestamp: new Date().toISOString(),
    });
  }

  saveTickets();
  res.json({ message: 'Ticket updated', ticket });
});

// Ticket reassignment endpoint (admin only)
app.put('/tickets/:id/reassign', authenticateToken, (req, res) => {
  const user = req.user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can reassign tickets' });
  }

  const ticketId = parseInt(req.params.id);
  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { assignedTo } = req.body;
  if (assignedTo === undefined) {
    return res.status(400).json({ error: 'New assignee is required' });
  }

  // Check if assignment is actually changing
  const normalizedAssignedTo = assignedTo ? assignedTo.toLowerCase() : null;
  const normalizedCurrent = ticket.assignedTo ? ticket.assignedTo.toLowerCase() : null;
  
  if (normalizedAssignedTo !== normalizedCurrent) {
    ticket.assignedTo = assignedTo;
    ticket.status = assignedTo ? 'In Progress' : 'Open';
    
    ticket.comments.push({
      author: user.username,
      text: `Ticket reassigned to ${assignedTo || 'unassigned'}`,
      timestamp: new Date().toISOString()
    });

    saveTickets();
  }

  res.json({ message: 'Ticket reassigned', ticket });
});

// Start server and create default accounts
createDefaultAccounts().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
  });
});
