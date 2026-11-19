/* Client-side demonstration only: accounts and inventory live in this browser. */
(() => {
  const ADMIN_EMAIL = 'admin@ksheeramruthdairy.local';
  const LEGACY_ADMIN_EMAIL = 'admin@milkfarm.local';
  const ADMIN_PASSWORD = 'FarmAdmin2026!';
  const DEFAULT_PRODUCTS = [
    { id: 'whole-milk', name: 'Farm Fresh Milk', unit: '1 litre', price: 60, quantity: 80, image: 'all-milk-img.png', description: 'Fresh, creamy whole milk from our farm.' },
    { id: 'low-fat-milk', name: 'Low Fat Milk', unit: '1 litre', price: 55, quantity: 50, image: 'skim milk.jpg', description: 'A lighter everyday milk, full of goodness.' },
    { id: 'flavoured-milk', name: 'Specialty Milk', unit: '500 ml', price: 40, quantity: 35, image: 'other milk.jpg', description: 'A delicious choice for a refreshing treat.' },
    { id: 'fresh-curd', name: 'Farm Fresh Curd', unit: '500 g', price: 45, quantity: 60, image: 'all curd img.png', description: 'Thick, smooth curd made fresh on the farm.' }
  ];
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const inventory = () => read('milkFarmInventory', DEFAULT_PRODUCTS);
  const currentUser = () => read('milkFarmUser', null);
  const isAdmin = () => [ADMIN_EMAIL, LEGACY_ADMIN_EMAIL].includes(currentUser());
  const notice = (form, message, error = false) => {
    let output = form.querySelector('[role="status"]');
    if (!output) { output = document.createElement('p'); output.setAttribute('role', 'status'); form.append(output); }
    output.textContent = message;
    output.style.cssText = `padding:12px;border-radius:8px;font-weight:600;color:${error ? '#8c3228' : '#176b35'};background:${error ? '#fff1ef' : '#eff6eb'}`;
  };

  const loginForm = document.querySelector('[data-flow="login"]');
  if (loginForm) loginForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const data = Object.fromEntries(new FormData(loginForm).entries());
    const email = data.email.trim().toLowerCase();
    if ([ADMIN_EMAIL, LEGACY_ADMIN_EMAIL].includes(email) && data.password === ADMIN_PASSWORD) {
      save('milkFarmUser', ADMIN_EMAIL);
      location.href = '../store/index.html';
      return;
    }
    const account = read('milkFarmAccounts', {})[email];
    const password = typeof account === 'string' ? account : account?.password;
    if (password !== data.password) return notice(loginForm, 'Email or password is incorrect. Check your details or create an account.', true);
    save('milkFarmUser', email);
    location.href = '../store/index.html';
  });

  const signupForm = document.querySelector('[data-flow="signup"]');
  if (signupForm) signupForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!signupForm.reportValidity()) return;
    const data = Object.fromEntries(new FormData(signupForm).entries());
    if (data.password !== data.confirm) return notice(signupForm, 'Passwords do not match.', true);
    const accounts = read('milkFarmAccounts', {});
    const email = data.email.trim().toLowerCase();
    if ([ADMIN_EMAIL, LEGACY_ADMIN_EMAIL].includes(email) || accounts[email]) return notice(signupForm, 'An account with this email already exists.', true);
    accounts[email] = { password: data.password, name: data.name, mobile: data.mobile, address: data.address, createdAt: new Date().toISOString() };
    save('milkFarmAccounts', accounts); save('milkFarmUser', email);
    location.href = '../store/index.html';
  });

  const productList = document.querySelector('#product-list');
  const accountLink = document.querySelector('#account-link');
  const adminLink = document.querySelector('#admin-nav-item');
  if (currentUser() && accountLink) {
    if (isAdmin()) {
      accountLink.href = productList ? '../admin/index.html' : document.querySelector('#home') ? 'admin/index.html' : '../admin/index.html';
      accountLink.textContent = 'Admin';
    } else {
      accountLink.href = productList ? '../profile/index.html' : document.querySelector('#home') ? 'profile/index.html' : 'profile/index.html';
      accountLink.textContent = 'My Profile';
    }
  }
  if (adminLink) adminLink.hidden = !isAdmin();
  const adminOrdersLink = document.querySelector('#admin-orders-link');
  if (adminOrdersLink) adminOrdersLink.hidden = !isAdmin();
  const profileLink = document.querySelector('#profile-link');
  if (isAdmin() && profileLink) profileLink.hidden = true;

  if (productList) {
    if (!currentUser()) { location.href = '../Login%20page/index.html'; return; }
    const assetBase = document.body.dataset.assetBase || 'images/';
    productList.innerHTML = inventory().map(product => {
      const available = Number(product.quantity) > 0;
      const action = isAdmin() ? '<p class="admin-order-note">Admin view · ordering disabled</p>' : `<form class="order-product" data-product="${product.id}"><label>Quantity <input name="quantity" type="number" min="1" max="${Math.max(1, Number(product.quantity))}" value="1" ${available ? '' : 'disabled'} required></label><button type="submit" ${available ? '' : 'disabled'}>${available ? 'Order now' : 'Sold out'}</button></form>`;
      return `<article class="product-item"><img src="${assetBase}${encodeURIComponent(product.image)}" alt="${product.name}"><span class="stock-label ${available ? '' : 'sold-out'}">${available ? `${product.quantity} available` : 'Currently unavailable'}</span><h3>${product.name}</h3><p>${product.description || ''}</p><p class="product-price">₹${Number(product.price).toFixed(2)} <span>/ ${product.unit}</span></p>${action}</article>`;
    }).join('');
    if (!isAdmin()) productList.querySelectorAll('.order-product').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const product = inventory().find(item => item.id === form.dataset.product);
      const quantity = Number(new FormData(form).get('quantity'));
      if (!product || quantity < 1 || quantity > Number(product.quantity)) return alert('That quantity is not available.');
      save('milkFarmCart', [{ id: product.id, name: product.name, quantity, price: Number(product.price), unit: product.unit }]);
      location.href = document.body.dataset.orderUrl || '../Address/index.html';
    }));
  }

  const adminForm = document.querySelector('[data-flow="inventory"]');
  if (adminForm && !isAdmin()) location.href = '../Login%20page/index.html';
  if (adminForm && isAdmin()) {
    const rows = adminForm.querySelector('[data-inventory-rows]');
    rows.innerHTML = inventory().map(product => `<tr><td>${product.name}<small>${product.unit}</small></td><td><label class="admin-field">₹ <input name="price-${product.id}" type="number" min="0" step="0.01" value="${Number(product.price).toFixed(2)}" required></label></td><td><input class="stock-input" name="quantity-${product.id}" type="number" min="0" step="1" value="${Number(product.quantity)}" required></td></tr>`).join('');
    adminForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!adminForm.reportValidity()) return;
      const data = new FormData(adminForm);
      save('milkFarmInventory', inventory().map(product => ({ ...product, price: Number(data.get(`price-${product.id}`)), quantity: Number(data.get(`quantity-${product.id}`)) })));
      notice(adminForm, 'Inventory saved. Returning to the admin store page…');
      setTimeout(() => { location.href = '../store/index.html'; }, 700);
    });
  }

  const orderRows = document.querySelector('[data-order-rows]');
  const customerSummaries = document.querySelector('[data-customer-summaries]');
  let orderFilter = null;
  if (orderRows && !isAdmin()) location.href = '../Login%20page/index.html';
  if (customerSummaries && !isAdmin()) location.href = '../Login%20page/index.html';
  if (customerSummaries && isAdmin()) {
    const allOrders = read('milkFarmOrders', []);
    const allAccounts = read('milkFarmAccounts', {});
    const groups = new Map();
    for (const order of allOrders) {
      const email = (order.email || '').trim().toLowerCase();
      if (!email) continue;
      const savedAccount = allAccounts[email];
      const savedProfile = typeof savedAccount === 'object' ? savedAccount : {};
      if (!groups.has(email)) groups.set(email, { email, name: order.customer || savedProfile.name || 'Customer', mobile: order.mobile || savedProfile.mobile || 'Not on file', orders: [] });
      const group = groups.get(email);
      if (order.customer) group.name = order.customer;
      if (order.mobile || savedProfile.mobile) group.mobile = order.mobile || savedProfile.mobile;
      group.orders.push(order);
    }
    for (const group of [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      const card = document.createElement('article'); card.className = 'customer-summary';
      for (const [label, value] of [['Name', group.name], ['Mobile', group.mobile], ['Email', group.email], ['Orders', group.orders.length]]) {
        const line = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = `${label}: `;
        line.append(strong, document.createTextNode(String(value))); card.append(line);
      }
      const button = document.createElement('button'); button.type = 'button'; button.textContent = `View all orders (${group.orders.length})`;
      button.addEventListener('click', () => {
        orderFilter = group.email;
        const heading = document.querySelector('[data-orders-filter-label]');
        if (heading) heading.textContent = `All orders for ${group.name}`;
        const showAll = document.querySelector('[data-show-all-orders]'); if (showAll) showAll.hidden = false;
        renderOrders(); document.querySelector('.orders-panel')?.scrollIntoView({ behavior: 'smooth' });
      });
      card.append(button); customerSummaries.append(card);
    }
    const showAll = document.querySelector('[data-show-all-orders]');
    if (showAll) showAll.addEventListener('click', () => {
      orderFilter = null;
      const heading = document.querySelector('[data-orders-filter-label]'); if (heading) heading.textContent = 'All orders';
      showAll.hidden = true; renderOrders();
    });
  }
  const newUserRows = document.querySelector('[data-new-user-rows]');
  if (newUserRows) {
    if (!isAdmin()) location.href = '../Login%20page/index.html';
    else {
      const accounts = read('milkFarmAccounts', {});
      const ordersByEmail = new Map();
      for (const order of read('milkFarmOrders', []).slice().sort((a, b) => new Date(a.created) - new Date(b.created))) {
        const email = (order.email || '').trim().toLowerCase();
        if (!email) continue;
        if (!ordersByEmail.has(email)) ordersByEmail.set(email, []);
        ordersByEmail.get(email).push(order);
      }
      const newUsers = Object.entries(accounts)
        .filter(([email]) => ![ADMIN_EMAIL, LEGACY_ADMIN_EMAIL].includes(email))
        .sort((a, b) => new Date(b[1]?.createdAt || 0) - new Date(a[1]?.createdAt || 0));
      if (!newUsers.length) {
        const row = document.createElement('tr'); const cell = document.createElement('td');
        cell.colSpan = 6; cell.textContent = 'No registered users yet.'; row.append(cell); newUserRows.append(row);
      } else {
        for (const [email, account] of newUsers) {
          const profile = typeof account === 'object' ? account : {};
          const row = document.createElement('tr');
          const joined = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Date unavailable';
          const userOrders = ordersByEmail.get(email.toLowerCase()) || [];
          let firstOrderDate = 'Not ordered yet';
          if (userOrders.length) {
            const date = new Date(userOrders[0].created);
            firstOrderDate = date.toLocaleDateString();
            if (date.toDateString() === new Date().toDateString()) firstOrderDate += ' (Today)';
          }
          for (const value of [joined, firstOrderDate, profile.name || 'Name not provided', profile.mobile || 'Mobile not provided', email, userOrders.length]) {
            const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
          }
          newUserRows.append(row);
        }
      }
    }
  }
  const renderOrders = () => {
    if (!orderRows || !isAdmin()) return;
    orderRows.replaceChildren();
    const orders = read('milkFarmOrders', []).filter(order => !orderFilter || (order.email || '').trim().toLowerCase() === orderFilter).slice().reverse();
    if (!orders.length) {
      const row = document.createElement('tr'); const cell = document.createElement('td');
      cell.colSpan = 8; cell.textContent = 'No orders have been placed yet.'; row.append(cell); orderRows.append(row); return;
    }
    for (const order of orders) {
      const row = document.createElement('tr');
      if (order.completed) row.className = 'completed-row';
      const items = (order.items || []).map(item => `${item.name} × ${item.quantity} (${item.unit || ''})`).join(', ') || 'Order details unavailable';
      const total = (order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      const savedAccount = read('milkFarmAccounts', {})[(order.email || '').toLowerCase()];
      const savedProfile = typeof savedAccount === 'object' ? savedAccount : {};
      const values = [new Date(order.created).toLocaleString(), `${order.customer || savedProfile.name || 'Customer'}\n${order.email || ''}`, order.mobile || savedProfile.mobile || 'Not on file', items, `₹${total.toFixed(2)}`, [order.address, order.city].filter(Boolean).join(', ') || 'Address not available'];
      for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      const mapCell = document.createElement('td');
      if (order.location?.latitude && order.location?.longitude) {
        const mapLink = document.createElement('a');
        mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.location.latitude},${order.location.longitude}`)}`;
        mapLink.target = '_blank'; mapLink.rel = 'noopener'; mapLink.textContent = 'Open map'; mapCell.append(mapLink);
      } else mapCell.textContent = 'Not shared';
      row.append(mapCell);
      const statusCell = document.createElement('td'); const label = document.createElement('label'); label.className = 'status-label';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = Boolean(order.completed); checkbox.dataset.orderId = order.created; checkbox.setAttribute('aria-label', `Mark order from ${order.customer || 'customer'} completed`);
      label.append(checkbox, document.createTextNode('Completed')); statusCell.append(label); row.append(statusCell); orderRows.append(row);
    }
  };
  if (orderRows) {
    renderOrders();
    orderRows.addEventListener('change', event => {
      const checkbox = event.target.closest('[data-order-id]'); if (!checkbox) return;
      const orders = read('milkFarmOrders', []);
      const order = orders.find(item => item.created === checkbox.dataset.orderId);
      if (order) { order.completed = checkbox.checked; save('milkFarmOrders', orders); renderOrders(); }
    });
  }

  const customerOrders = document.querySelector('#customer-orders');
  if (customerOrders) {
    const email = currentUser();
    if (!email) location.href = '../Login%20page/index.html';
    else if (isAdmin()) location.href = '../admin/orders.html';
    else {
      const orders = read('milkFarmOrders', []).filter(order => (order.email || '').trim().toLowerCase() === email.toLowerCase()).slice().reverse();
      if (!orders.length) {
        const empty = document.createElement('p'); empty.className = 'empty-orders'; empty.textContent = 'You have not placed any orders yet.'; customerOrders.append(empty);
      } else {
        for (const order of orders) {
          const card = document.createElement('article'); card.className = 'customer-order';
          const heading = document.createElement('div'); heading.className = 'customer-order-head';
          const title = document.createElement('h2'); title.textContent = `Order placed ${new Date(order.created).toLocaleString()}`;
          const status = document.createElement('span'); status.className = `order-status${order.completed ? ' completed' : ''}`; status.textContent = order.completed ? 'Completed' : 'Processing';
          heading.append(title, status); card.append(heading);
          const items = document.createElement('p');
          items.textContent = (order.items || []).map(item => `${item.name} × ${item.quantity} (${item.unit || ''}) — ₹${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}`).join(' · ') || 'Order details unavailable'; card.append(items);
          const total = (order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
          const totalLine = document.createElement('p'); totalLine.textContent = `Total: ₹${total.toFixed(2)} · Payment: Cash on delivery`; card.append(totalLine);
          const delivery = document.createElement('p'); delivery.textContent = `Delivery: ${[order.address, order.city].filter(Boolean).join(', ') || 'Address not available'}`; card.append(delivery);
          customerOrders.append(card);
        }
      }
    }
  }

  const profileForm = document.querySelector('[data-flow="profile"]');
  if (profileForm) {
    const email = currentUser();
    const account = read('milkFarmAccounts', {})[email];
    if (isAdmin()) {
      profileForm.closest('.profile-card').hidden = true;
      const adminMessage = document.querySelector('#admin-message');
      if (adminMessage) adminMessage.hidden = false;
    } else if (!email || !account) location.href = '../Login%20page/index.html';
    else {
      const profile = typeof account === 'object' ? account : {};
      profileForm.elements.namedItem('email').value = email;
      for (const field of ['name', 'mobile', 'address']) profileForm.elements.namedItem(field).value = profile[field] || '';
      const welcome = document.querySelector('[data-profile-name]');
      if (welcome) welcome.textContent = profile.name ? `Hello, ${profile.name}` : 'Your profile';
      profileForm.addEventListener('submit', event => {
        event.preventDefault(); if (!profileForm.reportValidity()) return;
        const data = Object.fromEntries(new FormData(profileForm).entries());
        const accounts = read('milkFarmAccounts', {});
        accounts[email] = { ...profile, name: data.name, mobile: data.mobile, address: data.address };
        save('milkFarmAccounts', accounts); notice(profileForm, 'Your profile has been updated.');
      });
    }
  }

  document.querySelectorAll('[data-flow="address"]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    if (isAdmin()) { location.href = '../store/index.html'; return; }
    if (!form.elements.namedItem('latitude').value || !form.elements.namedItem('longitude').value) {
      const status = document.querySelector('#location-status');
      if (status) status.textContent = 'Current location is required. Use the location button and allow browser location access before continuing.';
      document.querySelector('#use-location')?.focus();
      return;
    }
    if (!form.reportValidity()) return;
    save('milkFarmAddress', Object.fromEntries(new FormData(form).entries())); location.href = '../payment/index.html';
  }));
  if (document.querySelector('[data-flow="address"]') && !currentUser()) location.href = '../Login%20page/index.html';
  const locationButton = document.querySelector('#use-location');
  if (locationButton) {
    const locate = () => {
      const status = document.querySelector('#location-status');
      if (!navigator.geolocation) { status.textContent = 'This browser cannot provide your location. Open the site in a browser with location services enabled to place an order.'; return; }
      status.textContent = 'Finding your current location…';
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        document.querySelector('#latitude').value = latitude;
        document.querySelector('#longitude').value = longitude;
        document.querySelector('#location-map').src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
        document.querySelector('#open-map').href = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        status.textContent = 'Current location pinned. Complete the address fields to continue.';
      }, error => {
        status.textContent = error.code === 1 ? 'Location permission was denied. Enable location access for this site, then try again.' : 'Could not get your location. Check location services and try again.';
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    };
    locationButton.addEventListener('click', locate);
    locate();
  }
  const checkout = document.querySelector('[data-flow="payment"]');
  if (checkout) {
    if (isAdmin()) { location.href = '../store/index.html'; return; }
    const address = read('milkFarmAddress', null); const cart = read('milkFarmCart', []);
    if (!address) { location.href = '../Address/index.html'; return; }
    const email = currentUser();
    const account = read('milkFarmAccounts', {})[email];
    const profile = typeof account === 'object' ? account : {};
    const addr = checkout.elements.namedItem('address'); const city = checkout.elements.namedItem('city'); const zip = checkout.elements.namedItem('zip');
    if (address && addr) addr.value = [address['house-number'], address.address, address['society-name']].filter(Boolean).join(', ');
    if (address && city) city.value = address.city || '';
    if (address && zip) zip.value = address.pin || '';
    if (checkout.elements.namedItem('firstname')) checkout.elements.namedItem('firstname').value = profile.name || 'Farm customer';
    if (checkout.elements.namedItem('email')) checkout.elements.namedItem('email').value = email || '';
    const summary = document.querySelector('#checkout-summary');
    if (summary) summary.textContent = `${cart.map(item => `${item.name} × ${item.quantity} — ₹${(item.price * item.quantity).toFixed(2)}`).join(' · ') || 'No product selected'}${cart.length ? ` · Total ₹${cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}` : ''}\nDelivery: ${[address?.['house-number'], address?.address, address?.['society-name'], address?.city, address?.pin].filter(Boolean).join(', ') || 'Address not provided'}`;
    checkout.addEventListener('submit', event => {
      event.preventDefault(); if (!checkout.reportValidity()) return;
      const data = Object.fromEntries(new FormData(checkout).entries());
      const products = inventory();
      for (const item of cart) { const product = products.find(p => p.id === item.id); if (!product || Number(product.quantity) < item.quantity) return notice(checkout, `${item.name} is no longer available in that quantity. Please return to the home page.`, true); }
      cart.forEach(item => { const product = products.find(p => p.id === item.id); product.quantity = Number(product.quantity) - item.quantity; });
      if (cart.length) save('milkFarmInventory', products);
      const orders = read('milkFarmOrders', []); orders.push({ created: new Date().toISOString(), customer: data.firstname, mobile: profile.mobile || '', email: data.email, address: data.address, city: data.city, payment: data.payment, location: address?.latitude && address?.longitude ? { latitude: address.latitude, longitude: address.longitude } : null, items: cart }); save('milkFarmOrders', orders); localStorage.removeItem('milkFarmCart');
      checkout.innerHTML = '<h2>Order received!</h2><p>Your demo cash-on-delivery order has been saved in this browser.</p><a href="../store/index.html">Return to your farm page</a>';
    });
  }
  const contactForm = document.querySelector('[data-flow="contact"]');
  if (contactForm) contactForm.addEventListener('submit', event => { event.preventDefault(); if (!contactForm.reportValidity()) return; const messages = read('milkFarmMessages', []); messages.push({ ...Object.fromEntries(new FormData(contactForm).entries()), created: new Date().toISOString() }); save('milkFarmMessages', messages); contactForm.reset(); notice(contactForm, 'Thanks! Your message has been saved in this browser.'); });
  document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', () => { localStorage.removeItem('milkFarmUser'); location.href = '../index.html'; }));
})();
