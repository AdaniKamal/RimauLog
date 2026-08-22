import {createClient} from "@supabase/supabase-js";
import {NextResponse} from "next/server";

export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publicKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!publicKey||!serviceKey)return NextResponse.json({error:"Server invitation service is not configured."},{status:500});
 const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!token)return NextResponse.json({error:"Please sign in again."},{status:401});
 const authClient=createClient(url,publicKey,{global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:{user}}=await authClient.auth.getUser(token);
 if(!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:mentor}=await admin.from("profiles").select("id,role,approved").eq("id",user.id).maybeSingle();
 if(!mentor?.approved||mentor.role!=="mentor")return NextResponse.json({error:"Only an approved mentor can invite students."},{status:403});
 const body=await request.json().catch(()=>({}));const email=String(body.email||"").trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Enter a valid email address."},{status:400});
 const {error:recordError}=await admin.from("invitations").upsert({email,role:"student",invited_by:user.id},{onConflict:"email"});
 if(recordError)return NextResponse.json({error:recordError.message},{status:400});
 const redirectTo=`${process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin}/`;
 const {error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo});
 if(inviteError&&!/already|registered|exists/i.test(inviteError.message))return NextResponse.json({error:`Approved, but email could not be sent: ${inviteError.message}`},{status:400});
 return NextResponse.json({ok:true,message:inviteError?"Account already exists. The student is approved and can sign in with Google.":"Invitation email sent."});
}
