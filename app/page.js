'use client';
import{useEffect,useMemo,useState}from'react';
import{supabase}from'../lib/supabase';

const WA='61485517778';
function imagesFor(value){
  if(!value)return[];
  try{
    const parsed=JSON.parse(value);
    if(Array.isArray(parsed))return parsed.filter(Boolean);
  }catch{}
  return[value];
}

function tagsFor(value){
  return [...new Set((value||'').split(/[\\/,;|]+/).map(tag=>tag.trim()).filter(Boolean))];
}

export default function Home(){
  const[items,setItems]=useState([]);
  const[cart,setCart]=useState([]);
  const[active,setActive]=useState('All');
  const[slides,setSlides]=useState({});

  useEffect(()=>{
    const saved=JSON.parse(localStorage.getItem('yeo-cart')||'[]');
    setCart(saved);
    load();
  },[]);

  useEffect(()=>{
    localStorage.setItem('yeo-cart',JSON.stringify(cart));
  },[cart]);

  async function load(){
    const{data}=await supabase().from('items').select('*').in('status',['available','reserved']).order('created_at',{ascending:false});
    setItems(data||[]);
  }

  const tabs=useMemo(()=>{
    const seen=new Map();
    items.forEach(product=>{
      tagsFor(product.category).forEach(tag=>{
        const key=tag.toLowerCase();
        if(!seen.has(key))seen.set(key,tag);
      });
    });
    return ['All',...Array.from(seen.values()).sort((a,b)=>a.localeCompare(b))];
  },[items]);

  useEffect(()=>{
    if(!tabs.includes(active))setActive('All');
  },[tabs,active]);

  const filtered=useMemo(()=>{
    if(active==='All')return items;
    return items.filter(product=>tagsFor(product.category).some(tag=>tag.toLowerCase()===active.toLowerCase()));
  },[items,active]);

  function moveSlide(id,count,amount){
    setSlides(current=>{
      const now=current[id]||0;
      return{...current,[id]:(now+amount+count)%count};
    });
  }

  function add(product){
    if(product.status==='available'&&!cart.some(c=>c.id===product.id)) setCart([...cart,product]);
  }

  function remove(id){
    setCart(cart.filter(c=>c.id!==id));
  }

  const total=cart.reduce((sum,product)=>sum+Number(product.price),0);

  async function send(){
    const ids=cart.map(c=>c.id);
    const{data}=await supabase().from('items').select('*').in('id',ids).eq('status','available');
    const live=data||[];
    setCart(live);
    if(!live.length){alert('These items are no longer available.');return;}
    let msg="Hi! I’m interested in these items from Yeo’s Moving Out Sale:\n\n";
    live.forEach((product,i)=>{msg+=(i+1)+". "+product.name+" — $"+Number(product.price).toFixed(0)+"\n";});
    const liveTotal=live.reduce((s,p)=>s+Number(p.price),0);
    msg+="\nTotal: $"+liveTotal.toFixed(0)+"\n\nAre these still available?";
    window.location.href='https://wa.me/'+WA+'?text='+encodeURIComponent(msg);
  }

  return <main>
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="home-link" href="/">⌂ Home</a>
      </div>
    </header>

    <section className="hero">
      <div className="wrap">
        <div className="eyebrow">Moving out sale</div>
        <h1>Yeo’s Moving Out Sale</h1>
        <p>Good stuff, good condition, looking for a new home.</p>
      </div>
    </section>

    <div className="wrap">
      <nav className="tabs" aria-label="Categories">
        {tabs.map(tab=><button key={tab} className={active===tab?'tab active':'tab'} onClick={()=>setActive(tab)}>{tab}</button>)}
      </nav>

      <div className="grid">
        {filtered.map(product=>{
          const images=imagesFor(product.image_url);
          const index=Math.min(slides[product.id]||0,Math.max(images.length-1,0));
          return <article className="card" key={product.id}>
            {images.length
              ?<div className="gallery">
                <img src={images[index]} alt={product.name+' photo '+(index+1)}/>
                {images.length>1&&<>
                  <button className="gallery-btn prev" aria-label="Previous photo" onClick={()=>moveSlide(product.id,images.length,-1)}>‹</button>
                  <button className="gallery-btn next" aria-label="Next photo" onClick={()=>moveSlide(product.id,images.length,1)}>›</button>
                  <div className="gallery-count">{index+1} / {images.length}</div>
                </>}
              </div>
              :<div className="image-placeholder">Photo coming soon</div>}
            <div className="pad">
              <div className="card-top">
                <div className="pill-group">
                  {product.status==='reserved'
                    ?<span className="pill">Reserved</span>
                    :tagsFor(product.category).map(tag=><span className="pill" key={tag}>{tag}</span>)}
                </div>
                <span className="price">{'
              <h2>{product.name}</h2>
              <p className="description">{product.description}</p>
              <button className="btn" disabled={product.status!=='available'} onClick={()=>add(product)}>
                {product.status==='reserved'?'Reserved':cart.some(c=>c.id===product.id)?'Added to cart':'Add to cart'}
              </button>
            </div>
          </article>;
        })}
      </div>

      {!filtered.length&&<div className="empty">
        <div className="empty-icon">⌂</div>
        <b>No items here yet.</b>
        <span>Try another category.</span>
      </div>}

      {cart.length>0&&<div className="cart">
        <div>
          <b>{cart.length} item{cart.length>1?'s':''}</b> · {'$'+total.toFixed(0)}
          <div className="cart-items">{cart.map(c=><button key={c.id} onClick={()=>remove(c.id)}>× {c.name}</button>)}</div>
        </div>
        <button className="whatsapp" onClick={send}>Send on WhatsApp</button>
      </div>}
    </div>
  </main>;
}+Number(product.price).toFixed(0)}</span>
              </div>
              <h2>{product.name}</h2>
              <p className="description">{product.description}</p>
              <button className="btn" disabled={product.status!=='available'} onClick={()=>add(product)}>
                {product.status==='reserved'?'Reserved':cart.some(c=>c.id===product.id)?'Added to cart':'Add to cart'}
              </button>
            </div>
          </article>;
        })}
      </div>

      {!filtered.length&&<div className="empty">
        <div className="empty-icon">⌂</div>
        <b>No items here yet.</b>
        <span>Try another category.</span>
      </div>}

      {cart.length>0&&<div className="cart">
        <div>
          <b>{cart.length} item{cart.length>1?'s':''}</b> · {'$'+total.toFixed(0)}
          <div className="cart-items">{cart.map(c=><button key={c.id} onClick={()=>remove(c.id)}>× {c.name}</button>)}</div>
        </div>
        <button className="whatsapp" onClick={send}>Send on WhatsApp</button>
      </div>}
    </div>
  </main>;
}