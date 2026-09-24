'use client';
import{useEffect,useMemo,useState}from'react';
import{supabase}from'../../lib/supabase';

const ADMIN='oeyekul@live.com';

export default function Admin(){
  const[session,setSession]=useState(null);
  const[items,setItems]=useState([]);
  const[form,setForm]=useState({name:'',price:'',category:'Furniture',description:''});
  const[photo,setPhoto]=useState(null);
  const[statusFilter,setStatusFilter]=useState('all');
  const[search,setSearch]=useState('');
  const[editing,setEditing]=useState(null);
  const[editPhoto,setEditPhoto]=useState(null);

  useEffect(()=>{
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
    const{error}=await supabase().auth.signInWithOtp({email:ADMIN,options:{emailRedirectTo:window.location.origin+'/admin'}});
    alert(error?error.message:'Check your email for the sign-in link.');
  }

  async function load(){
    const{data}=await supabase().from('items').select('*').order('created_at',{ascending:false});
    setItems(data||[]);
  }

  async function uploadPhoto(file){
    if(!file)return null;
    const path=Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'');
    const{error}=await supabase().storage.from('item-images').upload(path,file);
    if(error){alert(error.message);return null;}
    return supabase().storage.from('item-images').getPublicUrl(path).data.publicUrl;
  }

  async function add(){
    if(!form.name||!form.price)return;
    const image_url=await uploadPhoto(photo);
    const{error}=await supabase().from('items').insert({...form,price:Number(form.price),status:'available',image_url});
    if(error){alert(error.message);return;}
    setForm({name:'',price:'',category:'Furniture',description:''});
    setPhoto(null);
    load();
  }

  async function status(id,value){
    const{error}=await supabase().from('items').update({status:value}).eq('id',id);
    if(error){alert(error.message);return;}
    load();
  }

  function beginEdit(product){
    setEditing({
      id:product.id,
      name:product.name||'',
      price:String(product.price??''),
      category:product.category||'',
      description:product.description||'',
      image_url:product.image_url||''
    });
    setEditPhoto(null);
  }

  async function saveEdit(){
    if(!editing?.name||!editing?.price)return;
    let image_url=editing.image_url||null;
    if(editPhoto){
      const uploaded=await uploadPhoto(editPhoto);
      if(uploaded)image_url=uploaded;
    }
    const{error}=await supabase().from('items').update({
      name:editing.name,
      price:Number(editing.price),
      category:editing.category,
      description:editing.description,
      image_url
    }).eq('id',editing.id);
    if(error){alert(error.message);return;}
    setEditing(null);
    setEditPhoto(null);
    load();
  }

  async function erase(id){
    if(!confirm('Delete this item from admin history too?'))return;
    const{error}=await supabase().from('items').delete().eq('id',id);
    if(error){alert(error.message);return;}
    load();
  }

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return items.filter(product=>{
      const matchesStatus=statusFilter==='all'||product.status===statusFilter;
      const matchesSearch=!q||[product.name,product.category,product.description].some(v=>(v||'').toLowerCase().includes(q));
      return matchesStatus&&matchesSearch;
    });
  },[items,statusFilter,search]);

  if(!session)return <main className="wrap admin">
    <h1>Owner login</h1>
    <p>Sign in with {ADMIN}. No password needed.</p>
    <button className="btn" onClick={passkeyLogin}>Use passkey / Face ID</button>
    <button className="btn" style={{marginTop:10,background:"#666"}} onClick={login}>Email me a sign-in link</button>
  </main>;

  return <main className="wrap admin">
    <div className="top">
      <h1>Sale admin</h1>
      <a href="/" style={{textDecoration:"none",padding:"9px 14px",borderRadius:10,background:"#202020",color:"#fff",fontWeight:700,fontSize:14}}>View shop</a>
    </div>

    <button style={{marginBottom:16,padding:"7px 10px",fontSize:12,borderRadius:8,border:"1px solid #bbb",background:"#fff",cursor:"pointer"}} onClick={registerPasskey}>Set up passkey</button>

    <section className="card pad">
      <h2>Add item</h2>
      <input type="file" accept="image/*" capture="environment" onChange={e=>setPhoto(e.target.files?.[0]||null)}/>
      <input placeholder="Item name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <input type="number" placeholder="Price" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
      <input placeholder="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
      <textarea placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
      <button className="btn" onClick={add}>Publish item</button>
    </section>

    <section className="admin-tools">
      <input className="admin-search" placeholder="Search items..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <div className="filter-row">
        {['all','available','reserved','sold'].map(value=>
          <button key={value} className={statusFilter===value?'filter active':'filter'} onClick={()=>setStatusFilter(value)}>
            {value[0].toUpperCase()+value.slice(1)}
          </button>
        )}
      </div>
      <div className="muted">{filtered.length} of {items.length} items</div>
    </section>

    <div className="grid">
      {filtered.map(product=><div className="card" key={product.id}>
        {product.image_url&&<img src={product.image_url} alt={product.name}/>}
        <div className="pad">
          <div className="admin-card-head">
            <div>
              <b>{product.name}</b>
              <p className="muted" style={{margin:'5px 0'}}>{'$'+Number(product.price).toFixed(0)} · {product.category}</p>
            </div>
            <span className={'status-badge '+product.status}>{product.status}</span>
          </div>

          <button className="edit-btn" onClick={()=>beginEdit(product)}>Edit item</button>

          <div className="row status-actions">
            <button onClick={()=>status(product.id,'available')}>Available</button>
            <button onClick={()=>status(product.id,'reserved')}>Reserved</button>
            <button onClick={()=>status(product.id,'sold')}>Sold</button>
          </div>

          {product.status==='sold'&&<button className="secondary-btn" onClick={()=>status(product.id,'available')}>Restore to Available</button>}
          <button className="delete-btn" onClick={()=>erase(product.id)}>Delete</button>
        </div>
      </div>)}
    </div>

    {!filtered.length&&<div className="empty">No items match this filter.</div>}

    {editing&&<div className="modal-backdrop" onClick={()=>setEditing(null)}>
      <div className="edit-modal" onClick={e=>e.stopPropagation()}>
        <div className="top">
          <h2>Edit item</h2>
          <button className="close-btn" onClick={()=>setEditing(null)}>×</button>
        </div>
        {editing.image_url&&<img className="edit-preview" src={editing.image_url} alt="Current item"/>}
        <label>Replace photo</label>
        <input type="file" accept="image/*" onChange={e=>setEditPhoto(e.target.files?.[0]||null)}/>
        <label>Item name</label>
        <input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/>
        <label>Price</label>
        <input type="number" value={editing.price} onChange={e=>setEditing({...editing,price:e.target.value})}/>
        <label>Category</label>
        <input value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})}/>
        <label>Description</label>
        <textarea value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/>
        <div className="row">
          <button className="secondary-btn" onClick={()=>setEditing(null)}>Cancel</button>
          <button className="btn" onClick={saveEdit}>Save changes</button>
        </div>
      </div>
    </div>}
  </main>;
}
