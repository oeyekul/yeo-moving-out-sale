'use client';
import{useEffect,useState}from'react';
import{supabase}from'../lib/supabase';

const WA='61485517778';

export default function Home(){
  const[items,setItems]=useState([]);
  const[cart,setCart]=useState([]);

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

  return <main className="wrap">
    <div className="top">
      <div><div className="brand">Yeo’s Moving Out Sale</div><div className="muted">Pre-loved things looking for a new home.</div></div>
      <a href="/admin">Admin</a>
    </div>

    <div className="grid">
      {items.map(product=><article className="card" key={product.id}>
        {product.image_url?<img src={product.image_url} alt={product.name}/>:<div className="image-placeholder">Photo coming soon</div>}
        <div className="pad">
          <span className="pill">{product.status==='reserved'?'Reserved':product.category}</span>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <p className="price">{'$'+Number(product.price).toFixed(0)}</p>
          <button className="btn" disabled={product.status!=='available'} onClick={()=>add(product)}>
            {product.status==='reserved'?'Reserved':cart.some(c=>c.id===product.id)?'Added':'Add to cart'}
          </button>
        </div>
      </article>)}
    </div>

    {!items.length&&<div className="empty">No items are currently listed.</div>}

    {cart.length>0&&<div className="cart">
      <div>
        <b>{cart.length} item{cart.length>1?'s':''}</b> · {'$'+total.toFixed(0)}
        <div>{cart.map(c=><button key={c.id} onClick={()=>remove(c.id)} style={{margin:'6px 6px 0 0',background:'#fff'}}>Remove {c.name}</button>)}</div>
      </div>
      <button onClick={send}>Send request on WhatsApp</button>
    </div>}
  </main>;
}