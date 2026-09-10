(() => {
  'use strict';
  const en = document.body.dataset.locale === 'en';
  const base = document.body.dataset.base || '.';
  const t = (th, english) => en ? english : th;
  const choices = {
    intro: ['Landometer · shared','landometer-dial','assets/landometer/svg/dial-full.svg','Dial · '+t('เริ่มด้วยความอยากรู้','Open with curiosity'),t('จังหวะเปิดที่พาสายตาไปยังเรื่องใหม่ ข้อความยังบอกว่าเรากำลังสำรวจอะไร','An opening beat draws the eye into a new story. The words still explain what you are exploring.'),t('ทุกพื้นที่ มีเรื่องให้ค้นพบ','Every place has a story.'),t('เริ่มจากบริบท แล้วค่อย ๆ เปิดมุมมองไปด้วยกัน','Start with the context. Let each new layer reveal a little more.'),t('เริ่มสำรวจ →','Start exploring →')],
    layers: ['Landometer · shared','landometer-layers','assets/landometer/svg/layers-full.svg','Layers · '+t('เห็นเรื่องเดียวกันหลายมุม','Make room for different perspectives'),t('ใช้จังหวะซ้อนเพื่อเชื่อมหลายมุมมอง โดยไม่แทนจำนวนชั้นข้อมูลจริง','The layered form connects perspectives. It does not count actual data layers.'),t('มองให้ครบ แล้วค่อยตัดสินใจ','See the layers. Find your perspective.'),t('คน สถานที่ และบริบท ช่วยเปิดมุมมองของเรื่องเดียวกัน','People, places and context each bring a different view of the same story.'),t('ดูแต่ละมุม →','Explore each view →')],
    action: ['Landometer · shared','landometer-slice','assets/landometer/svg/slice-full.svg','Slice · '+t('ส่งจังหวะไปสู่การลงมือ','Give the next step a little emphasis'),t('ชิ้นที่ก้าวออกมาช่วยเน้นจังหวะปิด แต่ข้อความและปุ่มยังเป็นผู้บอกขั้นถัดไป','A small step outward accents the close. The words and button still carry the next action.'),t('จากสิ่งที่เห็น สู่สิ่งที่จะทำ','From what you see to what you do.'),t('เลือกหนึ่งเรื่องที่อยากเริ่ม แล้วพาไอเดียไปต่อ','Choose one idea to begin with, then give it a next step.'),t('เริ่มเรื่องนี้ →','Start with this idea →')],
    welcome: ['CityChat · product','citychat-voice-home','assets/citychat/assets/3a-voice-home-light.svg','CityChat 3a · '+t('ที่ว่างสำหรับเสียงใหม่','A place for a new voice'),t('ใบเหลืองเข้ามาร่วมวง ช่วยให้คำชวนรู้สึกเปิดรับ เก็บไว้ในบริบท CityChat','The yellow newcomer joins the group, giving the invitation a welcoming tone. Keep this story within CityChat.'),t('เรื่องเล็ก ๆ ของคุณ เรื่องใหม่ของเรา','Your everyday story. Our next conversation.'),t('แบ่งปันเรื่องที่ชอบในละแวกบ้าน แล้วชวนเพื่อนบ้านมาคุยกัน','Share something you enjoy in your neighbourhood and invite a conversation.'),t('มาเล่าเรื่องกัน →','Share a story →')],
    place: ['CityChat · product','citychat-our-voice-here','assets/citychat/assets/3c-our-voice-here-light.svg','CityChat 3c · '+t('เสียงของเราอยู่ตรงนี้','Give the voice a place'),t('ภาพชวนให้เล่าเรื่องผูกกับสถานที่ แผนที่ในตัวอย่างเป็นภาพแนวคิด ไม่ใช่ข้อมูลตำแหน่งจริง','The illustration invites a story tied to a place. This conceptual map is not actual location data.'),t('ตรงนี้ มีเรื่องอยากเล่า','There is a story right here.'),t('เริ่มจากสถานที่ที่รู้จัก แล้วแบ่งปันมุมมองของคุณ','Start with a place you know, then add your perspective.'),t('เล่าเรื่องของที่นี่ →','Tell this place’s story →')],
    calculate: ['ijji · product','ijji-graph-b','assets/ijji/svg/ijji-graph-b-transparent-ink.svg','Graph B · '+t('บอกว่างานยังเดินอยู่','Make an actual wait understandable'),t('ใช้กับการคำนวณของ ijji ที่กำลังเกิดขึ้นจริง และหยุดพร้อมงาน ตัวอย่างนี้ไม่ใช่การประมวลผลจริง','Use with a real ijji calculation and stop with the operation. This specimen does not process real data.'),t('กำลังเตรียมคำตอบให้คุณ','Preparing your answer.'),t('ตัวอย่างสถานะ: ข้อความบอกงาน ส่วนลายช่วยจัดจังหวะระหว่างรอ','State specimen: the text describes the task; the motif gives the wait a rhythm.'),t('มีทางยกเลิกได้เสมอ','Keep cancellation available')]
  };
  const pick = document.querySelector('#playground');
  let selected = 'intro';
  const targets = {'citychat-voice-home':['citychat-3a','citychat-voice-home'],'citychat-our-voice-here':['citychat-3c','citychat-our-voice-here']};
  function cardFor(id) { return document.getElementById(id) || (targets[id]||[]).map(x=>document.getElementById(x)).find(Boolean); }
  function selectJob(key) {
    if (!choices[key] || !pick) return;
    selected = key;
    const [family,id,src,name,why,title,description,next] = choices[key];
    pick.querySelectorAll('[data-job]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.job===key)));
    pick.querySelector('[data-idea-family]').textContent=family;
    pick.querySelector('[data-idea-name]').textContent=name;
    pick.querySelector('[data-idea-why]').textContent=why;
    pick.querySelector('[data-scene-title]').textContent=title;
    pick.querySelector('[data-scene-copy]').textContent=description;
    pick.querySelector('[data-scene-next]').textContent=next;
    const img=pick.querySelector('[data-idea-image]');img.src=base+'/'+src;img.alt=name;
    pick.querySelector('[data-idea-link]').href='#'+(cardFor(id)?.id || id);
  }
  pick?.querySelectorAll('[data-job]').forEach(b=>b.addEventListener('click',()=>selectJob(b.dataset.job)));
  pick?.querySelectorAll('[data-idea-view]').forEach(b=>b.addEventListener('click',()=>{
    pick.querySelectorAll('[data-idea-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    pick.querySelector('.idea-scene').classList.toggle('is-plain',b.dataset.ideaView==='plain');
  }));
  function clearFilters() { document.querySelector('[data-filter="all"]')?.click(); const search=document.querySelector('[data-asset-search]');if(search){search.value='';search.dispatchEvent(new Event('input'));} }
  pick?.querySelector('[data-idea-link]')?.addEventListener('click',()=>{clearFilters(); selectJob(selected);});
  pick?.querySelector('[data-idea-preview]')?.addEventListener('click',()=>{
    clearFilters(); const card=cardFor(choices[selected][1]);
    const button=card?.querySelector('[data-preview-brand], [data-cc-preview]');
    if(button) button.click(); else {const target=card || document.getElementById('citychat');target?.scrollIntoView({behavior:'smooth'});}
  });
  const checks=[...document.querySelectorAll('[data-handoff-check]')];
  checks.forEach((input,i)=>{try{input.checked=sessionStorage.getItem('motif-check-'+i)==='true';}catch{}input.addEventListener('change',()=>{try{sessionStorage.setItem('motif-check-'+i,input.checked);}catch{}updateChecks();});});
  function updateChecks(){const n=checks.filter(x=>x.checked).length;const el=document.querySelector('[data-check-progress]');if(el)el.textContent=n+'/3 · '+(n===3?t('ครบแล้ว แนบ brief แล้วไปต่อได้เลย','All set. Include the brief and carry it forward.'):t('เช็กในชิ้นงานจริง แล้วติ๊กสิ่งที่ทำแล้ว','Check the actual output, then mark what you have done.'));}
  updateChecks();
  // Deep links remain useful even after a family filter has hidden their card.
  function revealHash(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const el=document.getElementById(id);if(el?.matches('.asset-card, [data-family]')){clearFilters();el.scrollIntoView();}}
  window.addEventListener('hashchange',revealHash);if(location.hash)requestAnimationFrame(revealHash);
})();
