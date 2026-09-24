'use client';
import{useEffect,useState}from'react';
import{supabase}from'../../lib/supabase';

const ADMIN='oeyekul@live.com';
const CANONICAL='https://yeo-moving-out-sale.vercel.app';

export default function Admin(){
  const[session,setSession]=useState(null);
  const[items,setItems]=useState([]);
  const[form,setForm]=useState({name:'',price:'',category:'Furniture',description:''});
  const[photo,setPhoto]=useState(null);

  useEffect(()=>{
    if(window.location.hostname!=='yeo-moving-out-sale.vercel.app' && window.location.hostname.endsWith('.vercel.app')){
      window.location.replace(CANONICAL+'/admin');
      return;
    }
    const db=supabase();
    db.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)load();});
    const{data}=db.auth.onAuthStateChange((event,s)=>{setSession(s);if(s)load();});
    return()=>data.subscription.unsubscribe();
  },[]);

  async function passkeyLogin(){
    const{error}=await supabase().auth.signInWithPasskey();
    if(error) alert(error.message);
  }

  async function registerPasskey(){
    const{error}=await supabase().auth.registerPasskey();
    alert(error?error.message:'Passkey saved. Next time you can use Face ID / Touch ID.');
  }

  async function login(){
    const{error}=await supabase().auth.signInWithOtp({email:ADMIN,options:{emailRedirectTo:CANONICAL+'/admin'}});
    alert(error?error.message:'Check your email for the sign-in link.');
  }

  async function load(){
    const{data}=await supabase().from('items').select('*').order('created_at',{ascending:false});
    setItems(data||[]);
  }

  async function add(){
    if(!form.name||!form.price)return;
    let image_url=null;
    if(photo){
      const path=Date.now()+'-'+photo.name.replace(/[^a-zA-Z0-9._-]/g,'');
      const{error}=await supabase().storage.from('item-images').upload(path,photo);
      if(!error) image_url=supabase().storage.from('item-images').getPublicUrl(path).data.publicUrl;
    }
    await supabase().from('items').insert({...form,price:Number(form.price),status:'available',image_url});
    setForm({name:'',price:'',category:'Furniture',description:''});
    setPhoto(null);
    load();
  }

  async function status(id,value){
    await supabase().from('items').update({status:value}).eq('id',id);
    load();
  }

  async function erase(id){
    if(!confirm('Delete this item from admin history too?'))return;
    await supabase().from('items').delete().eq('id',id);
    load();
  }

  if(!session)return <main className="wrap admin">
    <h1>Owner login</h1>
    <p>Sign in with {ADMIN}. No password needed.</p>
    <button className="btn" onClick={passkeyLogin}>Use passkey / Face ID</button><button className="btn" style={{marginTop:10,background:"#666"}} onClick={login}>Email me a sign-in link</button>
  </main>;

  return <main className="wrap admin">
    <div className="top"><h1>Sale admin</h1><a href="/">View shop</a></div><button className="btn" style={{marginBottom:16}} onClick={registerPasskey}>Set up passkey on this device</button>

    <section className="card pad">
      <h2>Add item</h2>
      <input type="file" accept="image/*" capture="environment" onChange={e=>setPhoto(e.target.files?.[0]||null)}/>
      <input placeholder="Item name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <input type="number" placeholder="Price" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
      <input placeholder="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
      <textarea placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
      <button className="btn" onClick={add}>Publish item</button>
    </section>

    <div className="grid">
      {items.map(product=><div className="card pad" key={product.id}>
        <b>{product.name}</b>
        <p>{'$'+Number(product.price).toFixed(0)} · {product.status}</p>
        <div className="row">
          <button onClick={()=>status(product.id,'available')}>Available</button>
          <button onClick={()=>status(product.id,'reserved')}>Reserved</button>
          <button onClick={()=>status(product.id,'sold')}>Sold</button>
        </div>
        {product.status==='sold'&&<button style={{marginTop:8}} onClick={()=>status(product.id,'available')}>Restore to Available</button>}
        <button style={{marginTop:8}} onClick={()=>erase(product.id)}>Delete</button>
      </div>)}
    </div>
  </main>;
}