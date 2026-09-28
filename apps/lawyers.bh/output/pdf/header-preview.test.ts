// Design preview only: production renderer and original assets are untouched.
import {readFile,writeFile} from "node:fs/promises";
import {PDFDocument,rgb} from "pdf-lib";
import {expect,it} from "vitest";
it("previews Arabic, English and signature-page full headers",async()=>{
 const source=await PDFDocument.load(await readFile("output/pdf/provider-agreement-modern-preview.pdf"));
 const doc=await PDFDocument.create();
 const logo=await doc.embedPng(await readFile("public/images/logo-full-ar.png"));
 const pages=await doc.copyPages(source,[0,4,source.getPageCount()-1]);
 for(const page of pages){
  doc.addPage(page);const {width:w,height:h}=page.getSize();
  page.drawRectangle({x:44,y:h-102,width:w-88,height:92,color:rgb(1,1,1)});
  const width=330,height=width*logo.height/logo.width;
  page.drawImage(logo,{x:(w-width)/2,y:h-95,width,height});
 }
 doc.setTitle("معاينة هيدر الاتفاقية - عربي وإنجليزي");
 doc.setSubject("Header design sample only - not signed. Selected pages from full agreement.");
 await writeFile("output/pdf/provider-agreement-centered-header-preview.pdf",await doc.save());
 expect(doc.getPageCount()).toBe(3);
});
