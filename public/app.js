// ---- Common ----
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () { menu.classList.toggle('open'); });
    document.addEventListener('click', function (e) {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) menu.classList.remove('open');
    });
  }
});

// ---- API Helper ----
async function api(url, opts) {
  var res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts && opts.headers) },
    ...opts
  });
  if (opts && opts.raw) return res;
  return res.json();
}

// ---- Homepage ----
(function initHome() {
  if (!document.querySelector('.section-categories')) return;

  var categories = [
    { icon: '&#128092;', name: 'Handbags', slug: 'handbags', desc: 'Trendy handbags for every occasion', img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80' },
    { icon: '&#128087;', name: 'Purses', slug: 'purses', desc: 'Elegant clutches and wallets', img: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80' },
    { icon: '&#128142;', name: 'Jewelry', slug: 'jewelry', desc: 'Beautiful necklaces, earrings & more', img: 'https://images.unsplash.com/photo-1515562141589-677acb0d6280?w=600&q=80' },
    { icon: '&#127911;', name: 'Toys', slug: 'toys', desc: 'Fun and safe toys for kids', img: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&q=80' }
  ];

  var grid = document.getElementById('categoriesGrid');
  if (grid) {
    grid.innerHTML = categories.map(function (c) {
      return '<div class="category-card" onclick="window.location=\'products.html?category=' + c.slug + '\'">' +
        '<div class="category-card-bg" style="background-image:url(\'' + c.img + '\')"></div>' +
        '<div class="category-card-overlay"></div>' +
        '<div class="category-card-content">' +
        '<span class="category-icon">' + c.icon + '</span>' +
        '<h3>' + c.name + '</h3>' +
        '<p>' + c.desc + '</p></div></div>';
    }).join('');
  }

  loadFeatured();
})();

async function loadFeatured() {
  var container = document.getElementById('featuredProducts');
  if (!container) return;
  try {
    var products = await api('/api/products');
    var latest = products.slice(-4).reverse();
    if (latest.length === 0) {
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888">No products yet</p>';
      return;
    }
    container.innerHTML = latest.map(function (p) {
      return renderProductCard(p);
    }).join('');
  } catch { container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888">Could not load products</p>'; }
}

// ---- Products Page ----
(function initProducts() {
  if (!document.getElementById('productsGrid')) return;
  loadProducts();
})();

var allProducts = [];

async function loadProducts() {
  var grid = document.getElementById('productsGrid');
  var empty = document.getElementById('emptyState');
  if (!grid) return;

  try {
    allProducts = await api('/api/products');
  } catch {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888">Failed to load products</p>';
    return;
  }

  if (allProducts.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  // Build filter bar
  var cats = {};
  allProducts.forEach(function (p) { if (p.category) cats[p.category] = true; });
  var filterBar = document.getElementById('filterBar');
  if (filterBar) {
    var html = '<button class="filter-btn active" data-category="all">All</button>';
    Object.keys(cats).sort().forEach(function (c) {
      var label = c.charAt(0).toUpperCase() + c.slice(1);
      html += '<button class="filter-btn" data-category="' + c + '">' + label + '</button>';
    });
    filterBar.innerHTML = html;

    filterBar.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBar.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filterProducts(btn.getAttribute('data-category'));
      });
    });
  }

  // Auto-filter from URL param
  var params = new URLSearchParams(window.location.search);
  var catParam = params.get('category');
  if (catParam && filterBar) {
    var target = filterBar.querySelector('[data-category="' + catParam + '"]');
    if (target) target.click();
  } else {
    renderProducts(allProducts);
  }

  var count = document.getElementById('productCount');
  if (count) count.textContent = allProducts.length + ' product' + (allProducts.length !== 1 ? 's' : '') + ' available';
}

function filterProducts(cat) {
  var filtered = cat === 'all' ? allProducts : allProducts.filter(function (p) { return p.category === cat; });
  renderProducts(filtered);
}

function renderProducts(products) {
  var grid = document.getElementById('productsGrid');
  var empty = document.getElementById('emptyState');
  if (!grid) return;
  if (products.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = products.map(function (p) { return renderProductCard(p); }).join('');
}

function renderProductCard(p) {
  var imgHtml;
  if (p.image) {
    imgHtml = '<img src="' + p.image + '" alt="' + escapeHtml(p.name) + '" class="product-img" loading="lazy">';
  } else {
    imgHtml = '<div class="product-img-placeholder">&#128247;</div>';
  }

  return '<div class="product-card" data-category="' + (p.category || '') + '">' +
    imgHtml +
    '<div class="product-info">' +
    '<h3 class="product-name">' + escapeHtml(p.name) + '</h3>' +
    (p.description ? '<p class="product-desc">' + escapeHtml(p.description) + '</p>' : '') +
    '<p class="product-price">&#8377;' + p.price + '</p>' +
    '<a href="order.html?item=' + encodeURIComponent(p.name) + '&price=' + p.price + '" class="btn btn-primary btn-sm">Order Now</a>' +
    '</div></div>';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return m;
  });
}

// ---- Order Page ----
(function initOrder() {
  if (!document.getElementById('orderForm')) return;
  loadOrderProducts();
  setupOrderForm();
})();

async function loadOrderProducts() {
  try {
    var products = await api('/api/products');
    var selects = document.querySelectorAll('.item-select');
    var optionsHtml = '<option value="">-- Select item --</option>';
    products.forEach(function (p) {
      optionsHtml += '<option value="' + escapeHtml(p.name) + ' (₹' + p.price + ')">' + escapeHtml(p.name) + ' (₹' + p.price + ')</option>';
    });
    selects.forEach(function (s) { s.innerHTML = optionsHtml; });

    // Auto-fill from URL params
    var params = new URLSearchParams(window.location.search);
    var itemParam = params.get('item');
    var priceParam = params.get('price');
    if (itemParam && selects[0]) {
      var targetText = decodeURIComponent(itemParam) + ' (₹' + decodeURIComponent(priceParam) + ')';
      for (var i = 0; i < selects[0].options.length; i++) {
        if (selects[0].options[i].text === targetText) {
          selects[0].value = selects[0].options[i].value;
          break;
        }
      }
    }
  } catch { /* ignore */ }
}

function addItem() {
  var container = document.getElementById('itemsContainer');
  var index = container.querySelectorAll('.order-item-row').length;
  var row = document.createElement('div');
  row.className = 'order-item-row';
  row.innerHTML =
    '<select class="item-select" data-index="' + index + '"><option value="">-- Select item --</option></select>' +
    '<input type="number" class="item-qty" data-index="' + index + '" min="1" value="1" placeholder="Qty">' +
    '<button type="button" class="btn-remove-item" onclick="removeItem(this)">&times;</button>';
  container.appendChild(row);
  // Copy options from first select
  var firstSelect = container.querySelector('.item-select');
  var newSelect = row.querySelector('.item-select');
  newSelect.innerHTML = firstSelect.innerHTML;
}

function removeItem(btn) {
  var rows = document.querySelectorAll('.order-item-row');
  if (rows.length > 1) btn.parentElement.remove();
}

function setupOrderForm() {
  document.getElementById('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('customerName').value.trim();
    var phone = document.getElementById('customerPhone').value.trim();
    var area = document.getElementById('deliveryArea').value;
    var address = document.getElementById('customerAddress').value.trim();
    var notes = document.getElementById('orderNotes').value.trim();

    if (!name || !phone || !address || !area) { alert('Please fill in all required fields.'); return; }

    var areaNames = {
      'english-bazar': 'English Bazar (Malda Town)',
      'old-malda': 'Old Malda',
      'ratua': 'Ratua',
      'manikchak': 'Manikchak',
      'kaliachak': 'Kaliachak',
      'gazole': 'Gazole',
      'chanchal': 'Chanchal',
      'harishchandrapur': 'Harishchandrapur',
      'habibpur': 'Habibpur',
      'bamangola': 'Bamangola',
      'other-malda': 'Other area in Malda district'
    };
    var areaLabel = areaNames[area] || area;

    var items = [];
    var selects = document.querySelectorAll('.item-select');
    var qtys = document.querySelectorAll('.item-qty');
    for (var i = 0; i < selects.length; i++) {
      if (selects[i].value) items.push(qtys[i].value + 'x ' + selects[i].value);
    }
    if (items.length === 0) { alert('Please select at least one item.'); return; }

    var msg = 'Hi Mou\'s Creation! I want to place an order:%0A%0A' +
      'Name: ' + encodeURIComponent(name) + '%0A' +
      'Phone: ' + encodeURIComponent(phone) + '%0A' +
      'Area: ' + encodeURIComponent(areaLabel) + '%0A' +
      'Address: ' + encodeURIComponent(address) + '%0A%0A' +
      'Items Ordered:%0A' + items.join('%0A') + '%0A%0A' +
      'Notes: ' + encodeURIComponent(notes || 'None');

    window.open('https://wa.me/917908376480?text=' + msg, '_blank');
  });
}

// ---- Admin Page ----
(function initAdmin() {
  if (!document.getElementById('loginSection')) return;
  checkAuth();
})();

async function checkAuth() {
  try {
    var res = await api('/api/check-auth');
    if (res.admin) { showAdmin(); }
  } catch { /* not logged in */ }
}

async function login() {
  var pw = document.getElementById('adminPassword').value;
  var err = document.getElementById('loginError');
  try {
    var res = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password: pw })
    });
    if (res.success) { showAdmin(); }
  } catch (e) {
    err.textContent = 'Wrong password';
    err.style.display = 'block';
  }
}

async function logout() {
  await api('/api/logout', { method: 'POST' });
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('adminSection').style.display = 'none';
}

function showAdmin() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('adminSection').style.display = 'block';
  loadAdminProducts();
  setupAdminForm();
}

// Image preview
document.addEventListener('change', function (e) {
  if (e.target && e.target.id === 'productImage') {
    var preview = document.getElementById('imagePreview');
    var file = e.target.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        preview.innerHTML = '<img src="' + ev.target.result + '" style="max-width:150px;max-height:150px;border-radius:8px;border:1px solid #ddd">';
      };
      reader.readAsDataURL(file);
    } else {
      preview.innerHTML = '';
    }
  }
});

function setupAdminForm() {
  document.getElementById('productForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var editId = document.getElementById('editId').value;
    var fd = new FormData();
    fd.append('name', document.getElementById('productName').value.trim());
    fd.append('price', document.getElementById('productPrice').value);
    fd.append('category', document.getElementById('productCategory').value);
    fd.append('description', document.getElementById('productDesc').value.trim());

    var fileInput = document.getElementById('productImage');
    if (fileInput.files[0]) fd.append('image', fileInput.files[0]);

    var url, method;
    if (editId) {
      url = '/api/admin/products/' + editId;
      method = 'PUT';
    } else {
      url = '/api/admin/products';
      method = 'POST';
    }

    try {
      var res = await fetch(url, { method: method, body: fd });
      if (!res.ok) { alert('Failed to save product'); return; }
      resetForm();
      loadAdminProducts();
    } catch { alert('Failed to save product'); }
  });
}

function cancelEdit() { resetForm(); }

function resetForm() {
  document.getElementById('editId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productDesc').value = '';
  document.getElementById('productImage').value = '';
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('formTitle').textContent = 'Add New Product';
  document.getElementById('saveBtn').textContent = 'Add Product';
  document.getElementById('cancelBtn').style.display = 'none';
}

async function loadAdminProducts() {
  var container = document.getElementById('adminProductsList');
  if (!container) return;
  try {
    var products = await api('/api/products');
    if (products.length === 0) {
      container.innerHTML = '<p style="color:#888;padding:20px;text-align:center">No products yet. Add your first product above!</p>';
      return;
    }
    container.innerHTML = products.slice().reverse().map(function (p) {
      var imgHtml = p.image
        ? '<img src="' + p.image + '" class="admin-product-img">'
        : '<div class="admin-product-img" style="display:flex;align-items:center;justify-content:center;font-size:24px;color:#ccc">&#128247;</div>';
      return '<div class="admin-product-item">' +
        imgHtml +
        '<div class="admin-product-info">' +
        '<h4>' + escapeHtml(p.name) + '</h4>' +
        '<p>' + (p.category || 'uncategorized') + ' &middot; &#8377;' + p.price + '</p>' +
        '</div>' +
        '<div class="admin-product-actions">' +
        '<button class="btn btn-secondary btn-sm" onclick="editProduct(\'' + p.id + '\')">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteProduct(\'' + p.id + '\')">Delete</button>' +
        '</div></div>';
    }).join('');
  } catch { container.innerHTML = '<p style="color:#e74c3c;padding:20px">Failed to load products</p>'; }
}

async function editProduct(id) {
  var products = await api('/api/products');
  var p = products.find(function (x) { return x.id === id; });
  if (!p) return;
  document.getElementById('editId').value = p.id;
  document.getElementById('productName').value = p.name;
  document.getElementById('productPrice').value = p.price;
  document.getElementById('productCategory').value = p.category || '';
  document.getElementById('productDesc').value = p.description || '';
  document.getElementById('formTitle').textContent = 'Edit Product';
  document.getElementById('saveBtn').textContent = 'Update Product';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  if (p.image) {
    document.getElementById('imagePreview').innerHTML = '<img src="' + p.image + '" style="max-width:150px;max-height:150px;border-radius:8px;border:1px solid #ddd">';
  }
  window.scrollTo({ top: document.getElementById('formTitle').offsetTop - 100, behavior: 'smooth' });
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await fetch('/api/admin/products/' + id, { method: 'DELETE' });
    loadAdminProducts();
  } catch { alert('Failed to delete'); }
}
