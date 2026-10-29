(() => {
  'use strict';
  const $ = (s,b=document) => b.querySelector(s);
  const $$ = (s,b=document) => [...b.querySelectorAll(s)];
  const view = $('#view');
  const header = $('#site-header');
  const bagCount = $('#bag-count');
  const modal = $('#product-modal');
  const toast = $('#toast');
  const asset = n => `/assets/${n}`;
  const money = v => v == null ? '—' : `$${v}`;
  let current = 'intro';
  let moving = false;
  let cart = {};
  let toastTimer = null;
  try { cart = JSON.parse(localStorage.getItem('sai_cart_demo') || '{}') || {}; } catch { cart = {}; }

  const products = [
    {id:'holder',title:'Incense Holder',subtitle:'Brushed steel / study 001',price:55,image:'holder-main-hq.png',cardImage:'holder-white-smoke-approved.png',desc:'A precise steel object designed to hold one stick at an angle and keep the ritual visually calm.',meta:'Stainless steel / Object study / 001'},
    {id:'hinoki',title:'Hinoki',subtitle:'Dry wood / quiet air',price:15,image:'sticks-approved.png',cardImage:'sticks-approved.png',desc:'A clean, dry composition inspired by hinoki wood and the stillness of a quiet room.',meta:'Incense sticks / Scent study / 002'},
    {id:'rice',title:'Rice Smoke',subtitle:'Rice / paper / soft smoke',price:15,image:'sticks-approved.png',cardImage:'sticks-approved.png',desc:'Soft and restrained. Rice, pale smoke, and a smooth paper-like calm.',meta:'Incense sticks / Scent study / 003'},
    {id:'tea',title:'Black Tea',subtitle:'Tea leaf / warm wood',price:15,image:'sticks-approved.png',cardImage:'sticks-approved.png',desc:'Dark tea warmth with a dry wooden structure and a clear, lingering trail.',meta:'Incense sticks / Scent study / 004'},
    {id:'shiso',title:'Red Shiso',subtitle:'Green lift / peppered edge',price:15,image:'sticks-approved.png',cardImage:'sticks-approved.png',desc:'Botanical brightness with a crisp, green edge and an unusual aromatic sharpness.',meta:'Incense sticks / Scent study / 005'},
    {id:'yuzu',title:'Yuzu Peel',subtitle:'Bitter citrus / mineral air',price:15,image:'sticks-approved.png',cardImage:'sticks-approved.png',desc:'A bright bitter-citrus opening balanced by clean air and gentle dryness.',meta:'Incense sticks / Scent study / 006'},
    {id:'cedar',title:'Cedar Dust',subtitle:'Cedar / ash / restraint',price:15,image:'sticks-approved.png',cardImage:'sticks-approved.png',desc:'Dry cedar and a faint mineral ash quality. Quiet, grounded and architectural.',meta:'Incense sticks / Scent study / 007'},
    {id:'matches',title:'Matches',subtitle:'Long safety matches',price:null,image:'matches-approved.png',cardImage:'matches-approved.png',desc:'Long monochrome safety matches to accompany the ritual.',meta:'Accessory / In development'},
    {id:'journal',title:'Journal',subtitle:'Editorial object',price:null,image:null,desc:'Editorial piece coming soon.',meta:'Editorial object / To be added'}
  ];

  function setCount(){
    const total = Object.values(cart).reduce((a,b)=>a+(Number(b)||0),0);
    bagCount.textContent = `(${String(total).padStart(2,'0')})`;
    try { localStorage.setItem('sai_cart_demo', JSON.stringify(cart)); } catch {}
  }

  function showToast(message){
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>toast.classList.remove('show'), 1800);
  }

  function syncHeader(){
    const hidden = current === 'intro';
    const dark = current === 'philosophy' || current === 'collection';
    header.classList.toggle('hidden', hidden);
    header.classList.toggle('dark', dark);
    $$('[data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === current));
  }

  function introPage(){
    return `<button type="button" class="page intro-page" id="intro-enter" aria-label="Enter SAI collection">
      <picture class="intro-picture"><source media="(max-width:760px)" srcset="${asset('hero-symbol-mobile.png')}"/><img src="${asset('hero-logo.png')}" alt="SAI" class="intro-logo" fetchpriority="high" draggable="false"/></picture>
    </button>`;
  }

  function collectionPage(){
    return `<section class="page collection-page" aria-labelledby="collection-heading">
      <div class="collection-head"><div><div class="eyebrow">SAI / OBJECT INDEX — 001—009</div><h1 id="collection-heading">The collection.</h1></div>
      <p>Objects and incense for the way we experience space.</p></div>
      <div class="collection-grid">${products.map((p,i)=>cardHTML(p,i)).join('')}</div>
      <div class="collection-end"><span>SAI — INCENSE &amp; OBJECTS.</span><span>END OF INDEX / 009</span></div>
    </section>`;
  }

  function cardHTML(p,i){
    const label = p.id==='holder'?'OBJECT / 001':p.id==='matches'?'ACCESSORY / 008':p.id==='journal'?'EDITORIAL / 009':`INCENSE / ${String(i+1).padStart(3,'0')}`;
    const picture = p.cardImage
      ? `<img src="${asset(p.cardImage)}" alt="" loading="lazy" decoding="async"/>`
      : `<div class="product-card-empty" aria-hidden="true"></div>`;
    return `<article class="product-card" data-product="${p.id}" tabindex="0" role="button" aria-label="View ${p.title}">
      <div class="product-card-top"><span>${String(i+1).padStart(3,'0')} / SAI</span><span class="card-arrow" aria-hidden="true">↗</span></div>
      <div class="product-card-media">${picture}</div>
      <div class="product-card-bottom"><div class="product-card-name">${p.title}</div>
      <div class="product-card-foot"><span>${label}</span><span class="product-card-price">${p.price==null?'—':money(p.price)}</span></div></div>
    </article>`;
  }

  function philosophyPage(){
    return `<section class="page philosophy-page"><div class="philosophy-hero"><div><div class="eyebrow">SAI / PHILOSOPHY</div><h1>The art of<br/>listening.</h1></div><div class="philosophy-intro">Kōdō is the Japanese practice of appreciating fragrance.<span class="philosophy-next-sentence">It asks us to pay attention — not simply to what an aroma smells like, but to how it occupies a moment.</span></div></div><div class="philosophy-sections"><div class="philosophy-row"><div class="philosophy-card visual"><img src="${asset('portrait.png')}" alt="Isao Mori" loading="lazy" decoding="async"/></div><div class="philosophy-card text"><div><div class="philosophy-note">A quiet figure / Isao Mori</div><h2>The face of SAI.</h2><p>Isao Mori acts as a symbolic guide for the brand — not as a loud founder figure, but as a calm presence shaped by the spirit of Kōdō. He represents attention, restraint and a sensitivity to atmosphere.</p></div><p>Fragrance is treated not as ornament, but as a medium: something that changes the emotional density of a room.</p></div></div><div class="philosophy-row"><div class="philosophy-card text"><div><div class="philosophy-note">Object study / 001</div><h2>Form reduced.</h2><p>Each object is edited back to essentials. The holder keeps the gesture simple. The stick becomes a line. The ash becomes a record of time. Nothing more needs to happen.</p></div><p>Materials remain honest, silhouettes stay controlled, and the interface between hand, object and scent remains clear.</p></div><div class="philosophy-card visual"><img src="${asset('philosophy-steel-detail.png')}" alt="Incense holder detail" loading="lazy" decoding="async"/></div></div></div></section>`;
  }

  function bagPage(){
    const items = products.filter(p => p.price != null && cart[p.id] > 0);
    const count = items.reduce((a,p)=>a+cart[p.id],0);
    const subtotal = items.reduce((a,p)=>a+(cart[p.id]*p.price),0);
    return `<section class="page bag-page"><div class="bag-hero"><div><div class="eyebrow">Bag / SAI</div><h1>Your selection.</h1></div><div class="eyebrow">${String(count).padStart(2,'0')} items</div></div><div class="bag-grid"><div class="bag-box">${items.length ? items.map(itemHTML).join('') : `<div class="empty-state"><div><h2>Nothing here. Yet.</h2><p>Select an object to begin.</p><a href="/?view=collection" data-view="collection" class="pill-button"><span>Explore collection</span><span>↗</span></a></div></div>`}</div><aside class="summary-box"><div class="eyebrow" style="margin-bottom:8px">Order summary</div><div class="summary-line"><span>Items (${count})</span><span>${money(subtotal)}</span></div><div class="summary-line"><span>Shipping</span><span>—</span></div><div class="summary-total"><span>Total</span><span>${money(subtotal)}</span></div><button class="pill-button" type="button" data-demo-checkout ${count ? '' : 'disabled'}><span>Continue</span><span>↗</span></button></aside></div></section>`;
  }

  function itemHTML(p){
    return `<div class="bag-item"><img src="${asset(p.image)}" alt="${p.title}"/><div><div class="item-title">${p.title}</div><div class="item-meta">${p.subtitle}</div><div class="qty-row"><button type="button" data-qty="${p.id}" data-delta="-1">−</button><span>${String(cart[p.id]).padStart(2,'0')}</span><button type="button" data-qty="${p.id}" data-delta="1">+</button></div></div><div class="item-price">${money(p.price*cart[p.id])}</div></div>`;
  }

  function modalHTML(p){
    const pics=p.id==='holder' ? [
      ['holder-main-hq.png','Full view'],
      ['holder-top-hq.png','Top view'],
      ['holder-macro-hq.png','Material detail']
    ] : [];
    const modalPicture = p.id==='holder' ? `<img src="${asset('holder-main-hq.png')}" alt="Incense Holder full view" decoding="async" id="modal-photo" />` : (p.image ? `<img src="${asset(p.image)}" alt="${p.title}" decoding="async" />` : `<div class="placeholder-box">Image coming later</div>`);
    const gallery = pics.length ? `<div class="image-gallery" aria-label="Holder views">${pics.map(([f,l],i)=>`<button type="button" data-photo="${f}" data-photo-label="${l}" class="gallery-dot ${i===0?'active':''}" aria-label="${l}" aria-pressed="${i===0}">${String(i+1).padStart(2,'0')}</button>`).join('')}</div>` : '';
    return `<div class="modal-backdrop" data-close-modal="true"></div><section class="modal-sheet" role="dialog" aria-modal="true" aria-label="${p.title}"><div class="modal-top"><div class="eyebrow" style="margin:0">${p.meta}</div><button class="close-button" data-close-modal="true" aria-label="Close">×</button></div><div class="modal-visual">${modalPicture}${gallery}</div><div class="modal-info"><h2>${p.title}.</h2><div class="modal-copy">${p.desc}</div><div class="modal-meta"><span>${p.subtitle}</span><span>${money(p.price)}</span></div>${p.price != null ? `<button class="pill-button" type="button" data-add="${p.id}"><span>Add to bag</span><span>${money(p.price)}</span></button>` : `<button class="pill-button" type="button" disabled><span>Coming later</span><span>—</span></button>`}</div></section>`;
  }

  function pageHTML(name){
    return name === 'collection' ? collectionPage() : name === 'philosophy' ? philosophyPage() : name === 'bag' ? bagPage() : introPage();
  }

  function render(){
    // Instant render is reserved for the initial page and updates within the same route.
    view.innerHTML=pageHTML(current);
    view.style.backgroundColor = (current==='collection' || current==='philosophy') ? '#000000' : current==='bag' ? '#ffffff' : '#dddde0';
    syncHeader();
    setCount();
  }

  function valid(v){ return ['intro','collection','philosophy','bag'].includes(v) ? v : 'intro'; }

  function navigate(next, push=true){
    next = valid(next);
    if(next === current || moving) return;
    closeModal();
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      current=next;
      if(push) history.pushState({view:next}, '', next==='intro'?'/':`/?view=${next}`);
      render();
      return;
    }
    moving=true;
    const previous=view.querySelector('.page:last-child');
    const template=document.createElement('template');
    template.innerHTML=pageHTML(next).trim();
    const incoming=template.content.firstElementChild;
    incoming.classList.add('route-initial');
    view.appendChild(incoming);
    // Match the destination background so no grey or white flash appears between dark pages.
    view.style.backgroundColor = (next==='collection' || next==='philosophy') ? '#000000' : next==='bag' ? '#ffffff' : '#dddde0';
    // Preload the next screen while both views are in the DOM.
    current=next;
    if(push) history.pushState({view:next}, '', next==='intro'?'/':`/?view=${next}`);
    syncHeader();
    setCount();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      incoming.classList.add('route-visible');
      if(previous) previous.classList.add('route-exit');
    }));
    window.setTimeout(()=>{
      if(previous && previous.isConnected) previous.remove();
      incoming.classList.remove('route-initial','route-visible');
      moving=false;
    },560);
  }

  function openModal(id){
    const p = products.find(x => x.id === id); if(!p) return;
    modal.innerHTML = modalHTML(p); modal.hidden = false; document.body.style.overflow='hidden';
  }
  function closeModal(){ modal.hidden = true; modal.innerHTML=''; document.body.style.overflow=''; }

  document.addEventListener('click', e => {
    const viewLink = e.target.closest('[data-view]');
    if(viewLink){ e.preventDefault(); navigate(viewLink.dataset.view); return; }
    if(e.target.closest('#intro-enter')){ navigate('collection'); return; }
    const product = e.target.closest('[data-product]');
    if(product){ openModal(product.dataset.product); return; }
    if(e.target.closest('[data-close-modal]')){ closeModal(); return; }
    const photo = e.target.closest('[data-photo]');
    if(photo){
      const display=$('#modal-photo');
      if(display){ display.src=asset(photo.dataset.photo); display.alt='Incense Holder — '+photo.dataset.photoLabel; }
      $$('[data-photo]',modal).forEach(el=>{ const active=el===photo; el.classList.toggle('active',active); el.setAttribute('aria-pressed',String(active)); });
      return;
    }
    const add = e.target.closest('[data-add]');
    if(add){ const id = add.dataset.add; cart[id] = (cart[id]||0)+1; setCount(); closeModal(); showToast('Added to bag.'); return; }
    const qty = e.target.closest('[data-qty]');
    if(qty){ const id=qty.dataset.qty, delta=Number(qty.dataset.delta); cart[id]=Math.max(0,(cart[id]||0)+delta); if(!cart[id]) delete cart[id]; render(); return; }
    if(e.target.closest('[data-demo-checkout]')) showToast('Visual demo only.');
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') closeModal();
    const card = e.target.closest?.('[data-product]');
    if(card && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); openModal(card.dataset.product); }
  });

  window.addEventListener('popstate', ()=> {
    const qs = new URLSearchParams(location.search);
    const destination=valid(qs.get('view') || 'intro');
    if(destination===current) return;
    if(moving){
      // Prefer browser history over an unfinished previous animation.
      current=destination;
      moving=false;
      render();
    } else navigate(destination,false);
  });

  current = valid(new URLSearchParams(location.search).get('view') || 'intro');
  render();
})();
