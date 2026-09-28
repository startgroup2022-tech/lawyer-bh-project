// Disposable visual proposals. Does not change the production PDF renderer.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {it,expect} from "vitest";
import fontkit from "@pdf-lib/fontkit";
import {PDFDocument,PDFHexString,PDFName,beginText,endText,setFontAndSize,setTextMatrix,showText,setFillingRgbColor,rgb,type PDFPage} from "pdf-lib";
import {layoutLine,wrapText} from "../../lib/provider-agreement/shaping";
import {legacyTemplate,renderTemplate,sampleData} from "../../lib/provider-agreement/model";

it("generates three isolated contract design proposals",async()=>{
  await mkdir("output/pdf/designs",{recursive:true});
  const bytes=await readFile("public/fonts/Cairo-Full.ttf"),logoBytes=await readFile("app/apple-icon.png");
  const content=renderTemplate(legacyTemplate(),sampleData);
  const arabic=content.contentAr.split(/(?=المادة \d+:)/).slice(1);
  const english=content.contentEn.split(/(?=Article \d+:)/).slice(1);
  const navy:[number,number,number]=[.04,.15,.29],red:[number,number,number]=[.7,.1,.14],gray:[number,number,number]=[.35,.38,.42];
  for(const design of [1,2,3]){
    const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(bytes,{subset:false}),shaper=fontkit.create(bytes),logo=await doc.embedPng(logoBytes);
    const w=595.28,h=841.89,m=44;let page:PDFPage,fontName:PDFName;
    const ink=design===2?[.12,.12,.12] as [number,number,number]:navy;
    function text(value:string,x:number,y:number,size=11,rtl=true,color=ink,width=w-2*m){
      const run=layoutLine(shaper,value,rtl),scale=size/shaper.unitsPerEm,left=rtl?x+width-run.width*scale:x;
      page.pushOperators(beginText(),setFontAndSize(fontName,size),setFillingRgbColor(...color));
      for(const g of run.glyphs)page.pushOperators(setTextMatrix(1,0,0,1,left+g.x*scale,y+g.y*scale),showText(PDFHexString.of(g.id.toString(16).padStart(4,"0"))));
      page.pushOperators(endText());
    }
    function paragraph(value:string,x:number,y:number,width:number,size=10.3,rtl=true,color=ink){for(const line of wrapText(shaper,value,rtl,size,width)){text(line,x,y,size,rtl,color,width);y-=size*1.7;}return y;}
    function box(x:number,y:number,width:number,height:number,fill=[.965,.974,.983],border=false){page.drawRectangle({x,y,width,height,color:rgb(...fill as [number,number,number]),...(border?{borderColor:rgb(.78,.79,.8),borderWidth:.6}:{})});}
    function rule(y:number,color=red,x=m,width=w-2*m){page.drawLine({start:{x,y},end:{x:x+width,y},thickness:design===2?.6:1,color:rgb(...color)});}
    function newPage(n:number){page=doc.addPage([w,h]);fontName=page.node.newFontDictionary("Cairo",font.ref);const z=350/Math.max(logo.width,logo.height);page.drawImage(logo,{x:(w-logo.width*z)/2,y:(h-logo.height*z)/2,width:logo.width*z,height:logo.height*z,opacity:.08});
      if(design!==2)box(0,h-9,w,9,red);else rule(h-28,ink);
      const ls=design===2?55:62;page.drawImage(logo,{x:w-m-ls,y:h-104,width:ls*logo.width/logo.height,height:ls});
      text("منصة محامون البحرين",m,h-60,13,true,ink,w-2*m-ls-18);text("LAWYERS.BH",m,h-81,9,false,gray);
      rule(54,design===2?gray:red);text("معاينة تصميم فقط - ليست اتفاقية مكتملة أو موقّعة",m,36,8,true,gray);text(`${n} / 2`,m,22,8,false,gray);
    }
    function title(ar:string,en:string){text(ar,m,701,design===2?23:24,true,design===2?ink:red);text(en,m,677,10,false,gray);}
    function parties(y:number){
      if(design===2){text("الطرف الأول: منصة محامون البحرين",m,y,12);text("الطرف الثاني: محمد أحمد عبدالله - رقم الرخصة: 12345",m,y-29,12);rule(y-47,gray);return y-75;}
      const gap=16,cw=(w-2*m-gap)/2;box(m,y-92,cw,92);box(m+cw+gap,y-92,cw,92);
      text("الطرف الأول | المنصة",m+cw+gap+14,y-23,11,true,red,cw-28);text("منصة محامون البحرين",m+cw+gap+14,y-48,11,true,ink,cw-28);text("info@lawyers.bh",m+cw+gap+14,y-70,9,false,gray,cw-28);
      text("الطرف الثاني | المحامي",m+14,y-23,11,true,red,cw-28);text("محمد أحمد عبدالله",m+14,y-48,11,true,ink,cw-28);text("رقم الرخصة: 12345",m+14,y-70,9,true,gray,cw-28);return y-120;
    }
    newPage(1);text(`0${design}  /  ${design===1?"رسمي عصري":design===2?"كلاسيكي رسمي":"ثنائي اللغة متقابل"}`,m,735,10,true,gray,w-2*m-85);
    title("اتفاقية مقدم الخدمة","SERVICE PROVIDER AGREEMENT");
    text("المرجع: نموذج تجريبي    |    التاريخ: 09 سبتمبر 2026",m,649,9,true,gray);
    let y=parties(624);
    if(design===3){
      const gap=24,cw=(w-2*m-gap)/2;box(m,y-23,cw,27,[.965,.974,.983]);box(m+cw+gap,y-23,cw,27,[.965,.974,.983]);text("ENGLISH",m+10,y-13,10,false,red,cw-20);text("العربية",m+cw+gap+10,y-13,11,true,red,cw-20);y-=49;
      for(let i=0;i<1;i++){const ay=paragraph(arabic[i].trim(),m+cw+gap,y,cw,9.2,true);const ey=paragraph(english[i].trim(),m,y,cw,9.2,false);y=Math.min(ay,ey)-18;rule(y+10,[.85,.86,.87]);}
    }else{
      for(let i=0;i<2;i++){const [heading,...rest]=arabic[i].trim().split("\n");text(heading,m,y,12,true,design===2?ink:red);y-=24;y=paragraph(rest.join("\n"),m,y,w-2*m,design===2?11:10.4);y-=17;}
    }
    expect(y).toBeGreaterThan(70);
    newPage(2);text(`0${design}  /  صفحة التوقيعات`,m,735,10,true,gray,w-2*m-85);title("التوقيع والختم","SIGNATURES & STAMP");
    y=paragraph("هذه الصفحة توضّح أماكن بيانات الطرفين والتوقيع والختم فقط. تُرفع الصور المعتمدة من الإدارة لاحقًا، ولا تتضمن هذه المعاينة أي توقيع أو ختم حقيقي.",m,640,w-2*m,11,true,gray);
    const gap=20,cw=(w-2*m-gap)/2;
    function signCard(x:number,top:number,width:number,first:boolean){
      const height=design===2?180:260;box(x,top-height,width,height,[.99,.99,.995],true);if(design!==2)box(x,top-5,width,5,first?red:navy);
      text(first?"الطرف الأول - المنصة":"الطرف الثاني - المحامي",x+16,top-31,12,true,ink,width-32);
      if(design===3)text(first?"FIRST PARTY / PLATFORM":"SECOND PARTY / PROVIDER",x+16,top-51,8,false,gray,width-32);
      const start=top-(design===3?80:64);text(first?"اسم المفوّض: يُحدد من الإدارة":"الاسم: محمد أحمد عبدالله",x+16,start,10,true,gray,width-32);
      text(first?"الصفة: يُحدد من الإدارة":"رقم الرخصة: 12345",x+16,start-24,10,true,gray,width-32);
      const sigY=design===2?top-140:top-164;rule(sigY,[.7,.72,.75],x+20,width-40);text("مكان التوقيع",x+20,sigY-18,9,true,gray,width-40);
      if(first&&design!==2){page.drawEllipse({x:x+width/2,y:top-220,xScale:35,yScale:25,borderColor:rgb(.7,.72,.75),borderWidth:.7});text("مكان الختم",x+width/2-30,top-224,8,true,gray,60);}
      if(first&&design===2)text("الختم: يرفع من الإدارة",x+18,top-171,9,true,gray,width-36);
    }
    if(design===2){signCard(m,540,w-2*m,true);signCard(m,335,w-2*m,false);}else{signCard(m+cw+gap,540,cw,true);signCard(m,540,cw,false);text("الاسم والصفة والتوقيع والختم تحفظ مع نسخة الاتفاقية",m,242,10,true,gray);}
    doc.setTitle(["","رسمي عصري","كلاسيكي رسمي","ثنائي اللغة متقابل"][design]);doc.setSubject("Design proposal only - not a signed agreement");const pdf=await doc.save();expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);await writeFile(`output/pdf/designs/contract-design-${design}.pdf`,pdf);
  }
},30000);
