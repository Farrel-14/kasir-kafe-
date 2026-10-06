const rp = n => 'Rp' + Math.round(n).toLocaleString('id-ID');
const KEY = 'kasir-kafe-v1';

let S = {
  menu: [
    { id: 1, name: 'Kopi Susu', cat: 'Kopi', price: 18000, stock: 40 },
    { id: 2, name: 'Americano', cat: 'Kopi', price: 15000, stock: 40 },
    { id: 3, name: 'Latte', cat: 'Kopi', price: 22000, stock: 30 },
    { id: 4, name: 'Teh Tarik', cat: 'Non-kopi', price: 14000, stock: 30 },
    { id: 5, name: 'Coklat Panas', cat: 'Non-kopi', price: 17000, stock: 25 },
    { id: 6, name: 'Nasi Goreng', cat: 'Makanan', price: 25000, stock: 20 },
    { id: 7, name: 'Mie Goreng', cat: 'Makanan', price: 22000, stock: 20 },
    { id: 8, name: 'Roti Bakar', cat: 'Camilan', price: 16000, stock: 15 },
    { id: 9, name: 'Kentang Goreng', cat: 'Camilan', price: 15000, stock: 20 },
  ],
  sales: [],
  nextSale: 1,
  nextItem: 10,
};

try {
  const d = localStorage.getItem(KEY);
  if (d) S = JSON.parse(d);
} catch (e) {}

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
};

let tab = 'kasir',
  cat = 'Semua',
  cart = {},
  disc = 0,
  discType = '%',
  tax = 11,
  service = 0,
  pay = '',
  msg = '';

const $ = s => document.querySelector(s);
const cats = () => ['Semua', ...new Set(S.menu.map(m => m.cat))];

function calc() {
  let sub = 0;
  for (const id in cart) {
    const m = S.menu.find(x => x.id == id);
    if (m) sub += m.price * cart[id];
  }

  const d = Math.min(sub, discType == '%' ? sub * disc / 100 : disc);
  const base = sub - d;
  const sv = base * service / 100;
  const tx = (base + sv) * tax / 100;

  return { sub, d, sv, tx, total: base + sv + tx };
}

function nav() {
  $('#nav').innerHTML = [['kasir', 'Kasir'], ['stok', 'Stok'], ['laporan', 'Laporan']]
    .map(([k, l]) => `<button class="${tab == k ? 'on' : ''}" onclick="tab='${k}';render()">${l}</button>`)
    .join('');
}

function render() {
  nav();
  $('#app').innerHTML = { kasir: vKasir, stok: vStok, laporan: vLaporan }[tab]();
}

function vKasir() {
  const c = calc();
  const ids = Object.keys(cart);
  const items = S.menu
    .filter(m => cat == 'Semua' || m.cat == cat)
    .map(m => {
      const left = m.stock - (cart[m.id] || 0);
      return `<button class="item" ${left <= 0 ? 'disabled' : ''} onclick="add(${m.id})"><b>${m.name}</b><span>${rp(m.price)}</span><span class="${left <= 5 ? 'bad' : ''}">${left <= 0 ? 'Habis' : 'Sisa ' + left}</span></button>`;
    })
    .join('');
  const lines = ids.length
    ? ids.map(id => {
        const m = S.menu.find(x => x.id == id);
        return `<div class="row"><div>${m.name}<div class="mute">${rp(m.price)}</div></div><div class="q"><button onclick="chg(${id},-1)" aria-label="Kurangi">−</button>${cart[id]}<button onclick="chg(${id},1)" aria-label="Tambah">+</button></div><b>${rp(m.price * cart[id])}</b></div>`;
      }).join('')
    : '<p class="mute">Belum ada pesanan. Ketuk menu untuk menambah.</p>';
  const paid = +pay || 0;
  const kembali = paid - c.total;

  return `<div class="kasir">
    <div>
      <div class="chips">${cats().map(k => `<button class="chip ${cat == k ? 'on' : ''}" onclick="cat='${k}';render()">${k}</button>`).join('')}</div>
      <div class="grid">${items}</div>
    </div>
    <div class="box">
      <b>Pesanan</b>
      <div>${lines}</div>
      <div class="line"></div>
      <div class="fld"><label>Pajak (PPN) %</label><input type="number" min="0" value="${tax}" onchange="tax=+this.value;render()"></div>
      <div class="fld"><label>Service charge %</label><input type="number" min="0" value="${service}" onchange="service=+this.value;render()"></div>
      <div class="line"></div>
      <div class="row"><span class="mute">Subtotal</span>${rp(c.sub)}</div>
      ${c.sv ? `<div class="row"><span class="mute">Service</span>${rp(c.sv)}</div>` : ''}
      <div class="row"><span class="mute">Pajak</span>${rp(c.tx)}</div>
      <div class="row"><b>Total</b><span class="tot">${rp(c.total)}</span></div>
      <div class="fld"><label>Uang diterima</label><input type="text" inputmode="numeric" autocomplete="off" style="width:150px;text-align:right" value="${pay ? 'Rp' + (+pay).toLocaleString('id-ID') : ''}" oninput="payIn(this)" placeholder="Rp0"></div>
      <div class="row"><span class="mute">Kembalian</span><b id="kb" class="${kembali < 0 ? 'bad' : ''}">${paid ? rp(kembali) : '-'}</b></div>
      <p class="bad" id="msg">${msg}</p>
      <button class="btn" onclick="checkout()">Bayar &amp; cetak struk</button>
      <button class="btn sec" onclick="cart={};pay='';msg='';render()">Kosongkan</button>
    </div>
  </div>`;
}

function payIn(el) {
  pay = el.value.replace(/\D/g, '').replace(/^0+/, '');
  el.value = pay ? 'Rp' + (+pay).toLocaleString('id-ID') : '';
  upd();
}

function upd() {
  const c = calc();
  const p = +pay || 0;
  const k = $('#kb');
  k.textContent = p ? rp(p - c.total) : '-';
  k.className = p - c.total < 0 ? 'bad' : '';
}

function add(id) {
  const m = S.menu.find(x => x.id == id);
  if ((cart[id] || 0) < m.stock) cart[id] = (cart[id] || 0) + 1;
  msg = '';
  render();
}

function chg(id, d) {
  const m = S.menu.find(x => x.id == id);
  cart[id] = Math.min(m.stock, (cart[id] || 0) + d);
  if (cart[id] <= 0) delete cart[id];
  render();
}

function checkout() {
  const ids = Object.keys(cart);
  if (!ids.length) {
    msg = 'Tambahkan pesanan dulu.';
    return render();
  }

  const c = calc();
  const paid = +pay || 0;
  if (paid < c.total) {
    msg = 'Uang diterima kurang dari total.';
    return render();
  }

  const items = ids.map(id => {
    const m = S.menu.find(x => x.id == id);
    m.stock -= cart[id];
    return { name: m.name, price: m.price, qty: cart[id] };
  });
  const sale = { id: S.nextSale++, time: new Date().toISOString(), items, ...c, paid };

  S.sales.push(sale);
  save();
  cart = {};
  pay = '';
  msg = '';
  disc = 0;
  render();
  receipt(sale);
}

function receipt(s) {
  const t = new Date(s.time).toLocaleString('id-ID');
  $('#rc').innerHTML = `<div style="text-align:center"><b>KAFE FARREL ABADI</b><br>Struk #${String(s.id).padStart(4, '0')}<br>${t}</div><hr>
  ${s.items.map(i => `<div>${i.name}</div><div class="row"><span>${i.qty} x ${rp(i.price)}</span><span>${rp(i.qty * i.price)}</span></div>`).join('')}<hr>
  <div class="row"><span>Subtotal</span><span>${rp(s.sub)}</span></div>
  ${s.sv ? `<div class="row"><span>Service</span><span>${rp(s.sv)}</span></div>` : ''}
  <div class="row"><span>Pajak</span><span>${rp(s.tx)}</span></div>
  <div class="row"><b>TOTAL</b><b>${rp(s.total)}</b></div>
  <div class="row"><span>Tunai</span><span>${rp(s.paid)}</span></div>
  <div class="row"><span>Kembali</span><span>${rp(s.paid - s.total)}</span></div><hr>
  <div style="text-align:center">Terima kasih!</div>
  <button class="btn noprint" onclick="window.print()">Cetak</button>
  <button class="btn sec noprint" style="color:#111" onclick="$('#modal').classList.remove('on')">Tutup</button>`;
  $('#modal').classList.add('on');
}

function vStok() {
  return `<div class="box">
    <div class="wrap">
      <table>
        <tr><th>Menu</th><th>Kategori</th><th class="r">Harga</th><th class="r">Stok</th><th></th></tr>
        ${S.menu.map(m => `<tr><td>${m.name}</td><td>${m.cat}</td><td class="r"><input type="number" style="width:100px" value="${m.price}" onchange="edit(${m.id},'price',this.value)"></td><td class="r"><input type="number" style="width:80px" value="${m.stock}" onchange="edit(${m.id},'stock',this.value)"></td><td class="r"><button class="chip bad" onclick="del(${m.id})">Hapus</button></td></tr>`).join('')}
      </table>
    </div>
    <div class="line"></div>
    <b>Tambah menu</b>
    <div class="fld" style="flex-wrap:wrap">
      <input id="nn" placeholder="Nama menu" style="flex:2;width:auto">
      <input id="nc" placeholder="Kategori" style="flex:1;width:auto" list="cl">
      <datalist id="cl">${cats().slice(1).map(c => `<option value="${c}">`).join('')}</datalist>
      <input id="np" type="number" placeholder="Harga" style="flex:1;width:auto">
      <input id="ns" type="number" placeholder="Stok" style="flex:1;width:auto">
    </div>
    <button class="btn" style="width:auto;padding:10px 20px" onclick="addMenu()">Simpan menu</button>
    <p class="mute">Stok berkurang otomatis setiap transaksi. Menu dengan stok 5 atau kurang ditandai merah di halaman kasir.</p>
  </div>`;
}

function edit(id, k, v) {
  S.menu.find(m => m.id == id)[k] = Math.max(0, +v || 0);
  save();
}

function del(id) {
  if (confirm('Hapus menu ini?')) {
    S.menu = S.menu.filter(m => m.id != id);
    delete cart[id];
    save();
    render();
  }
}

function addMenu() {
  const n = $('#nn').value.trim();
  const c = $('#nc').value.trim() || 'Lainnya';
  const p = +$('#np').value;
  const s = +$('#ns').value || 0;

  if (!n || !p) return alert('Isi nama dan harga menu.');

  S.menu.push({ id: S.nextItem++, name: n, cat: c, price: p, stock: s });
  save();
  render();
}

function vLaporan() {
  const today = new Date().toDateString();
  const td = S.sales.filter(s => new Date(s.time).toDateString() == today);
  const sum = a => a.reduce((x, s) => x + s.total, 0);
  const cnt = {};
  S.sales.forEach(s => s.items.forEach(i => cnt[i.name] = (cnt[i.name] || 0) + i.qty));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return `<div class="stats">
    <div class="box"><span class="mute">Penjualan hari ini</span><b>${rp(sum(td))}</b></div>
    <div class="box"><span class="mute">Transaksi hari ini</span><b>${td.length}</b></div>
    <div class="box"><span class="mute">Total seluruh penjualan</span><b>${rp(sum(S.sales))}</b></div>
  </div>
  <div class="kasir">
    <div class="box">
      <b>Riwayat transaksi</b>
      <div class="wrap">
        <table>
          <tr><th>No</th><th>Waktu</th><th class="r">Total</th><th></th></tr>
          ${S.sales.length
            ? [...S.sales].reverse().map(s => `<tr><td>#${String(s.id).padStart(4, '0')}</td><td>${new Date(s.time).toLocaleString('id-ID')}</td><td class="r">${rp(s.total)}</td><td class="r"><button class="chip" onclick="receipt(S.sales.find(x=>x.id==${s.id}))">Struk</button></td></tr>`).join('')
            : '<tr><td colspan="4" class="mute">Belum ada transaksi.</td></tr>'}
        </table>
      </div>
    </div>
    <div class="box">
      <b>Menu terlaris</b>
      ${top.length
        ? top.map(([n, q]) => `<div class="row"><span>${n}</span><b>${q} terjual</b></div>`).join('')
        : '<p class="mute">Belum ada data.</p>'}
      <button class="btn sec" onclick="if(confirm('Hapus semua riwayat transaksi?')){S.sales=[];save();render()}">Hapus riwayat</button>
    </div>
  </div>`;
}

$('#modal').addEventListener('click', e => {
  if (e.target.id == 'modal') e.target.classList.remove('on');
});

render();