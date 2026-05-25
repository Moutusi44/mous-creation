const express = require('express');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mous123';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'mous-creation-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for image uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// Helpers
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
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Admin: add product
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  const { name, price, category, description } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

  try {
    let image = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${uuidv4()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype
        });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      image = publicUrl;
    }

    const product = {
      id: uuidv4(),
      name,
      price: parseFloat(price),
      category: category || 'uncategorized',
      description: description || '',
      image,
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('products')
      .insert(product);
    if (insertError) throw insertError;

    res.json(product);
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Admin: update product
app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id);
    if (fetchError) throw fetchError;
    if (!products || products.length === 0) return res.status(404).json({ error: 'Not found' });

    const existing = products[0];
    const updates = {};

    if (req.body.name) updates.name = req.body.name;
    if (req.body.price) updates.price = parseFloat(req.body.price);
    if (req.body.category) updates.category = req.body.category;
    if (req.body.description !== undefined) updates.description = req.body.description;

    if (req.file) {
      if (existing.image) {
        const oldFileName = path.basename(new URL(existing.image).pathname);
        await supabase.storage.from('product-images').remove([oldFileName]);
      }
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${uuidv4()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype
        });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      updates.image = publicUrl;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id);
    if (updateError) throw updateError;

    const { data: updated } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Admin: delete product
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id);
    if (fetchError) throw fetchError;
    if (!products || products.length === 0) return res.status(404).json({ error: 'Not found' });

    const product = products[0];
    if (product.image) {
      const fileName = path.basename(new URL(product.image).pathname);
      await supabase.storage.from('product-images').remove([fileName]);
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);
    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mou's Creation running at http://0.0.0.0:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
