/** Complete UTF-8 ZIP export without CDNs or saved user data. */
(function(P){
  'use strict';
  const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c;}
  function crc32(data){let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function zip(files){
    const encoder=new TextEncoder(),parts=[],central=[];let offset=0,size=0,count=0;
    for(const [name,text] of Object.entries(files)){
      if(name.includes('..')||name.startsWith('/')||typeof text!=='string')continue;
      const nameBytes=encoder.encode(name),data=encoder.encode(text),crc=crc32(data);
      const local=new Uint8Array(30+nameBytes.length),lv=new DataView(local.buffer);
      lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(12,33,true);
      lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,nameBytes.length,true);local.set(nameBytes,30);
      const header=new Uint8Array(46+nameBytes.length),cv=new DataView(header.buffer);
      cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(14,33,true);
      cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,nameBytes.length,true);cv.setUint32(42,offset,true);header.set(nameBytes,46);
      parts.push(local,data);central.push(header);offset+=local.length+data.length;size+=header.length;count++;
    }
    const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
    return new Blob([...parts,...central,end],{type:'application/zip'});
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  async function copy(text){try{await navigator.clipboard.writeText(text);return true;}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';(document.querySelector('dialog[open]')||document.body).append(area);area.select();let ok=false;try{ok=document.execCommand('copy');}catch{}area.remove();return ok;}}
  function sourceZip(){const files={...P.SOURCE_FILES};
    // Directory mode gets its source manifest regenerated as part of the exported tree.
    files['source-bundle.js']='globalThis.PIGGY=globalThis.PIGGY||{};globalThis.PIGGY.SOURCE_FILES='+JSON.stringify(P.SOURCE_FILES).replace(/</g,'\\u003c')+';\n';
    download(zip(files),'Piggy_Quest_Source_v'+P.VERSION+'.zip');P.UI?.toast('전체 소스 ZIP을 준비했어요. 저장 데이터는 포함하지 않았습니다.');
  }
  P.Export={zip,crc32,download,copy,sourceZip};
})(globalThis.PIGGY = globalThis.PIGGY || {});
