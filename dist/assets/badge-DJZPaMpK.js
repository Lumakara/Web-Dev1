import{j as w,R as J,C as X,b as Q,d as ee,P as te,O as ae,S as re}from"./ui-vendor-q7wFqjOa.js";import{c as A,_ as z,s as d,a as ie}from"./index-CL1up3YA.js";import{X as ne}from"./icons-Bd72YT1L.js";import{i as oe,g as se,a as K,b as de,G as ce,s as ue,c as pe,e as le,u as j,d as me,f as ge,h as he,j as fe,o as we,q as b,k as v,l as R,m as H,n as p,p as I,r as ye,t as C,v as x,w as D,x as P,y as l}from"./firebase-BZSrvpf7.js";import{a as g}from"./utils-CUtzRjuR.js";function Ue({...e}){return w.jsx(J,{"data-slot":"dialog",...e})}function Ee({...e}){return w.jsx(te,{"data-slot":"dialog-portal",...e})}function be({className:e,...t}){return w.jsx(ae,{"data-slot":"dialog-overlay",className:A("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",e),...t})}function Pe({className:e,children:t,showCloseButton:a=!0,...r}){return w.jsxs(Ee,{"data-slot":"dialog-portal",children:[w.jsx(be,{}),w.jsxs(X,{"data-slot":"dialog-content",className:A("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",e),...r,children:[t,a&&w.jsxs(Q,{"data-slot":"dialog-close",className:"ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",children:[w.jsx(ne,{}),w.jsx("span",{className:"sr-only",children:"Close"})]})]})]})}function Oe({className:e,...t}){return w.jsx("div",{"data-slot":"dialog-header",className:A("flex flex-col gap-2 text-center sm:text-left",e),...t})}function Ce({className:e,...t}){return w.jsx(ee,{"data-slot":"dialog-title",className:A("text-lg leading-none font-semibold",e),...t})}const Re=()=>{const e={apiKey:"AIzaSyB-ZPr8YsplSZUCkV_68s3vpdmbL-I_ph0",authDomain:"lumakara-2007.firebaseapp.com",projectId:"lumakara-2007",storageBucket:"lumakara-2007.firebasestorage.app",messagingSenderId:"140004453157",appId:"1:140004453157:web:9bd749a8587179d50dc8cc",measurementId:"G-VS6TX3E3ZL"};return["apiKey","authDomain","projectId","appId"].filter(a=>!e[a]||e[a]===`your-${a.replace(/[A-Z]/g,"-$1").toLowerCase()}`),e},T=Re();let k,m,L,G,O,f=!1,W=null;try{k=oe(T),m=se(k),L=K(k),G=de(k),O=new ce,O.setCustomParameters({prompt:"select_account"}),ue(m,pe).catch(e=>{}),le(L).catch(e=>{e.code==="failed-precondition"||e.code}),f=!0}catch(e){W=e,k={},m={},L={},G={},O={}}const $=e=>{const t=e.code||"",a=e.message||"";return{"auth/user-not-found":"Email tidak terdaftar","auth/wrong-password":"Password salah","auth/invalid-email":"Email tidak valid","auth/email-already-in-use":"Email sudah terdaftar","auth/weak-password":"Password terlalu lemah (min. 6 karakter)","auth/popup-closed-by-user":"Login dibatalkan","auth/cancelled-popup-request":"Login dibatalkan","auth/popup-blocked":"Popup diblokir browser, izinkan popup untuk login","auth/network-request-failed":"Koneksi internet bermasalah","auth/too-many-requests":"Terlalu banyak percobaan, coba lagi nanti","auth/invalid-credential":"Kredensial tidak valid","auth/operation-not-allowed":"Operasi tidak diizinkan","auth/account-exists-with-different-credential":"Akun sudah ada dengan metode login berbeda","auth/invalid-api-key":"Konfigurasi Firebase tidak valid","auth/app-not-authorized":"Aplikasi tidak diizinkan"}[t]||a||"Terjadi kesalahan, coba lagi"},xe={isReady(){return f&&!!m.currentUser!==void 0},getStatus(){const e=!!(T.apiKey&&T.authDomain&&T.projectId&&T.appId);return{isInitialized:f,isConfigured:e,error:W?.message||null,projectId:T.projectId||null}},getCurrentUser(){return f?m.currentUser:null},onAuthStateChanged(e){return f?we(m,e):(e(null),()=>{})},async signInWithGoogle(){if(!f)throw new Error("Firebase belum diinisialisasi. Periksa konfigurasi.");try{const t=(await fe(m,O)).user;return{uid:t.uid,email:t.email,displayName:t.displayName,photoURL:t.photoURL,phoneNumber:t.phoneNumber,emailVerified:t.emailVerified,createdAt:t.metadata.creationTime,lastLoginAt:t.metadata.lastSignInTime}}catch(e){const t=$(e);throw new Error(t)}},async signInWithEmail(e,t){if(!f)throw new Error("Firebase belum diinisialisasi. Periksa konfigurasi.");try{const r=(await he(m,e,t)).user;return{uid:r.uid,email:r.email,displayName:r.displayName,photoURL:r.photoURL,phoneNumber:r.phoneNumber,emailVerified:r.emailVerified,createdAt:r.metadata.creationTime,lastLoginAt:r.metadata.lastSignInTime}}catch(a){const r=$(a);throw new Error(r)}},async registerWithEmail(e,t,a){if(!f)throw new Error("Firebase belum diinisialisasi. Periksa konfigurasi.");try{const i=(await ge(m,e,t)).user;return await j(i,{displayName:a}),await i.reload(),{uid:i.uid,email:i.email,displayName:i.displayName,photoURL:i.photoURL,phoneNumber:i.phoneNumber,emailVerified:i.emailVerified,createdAt:i.metadata.creationTime,lastLoginAt:i.metadata.lastSignInTime}}catch(r){const i=$(r);throw new Error(i)}},async signOut(){if(!f)throw new Error("Firebase belum diinisialisasi");try{await me(m)}catch(e){throw new Error($(e))}},async updateProfile(e){if(!f)throw new Error("Firebase belum diinisialisasi");const t=m.currentUser;if(!t)throw new Error("Tidak ada user yang login");try{await j(t,e)}catch(a){throw new Error($(a))}},async sendPasswordResetEmail(e){if(!f)throw new Error("Firebase belum diinisialisasi");try{const{sendPasswordResetEmail:t}=await z(async()=>{const{sendPasswordResetEmail:a}=await import("./firebase-BZSrvpf7.js").then(r=>r.C);return{sendPasswordResetEmail:a}},[]);await t(m,e)}catch(t){throw new Error($(t))}},async reloadCurrentUser(){if(!f||!m.currentUser)return null;try{await m.currentUser.reload();const e=m.currentUser;return{uid:e.uid,email:e.email,displayName:e.displayName,photoURL:e.photoURL,phoneNumber:e.phoneNumber,emailVerified:e.emailVerified,createdAt:e.metadata.creationTime,lastLoginAt:e.metadata.lastSignInTime}}catch{return null}}};let n,N=!1;try{if(f&&k&&Object.keys(k).length>0)n=K(k),N=!0;else throw new Error("Firebase app not initialized, cannot create Firestore instance")}catch(e){d("💥 FIREBASE DB INIT ERROR",{Error:e?.message||"Unknown",Status:"Using mock data"},"error"),n={}}const F=()=>{if(!N)return`local-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;try{return p(R(n,"_")).id}catch{return`local-${Date.now()}-${Math.random().toString(36).substr(2,9)}`}},c=e=>{if(e)try{return e.toDate().toISOString()}catch{return}},o=()=>!(!N||!n||Object.keys(n).length===0),Le={async getAll(e){if(!o())return S();try{let t=b(R(n,"products"),v(e?.orderByField||"created_at","desc"));if(e?.category&&(t=b(R(n,"products"),D("category","==",e.category),v(e?.orderByField||"created_at","desc"))),e?.limit){const{limit:i}=await z(async()=>{const{limit:u}=await import("./firebase-BZSrvpf7.js").then(y=>y.D);return{limit:u}},[]);t=b(t,i(e.limit))}const a=await P(t);return a.empty?S():a.docs.map(i=>({id:i.id,...i.data(),created_at:c(i.data().created_at),updated_at:c(i.data().updated_at)}))}catch(t){return d("💥 FIRESTORE FETCH PRODUCTS ERROR",{Error:t?.message||"Unknown"},"error"),S()}},async getById(e){if(!o())return S().find(t=>t.id===e)||null;try{const t=p(n,"products",e),a=await C(t);if(a.exists()){const i=a.data();return{id:a.id,...i,created_at:c(i.created_at),updated_at:c(i.updated_at)}}const r=S().find(i=>i.id===e);return r||null}catch(t){return d("💥 FIRESTORE FETCH PRODUCT ERROR",{Error:t?.message||"Unknown","Product ID":e},"error"),S().find(a=>a.id===e)||null}},async create(e){const t=F();if(!o())throw new Error("Database not connected");const a=p(n,"products",t),r={...e,created_at:l(),updated_at:l()};return await x(a,r),{id:t,...e,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}},async update(e,t){if(!o())throw new Error("Database not connected");const a=p(n,"products",e),r={...t,updated_at:l()};await I(a,r);const u=(await C(a)).data();return{id:e,...u,created_at:c(u?.created_at),updated_at:c(u?.updated_at)}},async delete(e){if(!o())throw new Error("Database not connected");const t=p(n,"products",e);await ye(t)},async updateStock(e,t){if(!o())throw new Error("Database not connected");const a=p(n,"products",e);await I(a,{stock:t,updated_at:l()})},async updatePrice(e,t,a){if(!o())throw new Error("Database not connected");const r=p(n,"products",e),i={base_price:t,updated_at:l()};a!==void 0&&(i.discount_price=a),await I(r,i)},onProductsChange(e){if(!o())return e(S()),()=>{};const t=b(R(n,"products"),v("created_at","desc"));return H(t,a=>{const r=a.docs.map(i=>({id:i.id,...i.data(),created_at:c(i.data().created_at),updated_at:c(i.data().updated_at)}));e(r)},a=>{e(S())})}},Me={async getProfile(e){if(!o())return null;try{const t=p(n,"profiles",e),a=await C(t);if(a.exists()){const r=a.data();return{id:a.id,...r,created_at:c(r.created_at),updated_at:c(r.updated_at)}}return null}catch(t){return d("💥 FIRESTORE FETCH PROFILE ERROR",{Error:t?.message||"Unknown"},"error"),null}},async createProfile(e){if(!o())throw new Error("Database not connected");const t=p(n,"profiles",e.id);await x(t,{...e,full_name:e.full_name||"User",created_at:l(),updated_at:l()})},async updateProfile(e,t){if(!o())throw new Error("Database not connected");const a=p(n,"profiles",e);await I(a,{...t,updated_at:l()})},async isAdmin(e){if(!o())return!1;try{const t=p(n,"profiles",e),a=await C(t);return a.exists()?a.data()?.is_admin===!0:!1}catch{return!1}},async setAdmin(e,t){if(!o())throw new Error("Database not connected");const a=p(n,"profiles",e);await I(a,{is_admin:t,updated_at:l()})}},De={async create(e){const t=F();if(!o())throw new Error("Database not connected");const a=p(n,"support_tickets",t),r={...e,status:"open",created_at:l(),updated_at:l()};return await x(a,r),{id:t,...e,status:"open",created_at:new Date().toISOString(),updated_at:new Date().toISOString()}},async getByUser(e){if(!o())return[];try{const t=b(R(n,"support_tickets"),D("user_id","==",e),v("created_at","desc"));return(await P(t)).docs.map(r=>({id:r.id,...r.data(),created_at:c(r.data().created_at),updated_at:c(r.data().updated_at)}))}catch(t){return d("💥 FIRESTORE FETCH USER TICKETS ERROR",{Error:t?.message||"Unknown"},"error"),[]}},async getAll(){if(!o())return[];try{const e=b(R(n,"support_tickets"),v("created_at","desc"));return(await P(e)).docs.map(a=>({id:a.id,...a.data(),created_at:c(a.data().created_at),updated_at:c(a.data().updated_at)}))}catch(e){return d("💥 FIRESTORE FETCH ALL TICKETS ERROR",{Error:e?.message||"Unknown"},"error"),[]}},async updateStatus(e,t,a){if(!o())throw new Error("Database not connected");const r=p(n,"support_tickets",e),i={status:t,updated_at:l()};a&&(i.response=a),await I(r,i)}},Ne={async create(e){const t=F();if(!o())throw new Error("Database not connected");const a=p(n,"orders",t),r={...e,created_at:l(),updated_at:l()};return await x(a,r),{id:t,...e,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}},async getByUser(e){if(!o())return[];try{const t=b(R(n,"orders"),D("user_id","==",e),v("created_at","desc"));return(await P(t)).docs.map(r=>({id:r.id,...r.data(),created_at:c(r.data().created_at),updated_at:c(r.data().updated_at)}))}catch(t){return d("💥 FIRESTORE FETCH USER ORDERS ERROR",{Error:t?.message||"Unknown"},"error"),[]}},async getAll(){if(!o())return[];try{const e=b(R(n,"orders"),v("created_at","desc"));return(await P(e)).docs.map(a=>({id:a.id,...a.data(),created_at:c(a.data().created_at),updated_at:c(a.data().updated_at)}))}catch(e){return d("💥 FIRESTORE FETCH ALL ORDERS ERROR",{Error:e?.message||"Unknown"},"error"),[]}},async updateStatus(e,t){if(!o())throw new Error("Database not connected");const a=p(n,"orders",e);await I(a,{status:t,updated_at:l()})},async updatePayment(e,t,a="paid"){if(!o())throw new Error("Database not connected");const r=p(n,"orders",e);await I(r,{payment_reference:t,status:a,updated_at:l()})},onOrdersChange(e){if(!o())return()=>{};const t=b(R(n,"orders"),v("created_at","desc"));return H(t,a=>{const r=a.docs.map(i=>({id:i.id,...i.data(),created_at:c(i.data().created_at),updated_at:c(i.data().updated_at)}));e(r)},a=>{})}};function S(){return[{id:"wifi",title:"Wi-Fi Installation Service",category:"installation",base_price:89e3,discount_price:79e3,stock:100,image:"https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400",icon:"https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200",rating:4.8,reviews:156,duration:"2-3 jam",description:"Pemasangan dan konfigurasi jaringan wireless profesional untuk rumah dan kantor.",tags:["network","internet","setup"],tiers:[{name:"Basic",price:89e3,features:["Setup 1 router","Konfigurasi dasar","Optimasi kecepatan","Garansi 1 tahun"]},{name:"Standard",price:149e3,features:["Setup mesh network","Keamanan advanced","Optimasi multi device","Guest network","Garansi 2 tahun"]},{name:"Premium",price:249e3,features:["Enterprise mesh system","Security suite","IoT management","Priority support","Garansi 3 tahun"]}],related:["vps","code","panel"],requiresForm:!0,formType:"wifi"},{id:"cctv",title:"CCTV Security System",category:"installation",base_price:199e3,discount_price:179e3,stock:50,image:"https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=400",icon:"https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=200",rating:4.7,reviews:89,duration:"4-6 jam",description:"Instalasi kamera keamanan lengkap dengan monitoring dan akses mobile.",tags:["security","camera","monitoring"],tiers:[{name:"Basic",price:199e3,features:["2 kamera HD","Recording dasar","Akses mobile app","Storage 1 TB"]},{name:"Standard",price:399e3,features:["4 kamera 4K","Night vision","Motion detection","Cloud backup","Storage 2 TB"]},{name:"Premium",price:699e3,features:["8 kamera 4K","AI detection","24/7 monitoring","Professional monitoring","Storage 4 TB"]}],related:["wifi","vps","panel"]},{id:"code",title:"Code Error Repair",category:"technical",base_price:59e3,discount_price:49e3,stock:200,image:"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400",icon:"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=200",rating:4.9,reviews:234,duration:"1-4 jam",description:"Debugging dan optimasi kode expert untuk website dan aplikasi.",tags:["debugging","coding","development"],tiers:[{name:"Basic",price:59e3,features:["Identifikasi bug","Fix sederhana","Code review","Dokumentasi"]},{name:"Standard",price:129e3,features:["Complex debugging","Performance optimization","Security audit","Testing"]},{name:"Premium",price:249e3,features:["Full code refactoring","Architecture review","Performance tuning","Long-term support"]}],related:["vps","wifi","website"]},{id:"photo",title:"Photo Editing",category:"creative",base_price:29e3,discount_price:25e3,stock:150,image:"https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400",icon:"https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=200",rating:4.6,reviews:120,duration:"1-2 hari",description:"Retouching dan enhancement gambar profesional.",tags:["photo","editing","creative"],tiers:[{name:"Basic",price:29e3,features:["Color correction","Basic retouching","Format conversion","5 revisi"]},{name:"Standard",price:79e3,features:["Advanced retouching","Background removal","Skin smoothing","Unlimited revisi"]},{name:"Premium",price:149e3,features:["High-end editing","Composite work","RAW processing","Priority delivery"]}],related:["video","code","design"]},{id:"video",title:"Video Editing",category:"creative",base_price:79e3,discount_price:69e3,stock:80,image:"https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400",icon:"https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=200",rating:4.8,reviews:95,duration:"2-5 hari",description:"Editing video dan post-production profesional.",tags:["video","editing","production"],tiers:[{name:"Basic",price:79e3,features:["Basic cuts","Transitions","Audio sync","Output 1080p"]},{name:"Standard",price:199e3,features:["Color grading","Motion graphics","Sound mixing","Output 4K"]},{name:"Premium",price:399e3,features:["VFX","Animation","Professional sound design","Cinema quality"]}],related:["photo","code","design"]},{id:"vps",title:"VPS Hosting",category:"technical",base_price:49e3,discount_price:39e3,stock:500,image:"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400",icon:"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200",rating:4.5,reviews:180,duration:"Instant",description:"Solusi hosting Virtual Private Server.",tags:["hosting","server","infrastructure"],tiers:[{name:"Basic",price:49e3,features:["2 CPU cores","4GB RAM","50GB SSD","1TB bandwidth"]},{name:"Standard",price:99e3,features:["4 CPU cores","8GB RAM","100GB SSD","2TB bandwidth"]},{name:"Premium",price:199e3,features:["8 CPU cores","16GB RAM","200GB SSD","Unlimited bandwidth"]}],related:["wifi","code","panel"]},{id:"panel",title:"Panel Pterodactyl",category:"technical",base_price:15e4,discount_price:129e3,stock:100,image:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400",icon:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200",rating:4.9,reviews:145,duration:"1-2 jam",description:"Panel manajemen game server Pterodactyl profesional dengan domain custom.",tags:["game","server","panel","hosting","pterodactyl"],tiers:[{name:"Starter",price:129e3,features:["1GB RAM per server","3 servers","Unlimited databases","SFTP Access","Domain: panel.lumakara.my.id"]},{name:"Pro",price:249e3,features:["2GB RAM per server","5 servers","Unlimited databases","SFTP Access","Backup system","Domain: panel.lumakara.my.id"]},{name:"Enterprise",price:499e3,features:["4GB RAM per server","10 servers","Unlimited databases","SFTP Access","Backup system","Priority support","Domain: panel.lumakara.my.id"]}],related:["vps","code","wifi"],requiresForm:!0,formType:"panel"},{id:"website",title:"Website Development",category:"technical",base_price:999e3,discount_price:799e3,stock:30,image:"https://images.unsplash.com/photo-1547658719-da2b51169166?w=400",icon:"https://images.unsplash.com/photo-1547658719-da2b51169166?w=200",rating:4.8,reviews:78,duration:"7-14 hari",description:"Pembuatan website profesional dengan desain modern.",tags:["website","development","coding","design"],tiers:[{name:"Landing Page",price:799e3,features:["1 halaman","Design responsive","SEO basic","3 revisi"]},{name:"Company Profile",price:1499e3,features:["5-7 halaman","Design custom","SEO optimized","CMS integration","5 revisi"]},{name:"E-Commerce",price:2999e3,features:["Unlimited halaman","Design premium","Payment gateway","Admin dashboard","Unlimited revisi"]}],related:["code","photo","video"]},{id:"design",title:"Graphic Design",category:"creative",base_price:149e3,discount_price:99e3,stock:200,image:"https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400",icon:"https://images.unsplash.com/photo-1626785774573-4b799315345d?w=200",rating:4.7,reviews:112,duration:"2-5 hari",description:"Jasa desain grafis profesional untuk logo dan branding.",tags:["design","creative","branding","logo"],tiers:[{name:"Basic",price:99e3,features:["1 konsep logo","File PNG & JPG","3 revisi","Hak cipta penuh"]},{name:"Business",price:249e3,features:["3 konsep logo","File vector","Social media kit","5 revisi","Hak cipta penuh"]},{name:"Complete Branding",price:599e3,features:["5 konsep logo","Complete brand identity","Stationery design","Social media kit","Brand guidelines","Unlimited revisi"]}],related:["photo","video","website"]}]}const _e="8010136953:AAHnKUy_0jgJN5grZIgSDzbtTJznfqq5was",E="1841202339",h=`https://api.telegram.org/bot${_e}`;function V(e){return{pending:"⏳",processing:"🔧",completed:"✅",delivered:"📦",cancelled:"❌",refunded:"💸",failed:"⚠️",success:"✅",paid:"💰",shipped:"🚚","on-hold":"⏸️",waiting:"⏰"}[e.toLowerCase()]||"📋"}function q(e){return{credit_card:"💳",debit_card:"💳",bank_transfer:"🏦","e-wallet":"👛",ewallet:"👛",paypal:"💰",crypto:"₿",cod:"💵",cash_on_delivery:"💵",virtual_account:"🏧"}[e.toLowerCase()]||"💳"}function M(e){return e.map((t,a)=>`${a+1}. *${t.title}* (${t.tier})
   ├ Qty: ${t.quantity}
   └ Price: Rp ${t.price.toLocaleString("id-ID")}`).join(`
`)}function s(e){return e.replace(/[_*\[\]()~`>#+=|{}.!-]/g,"\\$&")}const Fe={async sendLoginNotification(e,t){try{const a=new Date().toLocaleString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}),r=t?.device||"Unknown Device",i=t?.browser||"Unknown Browser",u=t?.os||"Unknown OS",y=t?.ip||"Unknown IP",_=`
🔐 *USER LOGIN*

👤 *User Information*
├ Name: ${s(e.name)}
├ Email: ${s(e.email)}
${e.role?`├ Role: ${e.role}`:""}
└ User ID: ${e.id||"N/A"}

📱 *Device Information*
├ Device: ${r}
├ Browser: ${i}
├ OS: ${u}
└ IP Address: ${y}

🕐 *Login Time:* ${a}

━━━━━━━━━━━━━━━━━━━━
⚡ User successfully logged into the system.
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:_,parse_mode:"MarkdownV2"})).data.ok}catch(a){d("💥 TELEGRAM LOGIN ERROR",{Error:a.response?.data?.description||a.message||"Unknown"},"error")}},async sendLogoutNotification(e,t){try{const a=new Date().toLocaleString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}),r=t?`
⏱️ *Session Duration:* ${t}`:"",i=`
🚪 *USER LOGOUT*

👤 *User Information*
├ Name: ${s(e.name)}
├ Email: ${s(e.email)}
${e.role?`├ Role: ${e.role}`:""}
└ User ID: ${e.id||"N/A"}

🕐 *Logout Time:* ${a}${r}

━━━━━━━━━━━━━━━━━━━━
👋 User has logged out from the system.
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:i,parse_mode:"MarkdownV2"})).data.ok}catch(a){d("💥 TELEGRAM LOGOUT ERROR",{Error:a.response?.data?.description||a.message||"Unknown"},"error")}},async sendCheckoutNotification(e){try{const t=new Date().toLocaleString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}),a=M(e.items),r=e.items.reduce((Z,Y)=>Z+Y.quantity,0),i=e.subtotal?`
├ Subtotal: Rp ${e.subtotal.toLocaleString("id-ID")}`:"",u=e.tax?`
├ Tax: Rp ${e.tax.toLocaleString("id-ID")}`:"",y=e.shipping?`
├ Shipping: Rp ${e.shipping.toLocaleString("id-ID")}`:"",_=e.discount?`
├ Discount: -Rp ${e.discount.toLocaleString("id-ID")}`:"",U=e.couponCode?`
├ Coupon: ${e.couponCode}`:"",B=`
🛒 *CHECKOUT INITIATED*

👤 *Customer Information*
├ Name: ${s(e.user.name)}
├ Email: ${s(e.user.email)}
└ User ID: ${e.user.id||"N/A"}

📦 *Cart Items* (${r} items)
${a}

💰 *Payment Summary*${i}${u}${y}${_}${U}
└ *Total Amount: Rp ${e.totalAmount.toLocaleString("id-ID")}*

🕐 *Checkout Time:* ${t}

━━━━━━━━━━━━━━━━━━━━
🛍️ Customer is proceeding to payment.
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:B,parse_mode:"MarkdownV2"})).data.ok}catch(t){d("💥 TELEGRAM CHECKOUT ERROR",{Error:t.response?.data?.description||t.message||"Unknown"},"error")}},async sendPaymentSuccessNotification(e){try{const t=new Date().toLocaleString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}),a=q(e.paymentMethod),r=e.items?`

📦 *Order Items:*
`+M(e.items):"",i=`
✅ *PAYMENT SUCCESSFUL*

💳 *Payment Details*
├ Order ID: #${e.orderId}
${e.transactionId?`├ Transaction ID: ${e.transactionId}`:""}
├ Amount: Rp ${e.amount.toLocaleString("id-ID")}
${a} Method: ${e.paymentMethod}
└ Status: ✅ SUCCESS

👤 *Customer Information*
├ Name: ${s(e.customerName)}
└ Email: ${s(e.customerEmail)}
${r}

🕐 *Payment Time:* ${t}

━━━━━━━━━━━━━━━━━━━━
🎉 Payment confirmed! Order is ready for processing.
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:i,parse_mode:"MarkdownV2"})).data.ok}catch(t){d("💥 TELEGRAM PAYMENT ERROR",{Error:t.response?.data?.description||t.message||"Unknown"},"error")}},async sendOrderStatusUpdate(e,t){try{const a=new Date().toLocaleString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}),r=V(e.previousStatus),i=V(t),u=e.items?`

📦 *Order Items:*
`+M(e.items):"",y=`
📊 *ORDER STATUS UPDATE*

📋 *Order Information*
├ Order ID: #${e.orderId}
├ Amount: Rp ${e.totalAmount.toLocaleString("id-ID")}
└ Status Change: ${r} ${e.previousStatus.toUpperCase()} → ${i} ${t.toUpperCase()}

👤 *Customer Information*
├ Name: ${s(e.customerName)}
└ Email: ${s(e.customerEmail)}
${u}

🕐 *Update Time:* ${a}

━━━━━━━━━━━━━━━━━━━━
📢 Order status has been updated to *${t.toUpperCase()}*.
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:y,parse_mode:"MarkdownV2"})).data.ok}catch(a){d("💥 TELEGRAM ORDER ERROR",{Error:a.response?.data?.description||a.message||"Unknown"},"error")}},async sendNewUserNotification(e){try{const t=new Date().toLocaleString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}),a=e.registrationMethod?`
├ Registration Method: ${e.registrationMethod}`:"",r=e.referralCode?`
├ Referral Code: ${e.referralCode}`:"",i=`
🎉 *NEW USER REGISTRATION*

👤 *User Information*
├ Name: ${s(e.name)}
├ Email: ${s(e.email)}
${e.id?`├ User ID: ${e.id}`:""}
${e.role?`├ Role: ${e.role}`:""}${a}${r}

🕐 *Registration Time:* ${t}

━━━━━━━━━━━━━━━━━━━━
🚀 A new user has joined the platform!
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:i,parse_mode:"MarkdownV2"})).data.ok}catch(t){d("💥 TELEGRAM NEW USER ERROR",{Error:t.response?.data?.description||t.message||"Unknown"},"error")}},async sendTicketNotification(e){try{const a={general:"❓",technical:"🔧",billing:"💳",account:"👤",bug:"🐛",feature:"💡",complaint:"📝",other:"📌"}[e.category.toLowerCase()]||"🎫",r=`
🎫 *NEW SUPPORT TICKET RECEIVED*

📋 *Ticket Details*
├ Ticket ID: #${e.ticketId}
├ Subject: ${s(e.subject)}
${a} Category: ${e.category}
├ Priority: MEDIUM

👤 *Contact Information*
└ Email: ${s(e.email)}

📝 *Description:*
${s(e.description)}

🕐 *Submitted:* ${e.timestamp}

━━━━━━━━━━━━━━━━━━━━
⚡ Please respond to this ticket as soon as possible.
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:r,parse_mode:"MarkdownV2"})).data.ok}catch(t){d("💥 TELEGRAM TICKET ERROR",{Error:t.response?.data?.description||t.message||"Unknown"},"error")}},async sendAdminLoginNotification(e){try{const t=new Date().toLocaleString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",timeZoneName:"short"}),a=e.device||"Unknown Device",r=e.browser||"Unknown Browser",i=e.os||"Unknown OS",u=e.ipAddress||"Unknown IP",y=e.location?`
├ Location: ${e.location}`:"",_=e.userAgent?`
├ User Agent: ${e.userAgent.slice(0,50)}...`:"",U=`
🔴 *ADMIN LOGIN ALERT*

⚠️ *Administrator Access Detected*

👤 *Admin Information*
├ Name: ${s(e.name)}
├ Email: ${s(e.email)}
└ Role: ADMINISTRATOR

📱 *Device Information*
├ Device: ${a}
├ Browser: ${r}
├ OS: ${i}
├ IP Address: ${u}${y}${_}

🕐 *Login Time:* ${t}

━━━━━━━━━━━━━━━━━━━━
🔒 Admin panel access granted. Please verify this is authorized.
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:U,parse_mode:"MarkdownV2"})).data.ok}catch(t){d("💥 TELEGRAM ADMIN ERROR",{Error:t.response?.data?.description||t.message||"Unknown"},"error")}},async sendOrderNotification(e){try{const t=e.items.map(i=>`• ${s(i.title)} (${i.tier}) x${i.quantity} - Rp ${i.price.toLocaleString("id-ID")}`).join(`
`),a=`
🛒 *NEW ORDER RECEIVED*

📋 *Order ID:* #${e.orderId}
👤 *Customer:* ${s(e.customerName)}
📧 *Email:* ${s(e.customerEmail)}
💰 *Total:* Rp ${e.totalAmount.toLocaleString("id-ID")}
🕐 *Time:* ${e.timestamp}

📦 *Order Items:*
${t}

━━━━━━━━━━━━━━━━━━━━
Please process this order immediately.
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:a,parse_mode:"MarkdownV2"})).data.ok}catch(t){d("💥 TELEGRAM ORDER ERROR",{Error:t.response?.data?.description||t.message||"Unknown"},"error")}},async sendPaymentNotification(e,t,a,r){try{const i=r==="success"?"✅":"❌",u=q(a),y=new Date().toLocaleString("id-ID"),_=`
${i} *PAYMENT NOTIFICATION*

📋 *Order ID:* #${e}
💰 *Amount:* Rp ${t.toLocaleString("id-ID")}
${u} *Method:* ${a}
📊 *Status:* ${r.toUpperCase()}
🕐 *Time:* ${y}

━━━━━━━━━━━━━━━━━━━━
      `.trim();(await g.post(`${h}/sendMessage`,{chat_id:E,text:_,parse_mode:"Markdown"})).data.ok}catch(i){d("💥 TELEGRAM PAYMENT ERROR",{Error:i.response?.data?.description||i.message||"Unknown"},"error")}},async sendCustomMessage(e,t="Markdown"){try{(await g.post(`${h}/sendMessage`,{chat_id:E,text:e,parse_mode:t})).data.ok}catch(a){d("💥 TELEGRAM MESSAGE ERROR",{Error:a.response?.data?.description||a.message||"Unknown"},"error")}},async testConnection(){try{const e=await g.get(`${h}/getMe`);return e.data.ok,e.data.ok}catch{return d("💥 TELEGRAM CONNECTION ERROR",{Status:"Failed to connect"},"error"),!1}},async getBotInfo(){try{const e=await g.get(`${h}/getMe`);return e.data.ok?{firstName:e.data.result.first_name,username:e.data.result.username,id:e.data.result.id}:null}catch{return null}}};function Be({className:e,type:t,...a}){return w.jsx("input",{type:t,"data-slot":"input",className:A("file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm","focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]","aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",e),...a})}const Se=ie("inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",{variants:{variant:{default:"border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",secondary:"border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",destructive:"border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",outline:"text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"}},defaultVariants:{variant:"default"}});function je({className:e,variant:t,asChild:a=!1,...r}){const i=a?re:"span";return w.jsx(i,{"data-slot":"badge",className:A(Se({variant:t}),e),...r})}export{je as B,Ue as D,xe as F,Be as I,Ne as O,Le as P,Fe as T,Me as U,Pe as a,Ce as b,Oe as c,De as d,G as s};
