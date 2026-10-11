
const SB = window.supabase.createClient(window.PSSAB_CONFIG.SUPABASE_URL, window.PSSAB_CONFIG.SUPABASE_ANON_KEY);
const ADMIN_AUTH = window.supabase.createClient(window.PSSAB_CONFIG.SUPABASE_URL, window.PSSAB_CONFIG.SUPABASE_ANON_KEY, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
let state = { user:null, profile:null, members:[], schedules:[], messages:[], attendance:[], docs:[], loading:false };
const app=()=>document.getElementById('app');
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function toast(s){const e=document.getElementById('toast');e.textContent=s;e.style.display='block';setTimeout(()=>e.style.display='none',1800)}
function go(p){location.hash=p;render()}
function isManager(){return ['Admin','Ketua','Sekretaris'].includes(state.profile?.role)}
function mapTo(s){const q=encodeURIComponent(String(s||'').trim());if(!q)return;location.href='https://www.google.com/maps/search/?api=1&query='+q}
function setNav(p){document.querySelectorAll('.bottom button').forEach(x=>x.classList.remove('active'));document.getElementById('n-'+(p==='admin'?'profile':p))?.classList.add('active')}
async function loadAll(){
  if(!state.user)return;
  const [pm,sc,ms,at,dc]=await Promise.all([
    SB.from('profiles').select('*').eq('active',true).order('name'),
    SB.from('schedules').select('*').order('event_date'),
    SB.from('messages').select('id,text,created_at,sender_id,profiles(name,role)').order('created_at'),
    SB.from('attendance').select('*'),
    SB.from('documentation').select('id,image_url,caption,created_at,uploader_id,profiles(name)').order('created_at',{ascending:false})
  ]);
  if(pm.error) throw pm.error; if(sc.error) throw sc.error; if(ms.error) throw ms.error; if(at.error) throw at.error; if(dc.error) throw dc.error;
  state.members=pm.data||[]; state.schedules=sc.data||[]; state.messages=ms.data||[]; state.attendance=at.data||[]; state.docs=dc.data||[];
}
async function boot(){
  const status=document.getElementById('loginStatus');
  try{
    if(!window.supabase){showLogin('Koneksi login belum termuat. Periksa internet lalu refresh.');return}
    if(status)status.textContent='Memeriksa sesi login...';
    const {data:{session},error:se}=await SB.auth.getSession();
    if(se) throw se;
    state.user=session?.user||null;
    if(!state.user){showLogin('Silakan masukkan email dan password.');return}
    showApp();
    const {data:p,error}=await SB.from('profiles').select('*').eq('id',state.user.id).maybeSingle();
    if(error) throw error;
    state.profile=p||null;
    if(!state.profile){await SB.auth.signOut();state.user=null;state.profile=null;showLogin('Akun belum memiliki profil anggota.');return}
    render();
    try{await loadAll();}catch(e){console.error(e);toast('Data belum termuat: '+e.message)}
    render(); subscribeRealtime();
  }catch(e){
    console.error('BOOT ERROR',e);state.user=null;state.profile=null;showLogin('Koneksi aplikasi bermasalah. Tekan refresh dan coba lagi.');
  }
}
async function login(){
  const email=document.getElementById('loginEmail')?.value.trim();
  const password=document.getElementById('loginPassword')?.value;
  const btn=document.getElementById('loginBtn');
  const status=document.getElementById('loginStatus');
  if(!email||!password){if(status)status.textContent='Isi email dan password.';return}
  if(!window.supabase){if(status)status.textContent='Koneksi login belum termuat. Tekan refresh lalu coba lagi.';return}
  if(btn){btn.disabled=true;btn.textContent='Memeriksa...'}
  try{
    const {data,error}=await SB.auth.signInWithPassword({email,password});
    if(error){if(status)status.textContent=error.message;return}
    state.user=data.user;
    const {data:p,error:pe}=await SB.from('profiles').select('*').eq('id',data.user.id).single();
    if(pe){await SB.auth.signOut();state.user=null;if(status)status.textContent='Akun belum memiliki profil anggota.';return}
    state.profile=p; render(); await loadAll(); render(); subscribeRealtime(); toast('Selamat datang, '+p.name);
  }catch(e){console.error(e);if(status)status.textContent='Login gagal: '+(e.message||e)}
  finally{if(btn){btn.disabled=false;btn.textContent='Masuk'}}
}
async function logout(){await SB.auth.signOut();state={user:null,profile:null,members:[],schedules:[],messages:[],attendance:[],docs:[]};render();}
async function resetPassword(){const email=document.getElementById('loginEmail')?.value.trim();if(!email)return toast('Isi email dulu');const {error}=await SB.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});toast(error?error.message:'Link reset password dikirim ke email')}
function showLogin(message='Silakan login untuk melanjutkan.'){
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('appShell').style.display='none';
  const s=document.getElementById('loginStatus'); if(s)s.textContent=message;
}
function showApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('appShell').style.display='block';
}
function render(){
 if(!state.user){showLogin('Silakan login untuk melanjutkan.');return}
 showApp();
 if(!state.profile){document.querySelector('.bottom').style.display='none';app().innerHTML='<div class="card"><h2>Memuat profil...</h2><p class="muted">Mohon tunggu sebentar.</p></div>';return}
 document.querySelector('.bottom').style.display='flex';
 let p=location.hash.slice(1)||'home';setNav(p);
 if(p==='home')home();else if(p==='members')members();else if(p==='schedule')renderSchedulePage();else if(p==='chat')chat();else if(p==='attendance')attendance();else if(p==='docs')docs();else if(p==='admin')admin();else profile();
}
function home(){const s=state.schedules[0];app().innerHTML=`<h2>Horas, ${esc(state.profile?.name||'Anggota')} 👋</h2><p class="muted">HORAS JALA GABE PUNGUAN SITUMORANG SIPITU AMA SEKTOR TANJUNG UNCANG — aplikasi kumpulan online.</p>${s?`<div class="card"><b class="gold">JADWAL TERDEKAT</b><h2>${esc(s.title)}</h2><b>${esc(s.event_date)} • ${esc(s.event_time)}</b><p>📍 ${esc(s.location)}</p><div class="row"><button onclick="go('attendance')">Daftar Hadir</button><button class="btn2" onclick="mapTo('${esc(s.location)}')">Buka Maps</button></div></div>`:'<div class="card"><b>Belum ada jadwal.</b></div>'}<div class="grid"><button class="quick" onclick="go('members')">👥 <b>Anggota</b>Daftar anggota</button><button class="quick" onclick="go('schedule')">📅 <b>Jadwal</b>Ibadah bulanan</button><button class="quick" onclick="go('attendance')">✅ <b>Presensi</b>Daftar hadir</button><button class="quick" onclick="go('docs')">📷 <b>Dokumentasi</b>Foto kegiatan</button><button class="quick" onclick="go('chat')">💬 <b>Chat</b>Grup kumpulan</button>${isManager()?'<button class="quick" onclick="go(\'admin\')">⚙️ <b>Pengurus</b>Kelola jadwal</button>':''}</div>`}
function members(){app().innerHTML='<h2>Daftar Anggota</h2><p class="muted">Data tersimpan online di Supabase.</p><div class="card"><div class="row" style="justify-content:space-between"><div><b>Tambah anggota</b><div class="muted">Admin dan anggota yang sudah login dapat menambahkan anggota baru.</div></div><button onclick="toggleAddMember()">+ Tambah</button></div><div id="addMemberBox" class="hide" style="margin-top:12px"><div class="field"><input id="mn" placeholder="Nama lengkap"></div><div class="field"><input id="mp" placeholder="No. HP (opsional)" inputmode="tel"></div><div class="field"><input id="me" type="email" placeholder="Email login anggota"></div><div class="field"><input id="mw" type="password" placeholder="Password awal (min. 8 karakter)"></div><div class="field"><label>Jenis anggota</label><select id="mg"><option value="01">01 — Bona</option><option value="02">02 — Boru</option><option value="03">03 — Bere</option><option value="04">04 — Iba Bere</option></select></div>${isManager()?'<div class="field"><select id="mr"><option>Anggota</option><option>Bendahara</option><option>Sekretaris</option><option>Ketua</option><option>Admin</option></select></div>':'<input type="hidden" id="mr" value="Anggota"><p class="muted">Anggota baru dibuat dengan peran <b>Anggota</b>.</p>'}<div class="row"><button onclick="addMember()">Simpan Anggota</button><button class="btn2" onclick="toggleAddMember()">Batal</button></div><p class="muted">Password awal diberikan kepada anggota tersebut. Setelah login, anggota dapat menggunakan aplikasi seperti biasa.</p></div></div>'+state.members.map(m=>`<div class="card"><div class="row" style="justify-content:space-between;align-items:flex-start"><div class="person"><div class="avatar">${esc((m.name||'?')[0])}</div><div><b>${esc(m.name)}</b><div class="muted">${esc(m.role)}${m.phone?' • '+esc(m.phone):''}</div></div></div>${state.profile?.role==='Admin'?`<div class="row"><button class="btn2" onclick="editMember('${m.id}')">Edit</button><button onclick="requestDeleteMember('${m.id}')">Hapus</button></div>`:''}</div></div>`).join('')}'+(state.profile?.role==='Admin'?'<p class="muted">Admin dapat mengedit peran, nomor HP, mengaktifkan/menonaktifkan, atau menghapus anggota.</p>':'')}
function toggleAddMember(){document.getElementById('addMemberBox')?.classList.toggle('hide')}
async function addMember(){const name=document.getElementById('mn')?.value.trim(),phone=document.getElementById('mp')?.value.trim()||'',email=document.getElementById('me')?.value.trim(),password=document.getElementById('mw')?.value,role=document.getElementById('mr')?.value||'Anggota',bona=document.getElementById('mg')?.value||'01';if(state.profile?.role!=='Admin')return toast('Hanya Admin yang dapat menambahkan anggota baru');if(!name||!email||!password)return toast('Nama, email dan password wajib diisi');if(password.length<8)return toast('Password minimal 8 karakter');try{const {data:au,error:ae}=await ADMIN_AUTH.auth.signUp({email,password,options:{data:{name,phone,bona_group_code:bona,relationship:{'01':'Bona','02':'Boru','03':'Bere','04':'Iba Bere'}[bona]||'Bona'},emailRedirectTo:location.origin+'/'}});if(ae)throw ae;if(!au.user)throw new Error('Akun anggota tidak berhasil dibuat.');const {data,error}=await SB.rpc('admin_create_member',{p_user_id:au.user.id,p_name:name,p_phone:phone,p_bona_group_code:bona,p_role:role});if(error)throw error;if(data?.error)throw new Error(data.error);await loadAll();toast('Anggota berhasil ditambahkan');members()}catch(e){console.error(e);toast(e.message||'Gagal menambahkan anggota')}}
function editMember(id){const m=state.members.find(x=>x.id===id);if(!m||state.profile?.role!=='Admin')return toast('Hanya Admin');app().innerHTML=`<h2>Edit Anggota</h2><div class="card"><div class="field"><label>Nama lengkap</label><input id="en" value="${esc(m.name)}"></div><div class="field"><label>No. HP</label><input id="ep" value="${esc(m.phone||'')}" inputmode="tel"></div><div class="field"><label>Peran</label><select id="er">${['Anggota','Bendahara','Sekretaris','Ketua','Admin'].map(r=>`<option ${m.role===r?'selected':''}>${r}</option>`).join('')}</select></div><div class="field"><label>Status</label><select id="ea"><option value="true" ${m.active?'selected':''}>Aktif</option><option value="false" ${!m.active?'selected':''}>Nonaktif</option></select></div><div class="row"><button onclick="saveMember('${m.id}')">Simpan Perubahan</button><button class="btn2" onclick="go('members')">Batal</button></div></div>`}
async function saveMember(id){const name=document.getElementById('en')?.value.trim(),phone=document.getElementById('ep')?.value.trim()||'',role=document.getElementById('er')?.value,active=document.getElementById('ea')?.value==='true';if(state.profile?.role!=='Admin')return toast('Hanya Admin');if(!name)return toast('Nama wajib diisi');const {data,error}=await SB.rpc('admin_update_member',{p_user_id:id,p_name:name,p_phone:phone,p_role:role,p_active:active});if(error)return toast(error.message||'Gagal menyimpan');if(data?.error)return toast(data.error);await loadAll();toast('Data anggota diperbarui');members()}
function requestDeleteMember(id){if(state.profile?.role!=='Admin')return toast('Hanya Admin');if(id===state.user.id)return toast('Akun Admin sendiri tidak dapat dihapus');const m=state.members.find(x=>x.id===id);if(!m)return toast('Anggota tidak ditemukan');state.pendingDeleteMember={id,name:m.name||'anggota'};document.getElementById('deleteMemberModal')?.remove();document.body.insertAdjacentHTML('beforeend',`<div id="deleteMemberModal" class="delete-modal"><div class="delete-modal-card"><h3>Hapus Anggota?</h3><p>Yakin ingin menghapus <b>${esc(m.name||'anggota')}</b> dari daftar anggota aplikasi?</p><div class="row" style="justify-content:flex-end"><button class="btn2" onclick="closeDeleteMember()">Batal</button><button onclick="confirmDeleteMember()">Ya, Hapus</button></div></div></div>`)}
function closeDeleteMember(){state.pendingDeleteMember=null;document.getElementById('deleteMemberModal')?.remove()}
async function confirmDeleteMember(){const pending=state.pendingDeleteMember;if(!pending)return;const buttons=document.querySelectorAll('#deleteMemberModal button');buttons.forEach(b=>b.disabled=true);const {data,error}=await SB.rpc('admin_delete_member',{p_user_id:pending.id});if(error){buttons.forEach(b=>b.disabled=false);return toast(error.message||'Gagal menghapus')}if(data?.error){buttons.forEach(b=>b.disabled=false);return toast(data.error)}closeDeleteMember();await loadAll();toast('Anggota berhasil dihapus dari aplikasi');members()}

function renderSchedulePage(){app().innerHTML='<h2>Jadwal Ibadah Bulanan</h2>'+state.schedules.map(s=>`<div class="card"><b style="color:var(--red)">${esc(s.title)}</b><p>📅 ${esc(s.event_date)} • ${esc(s.event_time)}<br>📍 ${esc(s.location)}</p><button onclick="mapTo('${esc(s.location)}')">Buka Lokasi</button> ${isManager()?`<button class="btn2" onclick="delSchedule('${s.id}')">Hapus</button>`:''}</div>`).join('')+(isManager()?'<button onclick="go(\'admin\')">+ Tambah Jadwal</button>':'')}
function attendance(){app().innerHTML=`<h2>Daftar Hadir</h2><div class="card"><select id="as" onchange="attendanceList()">${state.schedules.map(s=>`<option value="${s.id}">${esc(s.title)} — ${esc(s.event_date)}</option>`).join('')}</select></div><div id="alist"></div>`;attendanceList()}
function attendanceList(){const e=document.getElementById('alist');if(!e)return;const sid=document.getElementById('as')?.value;e.innerHTML=state.members.map(m=>{const checked=state.attendance.some(a=>a.schedule_id===sid&&a.member_id===m.id&&a.status);return `<div class="card list"><div><b>${esc(m.name)}</b><div class="muted">${esc(m.role)}</div></div><input type="checkbox" style="width:24px;height:24px" ${checked?'checked':''} onchange="att('${sid}','${m.id}',this.checked)"></div>`}).join('')}
async function att(sid,mid,v){if(mid!==state.user.id&&!isManager())return toast('Anda hanya dapat mengubah kehadiran sendiri');const {error}=await SB.from('attendance').upsert({schedule_id:sid,member_id:mid,status:v},{onConflict:'schedule_id,member_id'});if(error)return toast(error.message);await loadAll();attendanceList();toast(v?'Kehadiran dicatat':'Kehadiran dibatalkan')}
function chat(){app().innerHTML=`<h2>Chat Kumpulan</h2><div id="msgs">${state.messages.map(m=>`<div class="chat ${m.sender_id===state.user.id?'me':''}"><b>${esc(m.profiles?.name||'Anggota')}</b><div>${esc(m.text)}</div><small>${new Date(m.created_at).toLocaleString('id-ID')}</small></div>`).join('')}</div><div class="card"><textarea id="ct" placeholder="Tulis pesan..."></textarea><button onclick="send()">Kirim</button></div>`}
async function send(){const t=document.getElementById('ct')?.value.trim();if(!t)return;const {error}=await SB.from('messages').insert({sender_id:state.user.id,text:t});if(error)return toast(error.message);document.getElementById('ct').value='';await loadAll();chat()}
function docs(){app().innerHTML=`<h2>Dokumentasi</h2><div class="card"><input id="photoFile" type="file" accept="image/*" onchange="uploadPhoto(this.files[0])"><div class="field"><input id="caption" placeholder="Keterangan foto"></div><p class="muted">Foto disimpan online di Supabase Storage.</p></div>${state.docs.map(d=>`<div class="card"><img class="photo" src="${esc(d.image_url)}"><b>${esc(d.caption||'Dokumentasi')}</b><p class="muted">${esc(d.profiles?.name||'Anggota')} • ${new Date(d.created_at).toLocaleString('id-ID')}</p></div>`).join('')}`}
async function uploadPhoto(file){if(!file)return;const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=state.user.id+'/'+Date.now()+'.'+ext;const {error:ue}=await SB.storage.from('documentation').upload(path,file,{upsert:false,contentType:file.type});if(ue)return toast(ue.message);const {data}=SB.storage.from('documentation').getPublicUrl(path);const caption=document.getElementById('caption')?.value||'';const {error:de}=await SB.from('documentation').insert({uploader_id:state.user.id,image_url:data.publicUrl,caption});if(de)return toast(de.message);await loadAll();docs();toast('Foto berhasil diunggah')}
async function delSchedule(id){if(!confirm('Hapus jadwal ini?'))return;const {error}=await SB.from('schedules').delete().eq('id',id);if(error)return toast(error.message);await loadAll();renderSchedulePage();}
function admin(){if(!isManager())return go('home');app().innerHTML=`<h2>Panel Pengurus</h2><div class="card"><h3>Tambah Jadwal Ibadah</h3><div class="field"><input id="st" placeholder="Judul ibadah"></div><div class="field"><input id="sd" type="date"></div><div class="field"><input id="sm" type="time"></div><div class="field"><input id="sl" placeholder="Lokasi lengkap"></div><button onclick="addS()">Simpan Jadwal</button></div><div class="card"><h3>Tambah Anggota</h3><p class="muted">Sekarang penambahan anggota dilakukan langsung dari menu <b>Anggota</b>. Admin dapat memilih peran pengurus; anggota biasa hanya dapat menambahkan anggota dengan peran Anggota.</p><button onclick="go('members')">Buka Daftar Anggota</button></div>`}
async function addS(){const title=document.getElementById('st').value.trim(),date=document.getElementById('sd').value,time=document.getElementById('sm').value,loc=document.getElementById('sl').value.trim();if(!title||!date||!loc)return toast('Lengkapi judul, tanggal dan lokasi');const {error}=await SB.from('schedules').insert({title,event_date:date,event_time:time||'',location:loc});if(error)return toast(error.message);await loadAll();toast('Jadwal tersimpan');go('schedule')}
function profile(){app().innerHTML=`<h2>Profil</h2><div class="card"><div class="person"><div class="avatar">${esc((state.profile?.name||'?')[0])}</div><div><b>${esc(state.profile?.name||'')}</b><div class="muted">Peran: ${esc(state.profile?.role||'')}</div><div class="muted">${esc(state.user?.email||'')}</div></div></div></div><button class="btn2" onclick="logout()">Keluar</button>`}
function subscribeRealtime(){SB.channel('pssab-live-'+state.user.id).on('postgres_changes',{event:'*',schema:'public',table:'messages'},async()=>{await loadAll();if(location.hash==='#chat')chat()}).on('postgres_changes',{event:'*',schema:'public',table:'schedules'},async()=>{await loadAll();if(location.hash==='#schedule'||location.hash==='#home')render()}).on('postgres_changes',{event:'*',schema:'public',table:'attendance'},async()=>{await loadAll();if(location.hash==='#attendance')attendanceList()}).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},async()=>{await loadAll();if(location.hash==='#members')members()}).subscribe()}
window.addEventListener('hashchange',render);showLogin('Memeriksa sesi login...');boot();
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});}
