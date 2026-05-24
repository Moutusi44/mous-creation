const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'products.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mous123';

// Ensure data directories exist
[DATA_DIR, UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'mous-creation-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// Helpers
function readProducts() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch { return []; }
}

function writeProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

function isAdmin(req) {
  return req.session && req.session.admin === true;
}

// Auth middleware
app.use('/api/admin/*', (req, res, next) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// Auth routes
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Wrong password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.json({ admin: isAdmin(req) });
});

// Public: get all products
app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

// Admin: add product
app.post('/api/admin/products', upload.single('image'), (req, res) => {
  const { name, price, category, description } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

  const products = readProducts();
  const product = {
    id: uuidv4(),
    name,
    price: parseFloat(price),
    category: category || 'uncategorized',
    description: description || '',
    image: req.file ? '/uploads/' + req.file.filename : null,
    createdAt: new Date().toISOString()
  };
  products.push(product);
  writeProducts(products);
  res.json(product);
});

// Admin: update product
app.put('/api/admin/products/:id', upload.single('image'), (req, res) => {
  const products = readProducts();
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { name, price, category, description } = req.body;
  if (name) products[idx].name = name;
  if (price) products[idx].price = parseFloat(price);
  if (category) products[idx].category = category;
  if (description !== undefined) products[idx].description = description;
  if (req.file) {
    if (products[idx].image) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(products[idx].image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    products[idx].image = '/uploads/' + req.file.filename;
  }
  writeProducts(products);
  res.json(products[idx]);
});

// Admin: delete product
app.delete('/api/admin/products/:id', (req, res) => {
  let products = readProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  if (product.image) {
    const imgPath = path.join(UPLOADS_DIR, path.basename(product.image));
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  products = products.filter(p => p.id !== req.params.id);
  writeProducts(products);
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mou's Creation running at http://0.0.0.0:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`Data dir: ${DATA_DIR}`);
  console.log(`Uploads dir: ${UPLOADS_DIR}`);
});
