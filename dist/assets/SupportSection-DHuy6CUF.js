import{j as e}from"./ui-vendor-q7wFqjOa.js";import{r as o}from"./react-core-uW5GauGR.js";import{s as v,B as f}from"./index-CL1up3YA.js";import{d as S,T as M,D as O,a as z,c as Q,b as X,I as C}from"./badge-DJZPaMpK.js";import{T as Z}from"./textarea-CQ7D91hS.js";import{L as y}from"./label-C8Dy0a63.js";import{S as J,a as Y,b as ee,c as ae,d as te}from"./select-C96jmM-n.js";import{C as T,c as L}from"./card-Cmhyo_6H.js";import{E as U,S as se}from"./App-BA4Lo1Iq.js";import{u as V,a as u}from"./appStore-DZKr_UpI.js";import{u as ie}from"./useProducts-ILBgL--I.js";import{t as F}from"./notifications-Bi33bcEl.js";import{e as ne,t as A,am as re,al as le,an as ce,ao as oe,n as de,ak as me,o as ue,G as ge,y as he,z as K,X as pe,Z as xe}from"./icons-Bd72YT1L.js";import"./utils-CUtzRjuR.js";import"./firebase-BZSrvpf7.js";import"./NotFound-CrDRqvXg.js";import"./state-BjmFXnif.js";const be=()=>{const{user:h}=V(),[m,s]=o.useState(!1),[a,l]=o.useState([]),r=o.useCallback(async c=>{s(!0);try{const i=await S.create({user_id:h?.uid,subject:c.subject,category:c.category,email:c.email,description:c.description});return await M.sendTicketNotification({ticketId:i.id,subject:i.subject,category:i.category,email:i.email,description:i.description,timestamp:new Date(i.created_at||"").toLocaleString("id-ID")}),await U.sendNotificationEmail("admin@lumakara.com","Admin","🎫 Tiket Baru: "+i.subject,`Tiket dukungan baru telah dibuat:

📋 ID: #${i.id}
📌 Subjek: ${i.subject}
🏷️ Kategori: ${i.category}
📧 Email Pengirim: ${i.email}
🕐 Waktu: ${new Date(i.created_at||"").toLocaleString("id-ID")}

📝 Deskripsi:
${i.description}

Silakan segera ditindaklanjuti.`),await U.sendNotificationEmail(i.email,"Pengguna","Tiket Dukungan Anda Telah Diterima",`Halo,

Terima kasih telah menghubungi kami. Tiket dukungan Anda telah berhasil dibuat.

📋 ID Tiket: #${i.id}
📌 Subjek: ${i.subject}
🏷️ Kategori: ${i.category}
🕐 Waktu: ${new Date(i.created_at||"").toLocaleString("id-ID")}

Tim support kami akan segera meninjau dan merespons tiket Anda dalam waktu 2-4 jam.

Salam,
Tim Layanan Digital`),i}catch(i){throw v("💥 SUBMIT TICKET ERROR",{Error:i?.message||"Unknown"},"error"),i}finally{s(!1)}},[h?.uid]),j=o.useCallback(async()=>{if(h?.uid)try{const c=await S.getByUser(h.uid);l(c)}catch(c){v("💥 FETCH USER TICKETS ERROR",{Error:c?.message||"Unknown"},"error")}},[h?.uid]),x=o.useCallback(async()=>{try{const c=await S.getAll();l(c)}catch(c){v("💥 FETCH ALL TICKETS ERROR",{Error:c?.message||"Unknown"},"error")}},[]);return{tickets:a,isSubmitting:m,submitTicket:r,fetchUserTickets:j,fetchAllTickets:x}},ke=[{question:"Berapa lama waktu instalasi Wi-Fi?",answer:"Waktu instalasi Wi-Fi biasanya memakan waktu 1-2 jam tergantung ukuran rumah dan kompleksitas jaringan. Tim kami akan memberikan estimasi waktu yang lebih akurat setelah survey lokasi."},{question:"Apa yang termasuk dalam paket instalasi CCTV?",answer:"Paket instalasi CCTV kami mencakup pemasangan kamera, setup DVR, konfigurasi aplikasi mobile, dan training dasar penggunaan. Garansi perangkat juga disertakan sesuai tier yang dipilih."},{question:"Apakah ada garansi untuk layanan yang diberikan?",answer:"Ya, semua layanan kami dilengkapi dengan garansi. Periode garansi bervariasi tergantung jenis layanan dan tier yang dipilih, mulai dari 1 tahun hingga 3 tahun."},{question:"Bagaimana cara melacak status pesanan saya?",answer:"Anda dapat melacak status pesanan melalui menu Profil > Riwayat Pesanan. Status pesanan akan diupdate secara real-time dan Anda juga akan menerima notifikasi email untuk setiap perubahan status."},{question:"Bisakah saya membatalkan atau mengubah pesanan?",answer:'Pesanan dapat dibatalkan atau diubah selama status masih "pending". Setelah pembayaran dikonfirmasi, perubahan dapat dilakukan dengan menghubungi tim support kami.'}],fe=["Masalah Teknis","Pertanyaan Billing","Dukungan Instalasi","Status Pesanan","Lainnya"],ye={"Masalah Teknis":"technical","Pertanyaan Billing":"billing","Dukungan Instalasi":"installation","Status Pesanan":"account",Lainnya:"other"};function je(h,m){const s=h.toLowerCase();if(s.includes("halo")||s.includes("hi")||s.includes("hello"))return{text:`Halo! 👋 Saya adalah AI Assistant Layanan Digital. Saya bisa membantu Anda dengan:

• Info produk & layanan
• Rekomendasi sesuai kebutuhan
• Panduan pemesanan
• Status pesanan
• FAQ

Ada yang bisa saya bantu hari ini?`};if(s.includes("wifi")||s.includes("internet")){const a=m.find(l=>l.id==="wifi");return{text:`Kami menyediakan layanan instalasi Wi-Fi profesional! 🌐

Paket yang tersedia:
• Basic: Rp 89.000 (1 router, konfigurasi dasar)
• Standard: Rp 149.000 (Mesh network, keamanan advanced)
• Premium: Rp 249.000 (Enterprise system, priority support)

Durasi: 2-3 jam dengan garansi hingga 3 tahun.`,image:a?.image,products:a?[{id:a.id,title:a.title,price:a.base_price,image:a.icon}]:void 0}}if(s.includes("cctv")||s.includes("kamera")||s.includes("keamanan")){const a=m.find(l=>l.id==="cctv");return{text:`Layanan CCTV Security System kami mencakup: 📹

• 2-8 kamera HD/4K
• Night vision & motion detection
• Akses mobile app
• Cloud backup
• Storage 1-4 TB

Paket mulai dari Rp 199.000 dengan garansi 1-3 tahun.`,image:a?.image,products:a?[{id:a.id,title:a.title,price:a.base_price,image:a.icon}]:void 0}}if(s.includes("coding")||s.includes("debug")||s.includes("error")||s.includes("program")){const a=m.find(l=>l.id==="code");return{text:`Butuh bantuan coding? Kami bisa membantu! 💻

Layanan Code Error Repair:
• Identifikasi & fix bug
• Code review & refactoring
• Performance optimization
• Security audit

Mulai dari Rp 59.000 dengan 5 revisi gratis.`,image:a?.image,products:a?[{id:a.id,title:a.title,price:a.base_price,image:a.icon}]:void 0}}if(s.includes("edit")||s.includes("foto")||s.includes("video")||s.includes("photo")){const a=m.find(r=>r.id==="photo"),l=m.find(r=>r.id==="video");return{text:`Layanan editing kreatif kami: 🎨🎬

📸 Photo Editing: Rp 29.000 - Rp 149.000
• Color correction & retouching
• Background removal
• RAW processing

🎥 Video Editing: Rp 79.000 - Rp 399.000
• Color grading & VFX
• Motion graphics
• Sound mixing`,products:[a,l].filter(Boolean).map(r=>({id:r.id,title:r.title,price:r.base_price,image:r.icon}))}}if(s.includes("vps")||s.includes("hosting")||s.includes("server")){const a=m.find(l=>l.id==="vps");return{text:`Solusi VPS Hosting kami: 🖥️

• Basic: 2 CPU, 4GB RAM, 50GB SSD - Rp 49.000
• Standard: 4 CPU, 8GB RAM, 100GB SSD - Rp 99.000
• Premium: 8 CPU, 16GB RAM, 200GB SSD - Rp 199.000

Semua paket include 1-2TB bandwidth!`,image:a?.image,products:a?[{id:a.id,title:a.title,price:a.base_price,image:a.icon}]:void 0}}if(s.includes("harga")||s.includes("price")||s.includes("promo")||s.includes("diskon")){const a=m.reduce((l,r)=>r.base_price<l.base_price?r:l,m[0]);return{text:`Kami memiliki berbagai layanan dengan harga terbaik! 💰

Layanan termurah: ${a.title} mulai Rp ${a.base_price.toLocaleString("id-ID")}

Semua layanan memiliki 3 tier: Basic, Standard, Premium dengan fitur berbeda. Cek halaman produk untuk detail lengkap dan promo terbaru!`}}return s.includes("status")||s.includes("pesanan")||s.includes("order")?{text:`Untuk cek status pesanan: 📦

1. Login ke akun Anda
2. Buka menu Profil > Riwayat Pesanan
3. Lihat status real-time

Status yang tersedia:
• Pending - Menunggu pembayaran
• Processing - Sedang dikerjakan
• Completed - Selesai

Atau kirim email ke support@lumakara.com dengan nomor order Anda.`}:s.includes("bantu")||s.includes("help")||s.includes("cara")?{text:`Saya siap membantu! 🆘

Pilih topik yang Anda butuhkan:
• Info produk (WiFi, CCTV, Coding, Editing, VPS)
• Cara pemesanan
• Status pesanan
• Garansi & refund
• Teknis/support

Atau kirim pertanyaan spesifik Anda!`}:{text:`Terima kasih atas pertanyaannya! 🤔

Untuk informasi lebih detail, Anda bisa:
• Lihat produk kami di halaman Beranda
• Chat dengan admin melalui Live Chat
• Kirim tiket dukungan
• Hubungi WhatsApp kami

Ada hal lain yang bisa saya bantu?`}}function Ke(){const{submitTicket:h,isSubmitting:m}=be(),{products:s}=ie(),{isDarkMode:a}=V(),[l,r]=o.useState(!1),[j,x]=o.useState(!1),[c,i]=o.useState(null),[_,w]=o.useState(!1),[$,D]=o.useState([{id:"welcome",text:`Halo! 👋 Saya AI Assistant Layanan Digital.

Saya bisa membantu dengan:
• Informasi produk & layanan
• Rekomendasi sesuai kebutuhan
• Panduan pemesanan
• FAQ

Ada yang bisa saya bantu?`,isUser:!1,timestamp:new Date}]),[b,P]=o.useState(""),[R,I]=o.useState(!1),B=o.useRef(null),[d,p]=o.useState({subject:"",category:"",email:"",description:""});o.useEffect(()=>{B.current?.scrollIntoView({behavior:"smooth"})},[$]);const E=async()=>{if(!b.trim())return;u.playClick();const t={id:Date.now().toString(),text:b,isUser:!0,timestamp:new Date};D(n=>[...n,t]),P(""),I(!0),setTimeout(()=>{const n=je(t.text,s),N={id:(Date.now()+1).toString(),text:n.text,isUser:!1,image:n.image,products:n.products,timestamp:new Date};D(W=>[...W,N]),I(!1),u.playNotification()},1e3+Math.random()*1e3)},q=async t=>{t.preventDefault(),u.playClick();try{const n=`TICKET-${Date.now().toString(36).toUpperCase()}`,N=new Date().toLocaleString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});await M.sendTicketNotification({ticketId:n,subject:d.subject,category:ye[d.category]||"general",email:d.email,description:d.description,timestamp:N}),await h(d),x(!0),u.playSuccess(),F.success("Tiket berhasil dikirim! Kami akan menghubungi Anda segera."),setTimeout(()=>{r(!1),x(!1),p({subject:"",category:"",email:"",description:""})},3e3)}catch{F.error("Gagal mengirim tiket. Silakan coba lagi.")}},G=t=>{u.playClick(),window.location.href=`/?product=${t}`},g=a?"text-white":"text-gray-900",k=a?"text-gray-400":"text-gray-600",H=a?"bg-gray-800":"bg-white";return e.jsxs("div",{className:`pb-20 px-4 pt-4 min-h-screen ${a?"bg-gray-900":"bg-gray-50"}`,children:[e.jsxs("div",{className:"text-center mb-6",children:[e.jsx("div",{className:"w-16 h-16 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg",children:e.jsx(ne,{className:"h-8 w-8 text-white"})}),e.jsx("h1",{className:`text-2xl font-bold ${g}`,children:"Pusat Bantuan"}),e.jsx("p",{className:k,children:"Kami siap membantu Anda 24/7"})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-3 mb-6",children:[e.jsxs("button",{onClick:()=>{u.playClick(),w(!0)},className:`flex flex-col items-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${a?"bg-green-900/30 hover:bg-green-900/50":"bg-green-50 hover:bg-green-100"}`,children:[e.jsx("div",{className:"w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg",children:e.jsx(A,{className:"h-7 w-7 text-white"})}),e.jsx("span",{className:`text-sm font-bold ${a?"text-green-400":"text-green-700"}`,children:"AI Chat"}),e.jsx("span",{className:`text-xs ${a?"text-green-500":"text-green-600"}`,children:"24/7 Online"})]}),e.jsxs("button",{onClick:()=>{u.playClick(),r(!0)},className:`flex flex-col items-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${a?"bg-blue-900/30 hover:bg-blue-900/50":"bg-blue-50 hover:bg-blue-100"}`,children:[e.jsx("div",{className:"w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-2 shadow-lg",children:e.jsx(re,{className:"h-7 w-7 text-white"})}),e.jsx("span",{className:`text-sm font-bold ${a?"text-blue-400":"text-blue-700"}`,children:"Tiket"}),e.jsx("span",{className:`text-xs ${a?"text-blue-500":"text-blue-600"}`,children:"2-4 jam"})]}),e.jsxs("a",{href:"tel:+6281234567890",onClick:()=>u.playClick(),className:`flex flex-col items-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${a?"bg-orange-900/30 hover:bg-orange-900/50":"bg-orange-50 hover:bg-orange-100"}`,children:[e.jsx("div",{className:"w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-2 shadow-lg",children:e.jsx(le,{className:"h-7 w-7 text-white"})}),e.jsx("span",{className:`text-sm font-bold ${a?"text-orange-400":"text-orange-700"}`,children:"Telepon"}),e.jsx("span",{className:`text-xs ${a?"text-orange-500":"text-orange-600"}`,children:"24 jam"})]})]}),e.jsxs("div",{className:"mb-6",children:[e.jsx("h2",{className:`text-lg font-bold mb-3 ${g}`,children:"Pertanyaan Umum"}),e.jsx("div",{className:"space-y-2",children:ke.map((t,n)=>e.jsxs(T,{className:`overflow-hidden transition-all ${H}`,children:[e.jsxs("button",{onClick:()=>{u.playClick(),i(c===n?null:n)},className:"w-full p-4 flex items-center justify-between text-left",children:[e.jsx("span",{className:`font-medium text-sm pr-4 ${g}`,children:t.question}),c===n?e.jsx(ce,{className:"h-4 w-4 flex-shrink-0 text-gray-400"}):e.jsx(oe,{className:"h-4 w-4 flex-shrink-0 text-gray-400"})]}),c===n&&e.jsx("div",{className:`px-4 pb-4 ${a?"text-gray-300":"text-gray-600"}`,children:e.jsx("p",{className:"text-sm",children:t.answer})})]},n))})]}),e.jsx(T,{className:`mb-4 overflow-hidden ${a?"bg-gradient-to-r from-purple-900/50 to-blue-900/50":"bg-gradient-to-r from-purple-50 to-blue-50"}`,children:e.jsx(L,{className:"p-4",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg",children:e.jsx(de,{className:"h-6 w-6 text-white"})}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:`font-bold ${g}`,children:"AI Assistant"}),e.jsx("p",{className:`text-sm ${k}`,children:"Tanya apa saja tentang produk & layanan"})]}),e.jsx(f,{onClick:()=>{u.playClick(),w(!0)},className:"bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",children:"Chat Sekarang"})]})})}),e.jsx(T,{className:`${a?"bg-gradient-to-r from-blue-900/50 to-cyan-900/50":"bg-gradient-to-r from-blue-50 to-cyan-50"}`,children:e.jsx(L,{className:"p-4",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg",children:e.jsx(me,{className:"h-6 w-6 text-white"})}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:`font-bold ${g}`,children:"Kirim Tiket Dukungan"}),e.jsx("p",{className:`text-sm ${k}`,children:"Laporkan masalah detail ke tim kami"})]}),e.jsx(f,{onClick:()=>{u.playClick(),r(!0)},className:"bg-blue-600 hover:bg-blue-700",children:"Buat Tiket"})]})})}),e.jsx(O,{open:l,onOpenChange:r,children:e.jsxs(z,{className:`max-w-lg max-h-[90vh] overflow-auto ${a?"bg-gray-900 border-gray-700":""}`,children:[e.jsx(Q,{children:e.jsx(X,{className:g,children:"Kirim Tiket Dukungan"})}),j?e.jsxs("div",{className:"text-center py-8",children:[e.jsx("div",{className:"w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce",children:e.jsx(ue,{className:"h-10 w-10 text-green-500"})}),e.jsx("h3",{className:"text-xl font-bold text-green-600 mb-2",children:"Tiket Terkirim! 🎉"}),e.jsx("p",{className:"text-gray-600",children:"Kami akan segera menghubungi Anda via email."})]}):e.jsxs("form",{onSubmit:q,className:"space-y-4 mt-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(y,{htmlFor:"subject",className:g,children:"Subjek"}),e.jsx(C,{id:"subject",placeholder:"Ringkasan masalah Anda",value:d.subject,onChange:t=>p({...d,subject:t.target.value}),required:!0,className:a?"bg-gray-800 border-gray-700 text-white":""})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(y,{htmlFor:"category",className:g,children:"Kategori"}),e.jsxs(J,{value:d.category,onValueChange:t=>p({...d,category:t}),children:[e.jsx(Y,{className:a?"bg-gray-800 border-gray-700 text-white":"",children:e.jsx(ee,{placeholder:"Pilih kategori"})}),e.jsx(ae,{className:a?"bg-gray-800 border-gray-700":"",children:fe.map(t=>e.jsx(te,{value:t,className:a?"text-white":"",children:t},t))})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(y,{htmlFor:"email",className:g,children:"Email"}),e.jsx(C,{id:"email",type:"email",placeholder:"email@anda.com",value:d.email,onChange:t=>p({...d,email:t.target.value}),required:!0,className:a?"bg-gray-800 border-gray-700 text-white":""})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(y,{htmlFor:"description",className:g,children:"Deskripsi"}),e.jsx(Z,{id:"description",placeholder:"Jelaskan masalah Anda secara detail...",rows:4,value:d.description,onChange:t=>p({...d,description:t.target.value}),required:!0,className:a?"bg-gray-800 border-gray-700 text-white":""}),e.jsxs("p",{className:`text-xs text-right ${k}`,children:[d.description.length,"/500 karakter"]})]}),e.jsxs("div",{className:`p-3 rounded-lg text-sm ${a?"bg-blue-900/30 text-blue-300":"bg-blue-50 text-blue-700"}`,children:[e.jsx(ge,{className:"h-4 w-4 inline mr-1"}),"Tiket akan dikirim ke tim support kami via Telegram"]}),e.jsx(f,{type:"submit",className:"w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600",disabled:m,children:m?e.jsxs(e.Fragment,{children:[e.jsx(he,{className:"h-4 w-4 mr-2 animate-spin"}),"Mengirim..."]}):e.jsxs(e.Fragment,{children:[e.jsx(K,{className:"h-4 w-4 mr-2"}),"Kirim Tiket"]})})]})]})}),_&&e.jsxs("div",{className:`fixed bottom-20 right-4 w-80 sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up ${a?"bg-gray-900 border border-gray-700":"bg-white"}`,children:[e.jsxs("div",{className:"bg-gradient-to-r from-blue-600 via-purple-500 to-orange-500 text-white p-4 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm",children:e.jsx(A,{className:"h-6 w-6"})}),e.jsxs("div",{children:[e.jsx("p",{className:"font-bold",children:"AI Assistant"}),e.jsxs("div",{className:"flex items-center gap-1 text-xs text-white/80",children:[e.jsx("span",{className:"w-2 h-2 bg-green-400 rounded-full animate-pulse"}),"Online 24/7"]})]})]}),e.jsx("button",{onClick:()=>{u.playClick(),w(!1)},className:"text-white/80 hover:text-white p-1 hover:bg-white/20 rounded-lg transition-colors",children:e.jsx(pe,{className:"h-5 w-5"})})]}),e.jsx(se,{className:"h-80 p-4",children:e.jsxs("div",{className:"space-y-4",children:[$.map(t=>e.jsx("div",{className:`flex ${t.isUser?"justify-end":"justify-start"}`,children:e.jsxs("div",{className:`max-w-[85%] ${t.isUser?"order-2":"order-1"}`,children:[!t.isUser&&e.jsx("div",{className:"w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-1",children:e.jsx(A,{className:"h-3 w-3 text-white"})}),e.jsx("div",{className:`p-3 rounded-2xl text-sm whitespace-pre-line ${t.isUser?"bg-blue-600 text-white rounded-br-md":a?"bg-gray-800 text-gray-200 rounded-bl-md":"bg-gray-100 text-gray-800 rounded-bl-md"}`,children:t.text}),t.image&&e.jsx("div",{className:"mt-2 rounded-xl overflow-hidden shadow-md",children:e.jsx("img",{src:t.image,alt:"Product",className:"w-full h-32 object-cover"})}),t.products&&t.products.length>0&&e.jsx("div",{className:"mt-2 space-y-2",children:t.products.map(n=>e.jsxs("button",{onClick:()=>G(n.id),className:`w-full p-2 rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02] ${a?"bg-gray-800 hover:bg-gray-700":"bg-white hover:bg-gray-50"} shadow-md`,children:[e.jsx("img",{src:n.image,alt:n.title,className:"w-12 h-12 object-cover rounded-lg"}),e.jsxs("div",{className:"flex-1 text-left",children:[e.jsx("p",{className:`text-xs font-medium ${a?"text-white":"text-gray-800"}`,children:n.title}),e.jsxs("p",{className:"text-xs text-blue-600 font-bold",children:["Rp ",n.price.toLocaleString("id-ID")]})]}),e.jsx(xe,{className:"h-4 w-4 text-orange-500"})]},n.id))}),e.jsx("p",{className:`text-xs mt-1 ${a?"text-gray-500":"text-gray-400"}`,children:t.timestamp.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})})]})},t.id)),R&&e.jsx("div",{className:"flex justify-start",children:e.jsx("div",{className:`p-3 rounded-2xl rounded-bl-md ${a?"bg-gray-800":"bg-gray-100"}`,children:e.jsxs("div",{className:"flex gap-1",children:[e.jsx("span",{className:"w-2 h-2 bg-gray-400 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),e.jsx("span",{className:"w-2 h-2 bg-gray-400 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),e.jsx("span",{className:"w-2 h-2 bg-gray-400 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]})})}),e.jsx("div",{ref:B})]})}),e.jsxs("div",{className:`p-3 border-t flex gap-2 ${a?"border-gray-700 bg-gray-900":"bg-gray-50"}`,children:[e.jsx(C,{placeholder:"Ketik pesan...",value:b,onChange:t=>P(t.target.value),onKeyPress:t=>t.key==="Enter"&&E(),className:`flex-1 ${a?"bg-gray-800 border-gray-700 text-white":""}`}),e.jsx(f,{size:"icon",onClick:E,disabled:!b.trim()||R,className:"bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600",children:e.jsx(K,{className:"h-4 w-4"})})]})]})]})}export{Ke as SupportSection,Ke as default};
