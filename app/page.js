'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_SETTINGS, loadSiteSettings, renderWhatsappMessage } from '../lib/siteSettings';

function imagesFor(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return [value];
}

function tagsFor(value) {
  return [...new Set(
    (value || '')
      .split(/[\\/,;|]+/)
      .map(tag => tag.trim())
      .filter(Boolean)
  )];
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [active, setActive] = useState('All');
  const [slides, setSlides] = useState({});
  const touchStartX = useRef({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [lightbox, setLightbox] = useState(null);
  const lightboxTouchX = useRef(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('yeo-cart') || '[]');
    setCart(saved);
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem('yeo-cart', JSON.stringify(cart));
  }, [cart]);

  async function load() {
    const { data } = await supabase()
      .from('items')
      .select('*')
      .in('status', ['available', 'reserved'])
      .order('created_at', { ascending: false });

    setItems(data || []);
    const currentSettings=await loadSiteSettings(supabase());
    setSettings(currentSettings);
  }

  const tabs = useMemo(() => {
    const seen = new Map();

    items.forEach(product => {
      tagsFor(product.category).forEach(tag => {
        const key = tag.toLowerCase();
        if (!seen.has(key)) seen.set(key, tag);
      });
    });

    return ['All', ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  useEffect(() => {
    if (!tabs.includes(active)) setActive('All');
  }, [tabs, active]);

  const filtered = useMemo(() => {
    if (active === 'All') return items;

    return items.filter(product =>
      tagsFor(product.category).some(
        tag => tag.toLowerCase() === active.toLowerCase()
      )
    );
  }, [items, active]);

  function moveSlide(id, count, amount) {
    setSlides(current => {
      const now = current[id] || 0;
      return { ...current, [id]: (now + amount + count) % count };
    });
  }

  function handleGalleryScroll(id, event) {
    const el = event.currentTarget;
    const width = el.clientWidth || 1;
    const index = Math.round(el.scrollLeft / width);
    setSlides(current =>
      current[id] === index ? current : { ...current, [id]: index }
    );
  }

  function scrollGallery(id, count, amount) {
    const gallery = document.getElementById('gallery-' + id);
    const current = slides[id] || 0;
    const next = (current + amount + count) % count;

    if (gallery) {
      gallery.scrollTo({ left: next * gallery.clientWidth, behavior: 'smooth' });
    }

    setSlides(state => ({ ...state, [id]: next }));
  }

  function touchStart(id,event){
    touchStartX.current[id]=event.changedTouches[0].clientX;
  }

  function touchEnd(id,count,event){
    const start=touchStartX.current[id];
    if(start==null)return;

    const end=event.changedTouches[0].clientX;
    const distance=end-start;
    delete touchStartX.current[id];

    if(Math.abs(distance)<35)return;
    scrollGallery(id,count,distance<0?1:-1);
  }

  function openLightbox(product, images, index) {
    setLightbox({
      productId: product.id,
      title: product.name,
      images,
      index
    });
  }

  function moveLightbox(amount) {
    setLightbox(current => {
      if (!current) return current;
      const next =
        (current.index + amount + current.images.length) %
        current.images.length;
      return { ...current, index: next };
    });
  }

  function lightboxTouchStart(event) {
    lightboxTouchX.current = event.changedTouches[0].clientX;
  }

  function lightboxTouchEnd(event) {
    if (lightboxTouchX.current == null) return;
    const distance =
      event.changedTouches[0].clientX - lightboxTouchX.current;
    lightboxTouchX.current = null;
    if (Math.abs(distance) < 35) return;
    moveLightbox(distance < 0 ? 1 : -1);
  }

  function toggleCart(product) {
    if (product.status !== 'available') return;

    const inCart = cart.some(item => item.id === product.id);

    if (inCart) {
      setCart(cart.filter(item => item.id !== product.id));
    } else {
      setCart([...cart, product]);
    }
  }

  function remove(id) {
    setCart(cart.filter(item => item.id !== id));
  }

  const total = cart.reduce(
    (sum, product) => sum + Number(product.price),
    0
  );

  async function send() {
    const ids = cart.map(item => item.id);

    const { data } = await supabase()
      .from('items')
      .select('*')
      .in('id', ids)
      .eq('status', 'available');

    const live = data || [];
    setCart(live);

    if (!live.length) {
      alert('These items are no longer available.');
      return;
    }

    const liveTotal = live.reduce(
      (sum, product) => sum + Number(product.price),
      0
    );

    const msg=renderWhatsappMessage(
      settings.whatsappTemplate,
      live,
      liveTotal
    );

    window.location.href =
      'https://wa.me/' +
      settings.whatsappNumber +
      '?text=' +
      encodeURIComponent(msg);
  }

  return (
    <main>
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="home-link" href="/">⌂ Home</a>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="eyebrow">Moving out sale</div>
          <h1>Luke’s Moving Out Sale</h1>
          <p>Good stuff, good condition, looking for a new home.</p>
        </div>
      </section>

      <div className="wrap">
        <nav className="tabs" aria-label="Categories">
          {tabs.map(tab => (
            <button
              key={tab}
              className={active === tab ? 'tab active' : 'tab'}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="grid">
          {filtered.map(product => {
            const images = imagesFor(product.image_url);
            const index = Math.min(
              slides[product.id] || 0,
              Math.max(images.length - 1, 0)
            );

            return (
              <article className="card" key={product.id}>
                {images.length ? (
                  <div className="gallery-shell">
                    <div
                      id={'gallery-' + product.id}
                      className="gallery"
                      onScroll={event => handleGalleryScroll(product.id, event)}
                      onTouchStart={event => touchStart(product.id,event)}
                      onTouchEnd={event => touchEnd(product.id,images.length,event)}
                    >
                      {images.map((url, photoIndex) => (
                        <img
                          key={url + photoIndex}
                          src={url}
                          alt={product.name + ' photo ' + (photoIndex + 1)}
                          draggable="false"
                          onClick={() => openLightbox(product, images, photoIndex)}
                        />
                      ))}
                    </div>

                    {images.length > 1 && (
                      <>
                        <button
                          className="gallery-btn prev"
                          aria-label="Previous photo"
                          onClick={() =>
                            scrollGallery(product.id, images.length, -1)
                          }
                        >
                          ‹
                        </button>

                        <button
                          className="gallery-btn next"
                          aria-label="Next photo"
                          onClick={() =>
                            scrollGallery(product.id, images.length, 1)
                          }
                        >
                          ›
                        </button>

                        <div className="gallery-count">
                          {index + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="image-placeholder">
                    Photo coming soon
                  </div>
                )}

                <div className="pad">
                  <div className="card-top">
                    <div className="pill-group">
                      {product.status === 'reserved' ? (
                        <span className="pill">Reserved</span>
                      ) : (
                        tagsFor(product.category).map(tag => (
                          <span className="pill" key={tag}>
                            {tag}
                          </span>
                        ))
                      )}
                    </div>

                    <span className="price">
                      {'$' + Number(product.price).toFixed(0)}
                    </span>
                  </div>

                  <h2>{product.name}</h2>
                  <p className="description">{product.description}</p>

                  <button
                    className={
                      cart.some(item => item.id === product.id)
                        ? 'btn in-cart'
                        : 'btn'
                    }
                    disabled={product.status !== 'available'}
                    onClick={() => toggleCart(product)}
                  >
                    {product.status === 'reserved'
                      ? 'Reserved'
                      : cart.some(item => item.id === product.id)
                        ? 'Added to cart ✓'
                        : 'Add to cart'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {!filtered.length && (
          <div className="empty">
            <div className="empty-icon">⌂</div>
            <b>No items here yet.</b>
            <span>Try another category.</span>
          </div>
        )}

        {cart.length > 0 && (
          <div className="cart">
            <div>
              <b>
                {cart.length} item{cart.length > 1 ? 's' : ''}
              </b>
              {' · $' + total.toFixed(0)}

              <div className="cart-items">
                {cart.map(item => (
                  <button key={item.id} onClick={() => remove(item.id)}>
                    × {item.name}
                  </button>
                ))}
              </div>
            </div>

            <button className="whatsapp" onClick={send}>
              Send on WhatsApp
            </button>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title + ' photos'}
          onClick={() => setLightbox(null)}
          onTouchStart={lightboxTouchStart}
          onTouchEnd={lightboxTouchEnd}
        >
          <button
            className="lightbox-close"
            aria-label="Close gallery"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>

          <div
            className="lightbox-content"
            onClick={event => event.stopPropagation()}
          >
            <img
              src={lightbox.images[lightbox.index]}
              alt={
                lightbox.title +
                ' photo ' +
                (lightbox.index + 1)
              }
              draggable="false"
            />

            {lightbox.images.length > 1 && (
              <>
                <button
                  className="lightbox-nav prev"
                  aria-label="Previous photo"
                  onClick={() => moveLightbox(-1)}
                >
                  ‹
                </button>

                <button
                  className="lightbox-nav next"
                  aria-label="Next photo"
                  onClick={() => moveLightbox(1)}
                >
                  ›
                </button>

                <div className="lightbox-count">
                  {lightbox.index + 1} / {lightbox.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
