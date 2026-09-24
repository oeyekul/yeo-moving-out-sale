export const DEFAULT_SETTINGS={
  whatsappNumber:'61485517778',
  whatsappTemplate:"Hi! I’m interested in these items from Luke’s Moving Out Sale:\n\n{items}\n\nTotal: {total}\n\nAre these still available?"
};

export function normalizeWhatsappNumber(value){
  return (value||'').replace(/\D/g,'');
}

export function renderWhatsappMessage(template,items,total){
  const itemLines=items.map((product,index)=>
    (index+1)+'. '+product.name+' — $'+Number(product.price).toFixed(0)
  ).join('\n');

  return (template||DEFAULT_SETTINGS.whatsappTemplate)
    .replaceAll('{items}',itemLines)
    .replaceAll('{total}','$'+Number(total).toFixed(0))
    .replaceAll('{count}',String(items.length));
}

export async function loadSiteSettings(db){
  const{data,error}=await db.storage.from('item-images').download('settings/site-settings.json');
  if(error||!data)return DEFAULT_SETTINGS;

  try{
    const parsed=JSON.parse(await data.text());
    return{
      whatsappNumber:normalizeWhatsappNumber(parsed.whatsappNumber)||DEFAULT_SETTINGS.whatsappNumber,
      whatsappTemplate:parsed.whatsappTemplate||DEFAULT_SETTINGS.whatsappTemplate
    };
  }catch{
    return DEFAULT_SETTINGS;
  }
}

export async function saveSiteSettings(db,settings){
  const clean={
    whatsappNumber:normalizeWhatsappNumber(settings.whatsappNumber),
    whatsappTemplate:settings.whatsappTemplate||DEFAULT_SETTINGS.whatsappTemplate
  };

  const blob=new Blob([JSON.stringify(clean,null,2)],{type:'application/json'});
  const{error}=await db.storage
    .from('item-images')
    .upload('settings/site-settings.json',blob,{contentType:'application/json',upsert:true});

  return{error,settings:clean};
}
