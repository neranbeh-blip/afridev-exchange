import {
  ArrowLeft, BadgeCheck, Check, CheckCheck, Code2, Download, File as FileIcon,
  MessageCircle, MessageSquare, Paperclip, Plus, Search, Send, Smile, Sticker,
  Users, X, Reply,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DeepLText from "../../components/layout/DeepLText";

type Profile = {
  id: string; full_name: string | null; username: string | null;
  avatar_url: string | null; country: string | null;
};
type Conversation = {
  id: string; exchange_id: string | null; project_id: string | null; created_at: string;
  title?: string | null; is_group?: boolean; partner: Profile | null; members?: Profile[];
  lastMessage: { content: string; sender_id: string; created_at: string; message_type?: string; attachment_name?: string | null } | null;
};
type Message = {
  id: string; conversation_id: string; sender_id: string; content: string; created_at: string;
  reply_to_id?: string | null;
  message_type?: string;
  sticker_url?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime_type?: string | null;
  attachment_size?: number | null;
  attachment_url?: string | null;
};
type Request = {
  id: string; sender_id: string; recipient_id: string; conversation_id: string | null;
  initial_message: string; status: string; created_at: string; responded_at: string | null;
  sender: Profile | null;
};
const EMOJIS = ["😀","😂","🥹","😍","🔥","💡","🚀","👏","🙌","❤️","💻","🤝","✅","🎉","👀","🙏"];
const STICKERS = ["🚀","💻","🔥","🎯","🏆","🤝","✨","💡","🎉","✅","🧠","❤️"];
function initials(p: Profile | null) {
  const n = p?.full_name?.trim() || p?.username?.trim() || "";
  if (!n) return "AD";
  const parts = n.split(/\s+/).filter(Boolean);
  return (parts.length === 1 ? parts[0].slice(0,2) : `${parts[0][0]}${parts.at(-1)?.[0]}`).toUpperCase();
}
function name(p: Profile | null) { return p?.full_name || (p?.username ? `@${p.username}` : "Developer"); }
function time(s: string) { return new Date(s).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }
function formatBytes(bytes?: number | null) {
  if (bytes == null || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function Avatar({ profile, size="h-10 w-10" }: {profile: Profile|null; size?: string}) {
  return profile?.avatar_url
    ? <img src={profile.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover ring-1 ring-slate-200`} />
    : <span className={`${size} inline-flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700`}>{initials(profile)}</span>;
}

export default function Messages() {
  const [userId,setUserId]=useState("");
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [requests,setRequests]=useState<Request[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [showMobileChat,setShowMobileChat]=useState(false);
  const [messages,setMessages]=useState<Message[]>([]);
  const [draft,setDraft]=useState("");
  const [pendingFile,setPendingFile]=useState<File|null>(null);
  const [uploadingFile,setUploadingFile]=useState(false);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const [search,setSearch]=useState("");
  const [developerSearch,setDeveloperSearch]=useState("");
  const [developers,setDevelopers]=useState<Profile[]>([]);
  const [activeTab,setActiveTab]=useState<"messages"|"requests">("messages");
  const [showNew,setShowNew]=useState(false);
  const [showGroup,setShowGroup]=useState(false);
  const [selectedDeveloper,setSelectedDeveloper]=useState<Profile|null>(null);
  const [requestMessage,setRequestMessage]=useState("");
  const [groupName,setGroupName]=useState("");
  const [groupSearch,setGroupSearch]=useState("");
  const [groupMembers,setGroupMembers]=useState<Profile[]>([]);
  const [groupResults,setGroupResults]=useState<Profile[]>([]);
  const [replyTo,setReplyTo]=useState<Message|null>(null);
  const [showEmoji,setShowEmoji]=useState(false);
  const [showStickers,setShowStickers]=useState(false);
  const [presence,setPresence]=useState<Record<string,{is_online:boolean;last_seen_at:string}>>({});
  const [readIds,setReadIds]=useState<Set<string>>(new Set());
  const [loading,setLoading]=useState(true);
  const [messagesLoading,setMessagesLoading]=useState(false);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const listRef=useRef<HTMLDivElement>(null);
  const touchStartX=useRef<number|null>(null);
  const [params]=useSearchParams();

  const selected=useMemo(()=>conversations.find(c=>c.id===selectedId)??null,[conversations,selectedId]);
  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return !q?conversations:conversations.filter(c=>
      (c.title||name(c.partner)).toLowerCase().includes(q) ||
      (c.lastMessage?.content||"").toLowerCase().includes(q) ||
      (c.partner?.username||"").toLowerCase().includes(q));
  },[conversations,search]);

  const loadConversations=useCallback(async(uid:string)=>{
    const {data:part,error:pe}=await supabase.from("conversation_participants").select("conversation_id").eq("developer_id",uid);
    if(pe) throw pe;
    const ids=[...new Set((part||[]).map(x=>x.conversation_id).filter(Boolean))];
    if(!ids.length){setConversations([]);setSelectedId(null);return;}
    const {data:rows,error:ce}=await supabase.from("conversations").select("id,exchange_id,project_id,created_at,title,is_group,created_by").in("id",ids).order("created_at",{ascending:false});
    if(ce) throw ce;
    const {data:parts,error:oe}=await supabase.from("conversation_participants").select("conversation_id,developer_id,profile:profiles(id,full_name,username,avatar_url,country)").in("conversation_id",ids);
    if(oe) throw oe;
    const profilesByConv=new Map<string,Profile[]>();
    for(const row of (parts||[]) as any[]){
      const p=Array.isArray(row.profile)?row.profile[0]:row.profile;
      if(p){const a=profilesByConv.get(row.conversation_id)||[];a.push(p);profilesByConv.set(row.conversation_id,a);}
    }
    const result=await Promise.all((rows||[]).map(async(c:any)=>{
      const {data:last,error:le}=await supabase.from("messages").select("content,sender_id,created_at,message_type,attachment_name").eq("conversation_id",c.id).order("created_at",{ascending:false}).limit(1);
      if(le) throw le;
      const members=profilesByConv.get(c.id)||[];
      return {...c,members,partner:members.find(p=>p.id!==uid)||null,lastMessage:last?.[0]||null} as Conversation;
    }));
    setConversations(result);
    setSelectedId(current=>current&&result.some(c=>c.id===current)?current:result[0]?.id||null);
  },[]);

  const loadRequests=useCallback(async(uid:string)=>{
    const {data,error:e}=await supabase.from("conversation_requests").select("id,sender_id,recipient_id,conversation_id,initial_message,status,created_at,responded_at").eq("recipient_id",uid).eq("status","pending").order("created_at",{ascending:false});
    if(e){console.error(e);return;}
    const rows=data||[], ids=[...new Set(rows.map(r=>r.sender_id))];
    let map=new Map<string,Profile>();
    if(ids.length){const {data:p}=await supabase.from("profiles").select("id,full_name,username,avatar_url,country").in("id",ids);map=new Map(((p||[]) as Profile[]).map(x=>[x.id,x]));}
    setRequests(rows.map(r=>({...r,sender:map.get(r.sender_id)||null})) as Request[]);
  },[]);

  const loadMessages=useCallback(async(cid:string,uid:string)=>{
    setMessagesLoading(true);
    const {data,error:e}=await supabase.from("messages").select("id,conversation_id,sender_id,content,created_at,reply_to_id,message_type,sticker_url,attachment_path,attachment_name,attachment_mime_type,attachment_size").eq("conversation_id",cid).order("created_at",{ascending:true});
    if(e){setError("Unable to load messages. Apply the messaging SQL migrations and check Supabase permissions.");setMessages([]);setMessagesLoading(false);return;}
    const rows=await Promise.all(((data||[]) as Message[]).map(async(message)=>{
      if(!message.attachment_path) return message;
      const {data:signed,error:signedError}=await supabase.storage.from("message-attachments").createSignedUrl(message.attachment_path,60*60);
      if(signedError) console.warn("Unable to create attachment link:",signedError.message);
      return {...message,attachment_url:signed?.signedUrl||null};
    }));
    setMessages(rows);setMessagesLoading(false);
    const unread=rows.filter(m=>m.sender_id!==uid);
    if(unread.length){
      const payload=unread.map(m=>({message_id:m.id,user_id:uid,delivered_at:new Date().toISOString(),read_at:new Date().toISOString()}));
      const {error:re}=await supabase.from("message_receipts").upsert(payload,{onConflict:"message_id,user_id"});
      if(!re) setReadIds(old=>new Set([...old,...rows.filter(m=>m.sender_id===uid).map(m=>m.id)]));
    }
  },[]);

  const searchPeople=useCallback(async(q:string,forGroup=false)=>{
    const clean=q.trim();
    if(clean.length<2||!userId){forGroup?setGroupResults([]):setDevelopers([]);return;}
    const {data,error:e}=await supabase.from("profiles").select("id,full_name,username,avatar_url,country").neq("id",userId).or(`full_name.ilike.%${clean}%,username.ilike.%${clean}%`).limit(12);
    if(e){setError("Unable to search developers.");return;}
    if(forGroup)setGroupResults((data||[]) as Profile[]);else setDevelopers((data||[]) as Profile[]);
  },[userId]);

  async function send(contentOverride?:string,type="text"){
    const content=(contentOverride??draft).trim();
    const file=type==="text"?pendingFile:null;
    if((!content&&!file)||!selectedId||!userId||sending)return;
    if(file && file.size > 25 * 1024 * 1024){setError("Files must be 25 MB or smaller.");return;}
    setSending(true);setUploadingFile(Boolean(file));setError("");
    let attachmentPath:string|null=null;
    try{
      if(file){
        const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120)||"attachment";
        attachmentPath=`${selectedId}/${userId}/${crypto.randomUUID()}-${safeName}`;
        const {error:uploadError}=await supabase.storage.from("message-attachments").upload(attachmentPath,file,{
          cacheControl:"3600",upsert:false,contentType:file.type||"application/octet-stream"
        });
        if(uploadError) throw uploadError;
      }
      const payload:any={
        conversation_id:selectedId,
        sender_id:userId,
        content:content||(file?.name||"Attachment"),
        message_type:file?"file":type,
        reply_to_id:replyTo?.id||null,
        attachment_path:attachmentPath,
        attachment_name:file?.name||null,
        attachment_mime_type:file?.type||null,
        attachment_size:file?.size||null,
      };
      if(type==="sticker") payload.sticker_url=content;
      const {data,error:e}=await supabase.from("messages").insert(payload).select("id,conversation_id,sender_id,content,created_at,reply_to_id,message_type,sticker_url,attachment_path,attachment_name,attachment_mime_type,attachment_size").single();
      if(e) throw e;
      let messageRow=data as Message;
      if(attachmentPath){
        const {data:signed}=await supabase.storage.from("message-attachments").createSignedUrl(attachmentPath,60*60);
        messageRow={...messageRow,attachment_url:signed?.signedUrl||null};
      }
      setMessages(old=>old.some(m=>m.id===messageRow.id)?old:[...old,messageRow]);
      setDraft("");setPendingFile(null);setReplyTo(null);setShowEmoji(false);setShowStickers(false);
      if(fileInputRef.current) fileInputRef.current.value="";
      void loadConversations(userId);
    }catch(err){
      console.error("Message send/upload error:",err);
      const msg=err instanceof Error?err.message:"Unknown error";
      setError(msg.toLowerCase().includes("column")?"Messaging file-transfer migration is missing. Run messaging_file_transfer.sql in Supabase first.":`Unable to send message or file. ${msg}`);
    }finally{
      setSending(false);setUploadingFile(false);
    }
  }

  async function startDirect(){
    if(!selectedDeveloper||!requestMessage.trim()||!userId)return;
    setSending(true);
    const {data,error:e}=await supabase.rpc("start_direct_conversation",{p_recipient_id:selectedDeveloper.id,p_initial_message:requestMessage.trim().slice(0,500)});
    if(e){setError(e.message);setSending(false);return;}
    setShowNew(false);setSelectedDeveloper(null);setRequestMessage("");setSending(false);
    await Promise.all([loadRequests(userId),loadConversations(userId)]);
    const cid=(data as any)?.conversation_id;
    if(cid){setSelectedId(cid);setActiveTab("messages");setShowMobileChat(true);}else setActiveTab("requests");
  }
  async function respond(req:Request,accept:boolean){
    const {data,error:e}=await supabase.rpc(accept?"accept_conversation_request":"decline_conversation_request",{p_request_id:req.id});
    if(e){setError(e.message);return;}
    await Promise.all([loadRequests(userId),loadConversations(userId)]);
    if(accept&&(data as any)?.conversation_id){setSelectedId((data as any).conversation_id);setActiveTab("messages");setShowMobileChat(true);}
  }
  async function createGroup(){
    if(groupName.trim().length<2||groupMembers.length<1)return;
    const {data,error:e}=await supabase.rpc("create_group_conversation",{p_title:groupName.trim(),p_member_ids:groupMembers.map(p=>p.id)});
    if(e){setError(e.message);return;}
    setShowGroup(false);setGroupName("");setGroupMembers([]);setGroupSearch("");
    await loadConversations(userId);setSelectedId(data as string);setShowMobileChat(true);
  }

  useEffect(()=>{let active=true;(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!active)return;
    if(!user){setLoading(false);return;}
    setUserId(user.id);
    try{await Promise.all([loadConversations(user.id),loadRequests(user.id)]);}catch(e){console.error(e);setError("Unable to load your messages.");}
    setLoading(false);
  })();return()=>{active=false;};},[loadConversations,loadRequests]);

  useEffect(()=>{if(!userId)return;const target=params.get("developer");if(!target||target===userId)return;
    let cancelled=false;(async()=>{const {data}=await supabase.from("profiles").select("id,full_name,username,avatar_url,country").eq("id",target).maybeSingle();if(!cancelled&&data){setSelectedDeveloper(data as Profile);setShowNew(true);}})();
    return()=>{cancelled=true;};
  },[params,userId]);

  useEffect(()=>{if(!selectedId||!userId){setMessages([]);return;}void loadMessages(selectedId,userId);
    const ch=supabase.channel(`messages-${selectedId}`).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:`conversation_id=eq.${selectedId}`},()=>{void loadMessages(selectedId,userId);void loadConversations(userId);}).on("postgres_changes",{event:"*",schema:"public",table:"message_receipts"},()=>{void supabase.from("message_receipts").select("message_id,read_at").not("read_at","is",null).then(({data})=>setReadIds(new Set((data||[]).map(x=>x.message_id))));}).subscribe();
    return()=>{void supabase.removeChannel(ch);};
  },[selectedId,userId,loadMessages,loadConversations]);

  useEffect(()=>{if(!userId)return;
    const publish=async(is_online:boolean)=>{const row={user_id:userId,is_online,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()};await supabase.from("user_presence").upsert(row,{onConflict:"user_id"});};
    void publish(true);
    const channel=supabase.channel("afridev-presence",{config:{presence:{key:userId}}}).on("presence",{event:"sync"},()=>{const state=channel.presenceState();const next:Record<string,{is_online:boolean;last_seen_at:string}>={};for (const key of Object.keys(state)) {if(key!==userId)next[key]={is_online:true,last_seen_at:new Date().toISOString()};}setPresence(old=>({...old,...next}));}).subscribe(async status=>{if(status==="SUBSCRIBED")await channel.track({online_at:new Date().toISOString()});});
    const db=supabase.channel("presence-db").on("postgres_changes",{event:"*",schema:"public",table:"user_presence"},payload=>{const p=payload.new as any;if(p?.user_id)setPresence(old=>({...old,[p.user_id]:{is_online:p.is_online,last_seen_at:p.last_seen_at}}));}).subscribe();
    const leave=()=>{void publish(false);};
    window.addEventListener("beforeunload",leave);
    return()=>{window.removeEventListener("beforeunload",leave);void publish(false);void supabase.removeChannel(channel);void supabase.removeChannel(db);};
  },[userId]);

  useEffect(()=>{if(!selectedId)return;const el=listRef.current;if(el)el.scrollTop=el.scrollHeight;},[messages,selectedId]);

  if(loading)return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700"/></div>;

  const online=selected?.partner?presence[selected.partner.id]?.is_online:false;
  const replyMap=new Map(messages.map(m=>[m.id,m]));
  return <div className="mx-auto flex h-[calc(100dvh-5rem)] max-w-7xl flex-col overflow-hidden px-3 py-3 sm:px-6 lg:px-8">
    <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
      <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-700"><Code2 size={15}/> <DeepLText text={'African Developer Network'} /></p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950"><DeepLText text={'Messaging'} /><span className="ml-2 text-blue-700">/</span></h1><p className="text-xs text-slate-500"><DeepLText text={'Collaborate in real time. Build something meaningful.'} /></p></div>
      <div className="flex gap-2"><button onClick={()=>setShowGroup(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><Users size={16}/><span className="hidden sm:inline"><DeepLText text={'New group'} /></span></button><button onClick={()=>{setShowNew(true);setSelectedDeveloper(null);}} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800"><Plus size={16}/><span className="hidden sm:inline"><DeepLText text={'New message'} /></span></button></div>
    </div>
    {error&&<div className="mb-2 flex shrink-0 items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_15px_60px_-35px_rgba(15,23,42,.4)]">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2 sm:px-4">
        <div className="flex gap-1"><button onClick={()=>setActiveTab("messages")} className={`rounded-lg px-3 py-2 text-xs font-extrabold ${activeTab==="messages"?"bg-blue-700 text-white":"text-slate-500 hover:bg-white"}`}><DeepLText text={'Messages'} /></button><button onClick={()=>setActiveTab("requests")} className={`rounded-lg px-3 py-2 text-xs font-extrabold ${activeTab==="requests"?"bg-blue-700 text-white":"text-slate-500 hover:bg-white"}`}>Requests{requests.length>0&&<span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-white">{requests.length}</span>}</button></div>
        <div className="relative hidden sm:block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations" className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500"/></div>
      </div>
      {activeTab==="requests"?<div className="min-h-0 flex-1 overflow-y-auto p-4">{requests.length===0?<p className="py-16 text-center text-sm text-slate-500"><DeepLText text={'No pending message requests.'} /></p>:requests.map(r=><div key={r.id} className="mb-3 flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><Avatar profile={r.sender}/><div className="min-w-0 flex-1"><p className="font-bold text-slate-900">{name(r.sender)}</p><p className="mt-1 text-sm text-slate-600">{r.initial_message}</p></div><div className="flex gap-2"><button onClick={()=>void respond(r,true)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white"><DeepLText text={'Accept'} /></button><button onClick={()=>void respond(r,false)} className="rounded-lg border px-3 py-2 text-xs font-bold"><DeepLText text={'Decline'} /></button></div></div>)}</div>:
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`${showMobileChat ? "hidden" : "flex"} min-h-0 flex-col overflow-y-auto border-b border-slate-200 lg:flex lg:border-b-0 lg:border-r`}><div className="p-3 sm:hidden"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations..." className="w-full rounded-lg border px-3 py-2 text-xs"/></div>{filtered.length===0?<div className="p-6 text-center text-xs text-slate-500"><DeepLText text={'No conversations yet. Start a message.'} /></div>:filtered.map(c=><button key={c.id} onClick={()=>{setSelectedId(c.id);setShowMobileChat(true);}} className={`flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left transition ${selectedId===c.id?"bg-blue-50":"hover:bg-slate-50"}`}><div className="relative"><Avatar profile={c.is_group?null:c.partner} size="h-10 w-10"/>{c.is_group?<span className="absolute -bottom-1 -right-1 rounded-full bg-indigo-600 p-1 text-white"><Users size={10}/></span>:<span aria-label={presence[c.partner?.id||""]?.is_online ? "Online" : "Offline"} className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${presence[c.partner?.id||""]?.is_online?"bg-emerald-500":"bg-slate-300"}`}/>}</div><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-slate-900">{c.is_group?(c.title||"Group conversation"):name(c.partner)}</span>{c.lastMessage&&<span className="text-[10px] text-slate-400">{time(c.lastMessage.created_at)}</span>}</span><span className="mt-1 block truncate text-xs text-slate-500">{c.lastMessage?.content||"Start a conversation"}</span></span></button>)}</aside>
        <main className={`${showMobileChat ? "flex" : "hidden"} min-h-0 min-w-0 flex-col overflow-hidden bg-white lg:flex`}>
          {!selected?<div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><div className="rounded-2xl bg-blue-50 p-4 text-blue-700"><MessageSquare size={28}/></div><h2 className="mt-4 font-bold text-slate-900"><DeepLText text={'Your developer workspace'} /></h2><p className="mt-1 text-sm text-slate-500"><DeepLText text={'Choose a conversation or start a new one.'} /></p></div>:<>
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:gap-3 sm:px-5"><div className="flex min-w-0 items-center gap-2 sm:gap-3"><button type="button" onClick={()=>setShowMobileChat(false)} aria-label="Back to conversations" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"><ArrowLeft size={19}/></button>{selected.is_group?<div className="rounded-full bg-indigo-100 p-2.5 text-indigo-700"><Users size={20}/></div>:<div className="relative"><Avatar profile={selected.partner}/><span aria-label={online ? "Online" : "Offline"} className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${online?"bg-emerald-500":"bg-slate-300"}`}/></div>}<div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-950">{selected.is_group?(selected.title||"Group conversation"):name(selected.partner)}</p>{selected.is_group&&<p className="text-[11px] text-slate-500">{selected.members?.length||0} developers</p>}</div></div>{selected.partner&&<Link to={`/developer/${selected.partner.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><BadgeCheck size={14}/> <DeepLText text={'Passport'} /></Link>}</header>
            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/70 p-3 sm:p-5">
              {messagesLoading?<div className="flex h-full items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700"/></div>:messages.length===0?<div className="flex h-full flex-col items-center justify-center text-center"><div className="rounded-2xl bg-white p-4 text-slate-300 shadow-sm"><MessageCircle size={28}/></div><p className="mt-3 text-sm font-bold text-slate-700"><DeepLText text={'Start building together'} /></p><p className="mt-1 text-xs text-slate-500"><DeepLText text={'Send a message, share an idea, or ask for feedback.'} /></p></div>:messages.map(m=>{const mine=m.sender_id===userId;const quoted=m.reply_to_id?replyMap.get(m.reply_to_id):null;return <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`} onTouchStart={e=>{touchStartX.current=e.touches[0].clientX;}} onTouchEnd={e=>{const delta=e.changedTouches[0].clientX-(touchStartX.current??e.changedTouches[0].clientX);if(delta>65)setReplyTo(m);touchStartX.current=null;}}><div className={`group relative max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[75%] ${mine?"rounded-br-md bg-blue-700 text-white":"rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}><button title="Reply" onClick={()=>setReplyTo(m)} className={`absolute -top-3 ${mine?"-left-3":"-right-3"} hidden rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm group-hover:block`}><Reply size={13}/></button>{quoted&&<div className={`mb-2 rounded-lg border-l-2 px-2 py-1 text-xs ${mine?"border-blue-200 bg-blue-800/60 text-blue-100":"border-blue-500 bg-slate-50 text-slate-500"}`}>{quoted.content.slice(0,180)}</div>}{m.message_type==="sticker"?<div className="text-5xl">{m.content}</div>:m.attachment_path?<div className="min-w-0">{m.attachment_mime_type?.startsWith("image/")&&m.attachment_url&&<a href={m.attachment_url} target="_blank" rel="noreferrer" className="mb-2 block"><img src={m.attachment_url} alt={m.attachment_name||"Shared image"} className="max-h-64 max-w-full rounded-xl object-contain" loading="lazy"/></a>}<a href={m.attachment_url||"#"} target="_blank" rel="noreferrer" download={m.attachment_name||true} className={`flex max-w-full items-center gap-3 rounded-xl border p-3 ${mine?"border-blue-500 bg-blue-800/60 text-white":"border-slate-200 bg-slate-50 text-slate-800"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${mine?"bg-blue-700":"bg-white"}`}><FileIcon size={20}/></span><span className="min-w-0 flex-1"><span className="block max-w-56 truncate text-xs font-bold">{m.attachment_name||m.content||"Shared file"}</span><span className={`mt-1 block text-[10px] ${mine?"text-blue-100":"text-slate-500"}`}>{formatBytes(m.attachment_size)}{m.attachment_mime_type?` · ${m.attachment_mime_type}`:""}</span></span><Download size={16} className="shrink-0"/></a>{m.content&&m.attachment_name&&m.content!==m.attachment_name&&<p className="mt-2 whitespace-pre-wrap break-words">{m.content}</p>}</div>:<p className="whitespace-pre-wrap break-words">{m.content}</p>}<div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine?"text-blue-100":"text-slate-400"}`}><span>{time(m.created_at)}</span>{mine&&(readIds.has(m.id)?<CheckCheck size={13} className="text-cyan-200"/>:<Check size={12}/>)}</div></div></div>;})}
            </div>
            <form onSubmit={e=>{e.preventDefault();void send();}} className="relative shrink-0 border-t border-slate-200 bg-white p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-4">
              <input ref={fileInputRef} type="file" className="hidden" onChange={e=>{const file=e.target.files?.[0]||null;if(file&&file.size>25*1024*1024){setError("Files must be 25 MB or smaller.");e.currentTarget.value="";return;}setPendingFile(file);}} />
              {pendingFile&&<div className="mb-2 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2"><FileIcon size={17} className="shrink-0 text-blue-700"/><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{pendingFile.name}</span><span className="text-[10px] text-slate-500">{formatBytes(pendingFile.size)} · Ready to send</span></span><button type="button" onClick={()=>{setPendingFile(null);if(fileInputRef.current)fileInputRef.current.value="";}} aria-label="Remove attachment" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X size={15}/></button></div>}
              {replyTo&&<div className="mb-2 flex items-center justify-between rounded-lg border-l-2 border-blue-600 bg-blue-50 px-3 py-2"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase text-blue-700"><DeepLText text={'Replying to message'} /></p><p className="truncate text-xs text-slate-600">{replyTo.content}</p></div><button type="button" onClick={()=>setReplyTo(null)} className="ml-2 text-slate-500"><X size={15}/></button></div>}
              {showEmoji&&<div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">{EMOJIS.map(x=><button key={x} type="button" onClick={()=>setDraft(d=>d+x)} className="rounded-lg p-1.5 text-xl hover:bg-slate-100">{x}</button>)}</div>}
              {showStickers&&<div className="mb-2 grid grid-cols-6 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg sm:grid-cols-12">{STICKERS.map(x=><button key={x} type="button" onClick={()=>void send(x,"sticker")} className="rounded-lg p-2 text-2xl hover:bg-blue-50">{x}</button>)}</div>}
              <div className="flex items-end gap-1.5 sm:gap-2"><button type="button" onClick={()=>fileInputRef.current?.click()} title="Attach a file" aria-label="Attach a file" className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-700 sm:w-10"><Paperclip size={19}/></button><button type="button" onClick={()=>{setShowEmoji(v=>!v);setShowStickers(false);}} title="Emoji" aria-label="Emoji" className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-700 sm:w-10"><Smile size={20}/></button><button type="button" onClick={()=>{setShowStickers(v=>!v);setShowEmoji(false);}} title="Stickers" aria-label="Stickers" className="hidden h-10 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-700 sm:flex sm:w-10"><Sticker size={19}/></button><textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}} rows={1} placeholder="Write a message…" className="max-h-32 min-h-10 min-w-0 flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"/><button type="submit" disabled={(!draft.trim()&&!pendingFile)||sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40" aria-label="Send">{uploadingFile?<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"/>:<Send size={17}/>}</button></div><div className="mt-1.5 flex items-center justify-between gap-2 px-1"><p className="text-[10px] text-slate-400"><DeepLText text={'Enter to send · Shift+Enter for a new line'} /></p><p className="text-[10px] text-slate-400"><DeepLText text={'Files up to 25 MB'} /></p></div>
            </form>
          </>}
        </main>
      </div>}
    </section>
    {showNew&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-4"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700"><DeepLText text={'Direct message'} /></p><h2 className="mt-1 text-lg font-black"><DeepLText text={'Find a developer'} /></h2></div><button onClick={()=>setShowNew(false)}><X size={19}/></button></header><div className="max-h-[75vh] overflow-y-auto p-4">{!selectedDeveloper?<><input value={developerSearch} onChange={e=>{setDeveloperSearch(e.target.value);void searchPeople(e.target.value);}} placeholder="Search name or username…" className="w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-blue-500"/><div className="mt-3 divide-y">{developers.map(p=><button key={p.id} onClick={()=>setSelectedDeveloper(p)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"><Avatar profile={p}/><span><span className="block text-sm font-bold">{name(p)}</span><span className="text-xs text-slate-500">{p.username?`@${p.username}`:p.country}</span></span></button>)}</div></>:<><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Avatar profile={selectedDeveloper}/><div><p className="font-bold">{name(selectedDeveloper)}</p><button onClick={()=>setSelectedDeveloper(null)} className="text-xs text-blue-700"><DeepLText text={'Choose another'} /></button></div></div><textarea value={requestMessage} onChange={e=>setRequestMessage(e.target.value.slice(0,500))} rows={4} placeholder="Introduce yourself…" className="mt-3 w-full rounded-xl border p-3 text-sm"/><div className="mt-3 flex justify-end"><button disabled={!requestMessage.trim()||sending} onClick={()=>void startDirect()} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><DeepLText text={'Send message request'} /></button></div></>}</div></div></div>}
    {showGroup&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-4"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700"><DeepLText text={'Team workspace'} /></p><h2 className="mt-1 text-lg font-black"><DeepLText text={'Create group conversation'} /></h2></div><button onClick={()=>setShowGroup(false)}><X size={19}/></button></header><div className="p-4"><label className="text-xs font-bold text-slate-600"><DeepLText text={'Group name'} /></label><input value={groupName} onChange={e=>setGroupName(e.target.value)} maxLength={80} placeholder="e.g. Open-source contributors" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"/><label className="mt-4 block text-xs font-bold text-slate-600"><DeepLText text={'Add developers'} /></label><input value={groupSearch} onChange={e=>{setGroupSearch(e.target.value);void searchPeople(e.target.value,true);}} placeholder="Search developers…" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"/><div className="mt-2 max-h-48 overflow-y-auto divide-y">{groupResults.filter(p=>!groupMembers.some(m=>m.id===p.id)).map(p=><button key={p.id} onClick={()=>setGroupMembers(old=>[...old,p])} className="flex w-full items-center gap-3 p-2 text-left hover:bg-slate-50"><Avatar profile={p} size="h-8 w-8"/><span className="text-sm font-semibold">{name(p)}</span><Plus size={15} className="ml-auto text-blue-700"/></button>)}</div>{groupMembers.length>0&&<div className="mt-3 flex flex-wrap gap-2">{groupMembers.map(p=><button key={p.id} onClick={()=>setGroupMembers(old=>old.filter(m=>m.id!==p.id))} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{name(p)} <X size={12}/></button>)}</div>}<div className="mt-5 flex justify-end gap-2"><button onClick={()=>setShowGroup(false)} className="rounded-xl border px-4 py-2 text-sm font-bold"><DeepLText text={'Cancel'} /></button><button disabled={groupName.trim().length<2||groupMembers.length===0} onClick={()=>void createGroup()} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><DeepLText text={'Create group'} /></button></div></div></div></div>}
  </div>;
}
